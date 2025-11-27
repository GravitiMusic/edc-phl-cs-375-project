const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth } = require('../middleware/auth');
const { codeExecutionLimiter } = require('../middleware/rateLimiter');

/**
 * POST /submissions
 * Submit a solution to a challenge
 * 
 * Body:
 * - challenge_id: ID of the challenge
 * - source_code: User's code
 * - language_id: Judge0 language ID
 * - difficulty: 'easy', 'medium', or 'hard'
 */
router.post('/', requireAuth, codeExecutionLimiter, async (req, res) => {
  const { challenge_id, source_code, language_id, difficulty } = req.body;
  const user_id = req.session.userId;

  // Validation
  if (!challenge_id || !source_code || !language_id || !difficulty) {
    return res.status(400).json({ 
      error: 'Missing required fields: challenge_id, source_code, language_id, difficulty' 
    });
  }

  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    return res.status(400).json({ error: 'Invalid difficulty. Must be easy, medium, or hard' });
  }

  try {
    // Base64 encode the source code
    const encodedSourceCode = Buffer.from(source_code).toString('base64');
    
    // Execute code via Judge0 with base64 encoding
    const response = await fetch(
      `${process.env.JUDGE_API_URL}/submissions?base64_encoded=true&wait=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": process.env.JUDGE_API_KEY,
          "X-RapidAPI-Host": process.env.JUDGE_API_HOST,
        },
        body: JSON.stringify({
          source_code: encodedSourceCode,
          language_id: language_id,
        }),
      }
    );

    const result = await response.json();
    
    // Decode base64 responses
    if (result.stdout) {
      result.stdout = Buffer.from(result.stdout, 'base64').toString('utf-8');
    }
    if (result.stderr) {
      result.stderr = Buffer.from(result.stderr, 'base64').toString('utf-8');
    }
    if (result.compile_output) {
      result.compile_output = Buffer.from(result.compile_output, 'base64').toString('utf-8');
    }

    // Parse test results from stdout
    const stdout = (result.stdout || "").trim();
    const lines = stdout.split("\n");
    const summary = lines[lines.length - 1] || "No output";
    
    // Extract tests passed/total (e.g., "3/3 tests passed")
    const testMatch = summary.match(/(\d+)\/(\d+)/);
    const tests_passed = testMatch ? parseInt(testMatch[1]) : 0;
    const tests_total = testMatch ? parseInt(testMatch[2]) : 0;
    
    // Determine status
    let status;
    if (result.status?.id === 3) { // Accepted
      status = tests_passed === tests_total ? 'passed' : 'failed';
    } else if (result.status?.id === 5) { // Time Limit Exceeded
      status = 'timeout';
    } else {
      status = 'error';
    }

    // Points based on difficulty
    const pointsMap = {
      easy: 25,
      medium: 50,
      hard: 75
    };

    // Check if user already completed this challenge at this difficulty
    const existingCompletion = await db.query(
      'SELECT id FROM user_completions WHERE user_id = $1 AND challenge_id = $2 AND difficulty = $3 LIMIT 1',
      [user_id, challenge_id, difficulty]
    );

    const isFirstCompletion = existingCompletion.rows.length === 0 && status === 'passed';
    const points_earned = isFirstCompletion ? pointsMap[difficulty] : 0;

    // Save submission to database
    const submissionResult = await db.query(
      `INSERT INTO submissions 
        (user_id, challenge_id, difficulty, source_code, language_id, status, tests_passed, tests_total, 
         execution_time_ms, memory_used_kb, points_earned, error_message, submitted_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING id, submitted_at`,
      [
        user_id,
        challenge_id,
        difficulty,
        source_code,
        language_id,
        status,
        tests_passed,
        tests_total,
        result.time ? Math.round(parseFloat(result.time) * 1000) : null, // Convert to ms
        result.memory ? parseInt(result.memory) : null,
        points_earned,
        result.compile_output || result.stderr || null
      ]
    );

    // Update user statistics if first completion
    if (isFirstCompletion) {
      // Begin transaction for consistency
      await db.query('BEGIN');
      
      try {
        // Record completion
        await db.query(
          `INSERT INTO user_completions (user_id, challenge_id, difficulty, points_awarded, completed_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [user_id, challenge_id, difficulty, points_earned]
        );

        // Update user stats with difficulty-specific tracking
        const difficultyColumn = `${difficulty}_completed`;
        await db.query(
          `UPDATE users 
           SET total_points = total_points + $1,
               ${difficultyColumn} = ${difficultyColumn} + 1,
               challenges_completed = challenges_completed + 1,
               updated_at = NOW()
           WHERE id = $2`,
          [points_earned, user_id]
        );

        await db.query('COMMIT');
        console.log(`✅ User ${user_id} completed challenge ${challenge_id} (${difficulty}) for the first time! +${points_earned} points`);
      } catch (err) {
        await db.query('ROLLBACK');
        throw err;
      }
    }

    // Get updated user stats
    const userStats = await db.query(
      'SELECT total_points, easy_completed, medium_completed, hard_completed, challenges_completed, day_streak FROM users WHERE id = $1',
      [user_id]
    );

    // Return detailed results
    return res.json({
      success: true,
      submission: {
        id: submissionResult.rows[0].id,
        status: status,
        tests_passed: tests_passed,
        tests_total: tests_total,
        execution_time_ms: result.time ? Math.round(parseFloat(result.time) * 1000) : null,
        memory_used_kb: result.memory ? parseInt(result.memory) : null,
        points_earned: points_earned,
        is_first_completion: isFirstCompletion,
        submitted_at: submissionResult.rows[0].submitted_at
      },
      output: {
        stdout: stdout,
        stderr: result.stderr || null,
        compile_output: result.compile_output || null,
        message: result.message || null
      },
      user_stats: userStats.rows[0]
    });

  } catch (error) {
    console.error('Submission error:', error);
    return res.status(500).json({ 
      error: 'Failed to process submission',
      details: error.message 
    });
  }
});

/**
 * GET /submissions/history
 * Get user's submission history
 */
router.get('/history', requireAuth, async (req, res) => {
  const user_id = req.session.userId;
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const result = await db.query(
      `SELECT 
        s.id,
        s.challenge_id,
        s.difficulty,
        s.status,
        s.tests_passed,
        s.tests_total,
        s.execution_time_ms,
        s.memory_used_kb,
        s.points_earned,
        s.submitted_at,
        s.language_id
      FROM submissions s
      WHERE s.user_id = $1
      ORDER BY s.submitted_at DESC
      LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    return res.json({
      success: true,
      submissions: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching submission history:', error);
    return res.status(500).json({ error: 'Failed to fetch submission history' });
  }
});

/**
 * GET /submissions/:id
 * Get details of a specific submission
 */
router.get('/:id', requireAuth, async (req, res) => {
  const submission_id = req.params.id;
  const user_id = req.session.userId;

  try {
    const result = await db.query(
      `SELECT 
        s.id,
        s.challenge_id,
        s.difficulty,
        s.source_code,
        s.language_id,
        s.status,
        s.tests_passed,
        s.tests_total,
        s.execution_time_ms,
        s.memory_used_kb,
        s.points_earned,
        s.error_message,
        s.submitted_at
      FROM submissions s
      WHERE s.id = $1 AND s.user_id = $2`,
      [submission_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    return res.json({
      success: true,
      submission: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching submission:', error);
    return res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

/**
 * GET /submissions/stats/summary
 * Get user's submission statistics summary
 */
router.get('/stats/summary', requireAuth, async (req, res) => {
  const user_id = req.session.userId;

  try {
    const result = await db.query(
      `SELECT 
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE status = 'passed') as successful_submissions,
        COUNT(DISTINCT challenge_id) FILTER (WHERE status = 'passed') as unique_challenges_solved,
        SUM(points_earned) as total_points_earned,
        AVG(execution_time_ms) FILTER (WHERE status = 'passed') as avg_execution_time,
        MIN(submitted_at) as first_submission,
        MAX(submitted_at) as last_submission
      FROM submissions
      WHERE user_id = $1`,
      [user_id]
    );

    return res.json({
      success: true,
      stats: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching submission stats:', error);
    return res.status(500).json({ error: 'Failed to fetch submission stats' });
  }
});

module.exports = router;

