const express = require('express');
const router = express.Router();
const supabase = require('../database');
const { requireAuth } = require('../middleware/auth');
const { codeExecutionLimiter } = require('../middleware/rateLimiter');
const {
  isTodaysDaily,
  updateStreak,
  getUserToday
} = require('../utils/dailyChallengeService');

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
    const { data: existingCompletion, error: completionError } = await supabase
      .from('user_completions')
      .select('id')
      .eq('user_id', user_id)
      .eq('challenge_id', challenge_id)
      .eq('difficulty', difficulty)
      .limit(1);

    if (completionError) throw completionError;

    const isFirstCompletion = (!existingCompletion || existingCompletion.length === 0) && status === 'passed';
    const basePoints = isFirstCompletion ? pointsMap[difficulty] : 0;

    // Check if this is today's daily challenge
    const today = getUserToday('UTC'); // Using UTC for now
    const isDailyChallenge = await isTodaysDaily(challenge_id, today);
    
    // Award bonus points only if:
    // 1. It's today's daily challenge
    // 2. User is passing this submission
    // 3. User hasn't already received bonus for this challenge today (any difficulty)
    let bonusPoints = 0;
    if (isDailyChallenge && status === 'passed') {
      // Check if user already got daily bonus for this challenge today (any difficulty)
      const { data: existingDailyCompletion, error: dailyError } = await supabase
        .from('submissions')
        .select('id')
        .eq('user_id', user_id)
        .eq('challenge_id', challenge_id)
        .eq('completed_on_daily_date', today)
        .gt('bonus_points', 0)
        .limit(1);
      
      if (dailyError) throw dailyError;
      
      // Only award bonus if they haven't received it for this challenge today
      // This ensures bonus is only given ONCE per challenge per day, regardless of difficulty
      if (!existingDailyCompletion || existingDailyCompletion.length === 0) {
        bonusPoints = 50;
      }
    }
    
    const points_earned = basePoints + bonusPoints;

    // Save submission to database
    const { data: submissionData, error: submissionError } = await supabase
      .from('submissions')
      .insert({
        user_id,
        challenge_id,
        difficulty,
        source_code,
        language_id,
        status,
        tests_passed,
        tests_total,
        execution_time_ms: result.time ? Math.round(parseFloat(result.time) * 1000) : null,
        memory_used_kb: result.memory ? parseInt(result.memory) : null,
        points_earned,
        bonus_points: bonusPoints,
        completed_on_daily_date: (isDailyChallenge && bonusPoints > 0) ? today : null,
        error_message: result.compile_output || result.stderr || null,
        submitted_at: new Date().toISOString()
      })
      .select('id, submitted_at')
      .single();

    if (submissionError) throw submissionError;

    // Update streak if completed daily challenge and earned bonus
    // Only update streak once per day (when bonus is awarded)
    let streakInfo = null;
    if (isDailyChallenge && bonusPoints > 0) {
      try {
        streakInfo = await updateStreak(user_id, today);
        console.log(`🔥 Streak updated: ${streakInfo.streak} days (${streakInfo.streakAction})`);
      } catch (streakError) {
        console.error('Error updating streak:', streakError);
        // Don't fail the submission if streak update fails
      }
    }

    // Update user statistics if first completion
    if (isFirstCompletion) {
      try {
        // Record completion
        const { error: completionInsertError } = await supabase
          .from('user_completions')
          .insert({
            user_id,
            challenge_id,
            difficulty,
            points_awarded: points_earned,
            completed_at: new Date().toISOString()
          });

        if (completionInsertError) throw completionInsertError;

        // Get current user stats
        const { data: currentUser, error: userFetchError } = await supabase
          .from('users')
          .select(`${difficulty}_completed, total_points, challenges_completed`)
          .eq('id', user_id)
          .single();

        if (userFetchError) throw userFetchError;

        // Update user stats
        const difficultyColumn = `${difficulty}_completed`;
        const { error: updateError } = await supabase
          .from('users')
          .update({
            total_points: (currentUser.total_points || 0) + points_earned,
            [difficultyColumn]: (currentUser[difficultyColumn] || 0) + 1,
            challenges_completed: (currentUser.challenges_completed || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', user_id);

        if (updateError) throw updateError;

        console.log(`✅ User ${user_id} completed challenge ${challenge_id} (${difficulty}) for the first time! +${points_earned} points`);
      } catch (err) {
        console.error('Error updating user stats:', err);
        // Don't fail the submission if stats update fails
      }
    }

    // Get updated user stats
    const { data: userStats, error: statsError } = await supabase
      .from('users')
      .select('total_points, easy_completed, medium_completed, hard_completed, challenges_completed, day_streak')
      .eq('id', user_id)
      .single();

    // Return detailed results
    return res.json({
      success: true,
      submission: {
        id: submissionData.id,
        status: status,
        tests_passed: tests_passed,
        tests_total: tests_total,
        execution_time_ms: result.time ? Math.round(parseFloat(result.time) * 1000) : null,
        memory_used_kb: result.memory ? parseInt(result.memory) : null,
        points_earned: points_earned,
        bonus_points: bonusPoints,
        is_first_completion: isFirstCompletion,
        is_daily_challenge: isDailyChallenge,
        submitted_at: submissionData.submitted_at
      },
      output: {
        stdout: stdout,
        stderr: result.stderr || null,
        compile_output: result.compile_output || null,
        message: result.message || null
      },
      streak: streakInfo,
      user_stats: statsError ? null : userStats
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
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select(`
        id,
        challenge_id,
        difficulty,
        status,
        tests_passed,
        tests_total,
        execution_time_ms,
        memory_used_kb,
        points_earned,
        bonus_points,
        completed_on_daily_date,
        submitted_at,
        language_id
      `)
      .eq('user_id', user_id)
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return res.json({
      success: true,
      submissions: submissions || [],
      count: submissions?.length || 0
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
    const { data: submission, error } = await supabase
      .from('submissions')
      .select(`
        id,
        challenge_id,
        difficulty,
        source_code,
        language_id,
        status,
        tests_passed,
        tests_total,
        execution_time_ms,
        memory_used_kb,
        points_earned,
        bonus_points,
        completed_on_daily_date,
        error_message,
        submitted_at
      `)
      .eq('id', submission_id)
      .eq('user_id', user_id)
      .single();

    if (error) throw error;

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    return res.json({
      success: true,
      submission
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
    // Get all user submissions
    const { data: allSubmissions, error: fetchError } = await supabase
      .from('submissions')
      .select('status, challenge_id, points_earned, execution_time_ms, submitted_at')
      .eq('user_id', user_id);

    if (fetchError) throw fetchError;

    // Calculate stats manually
    const total_submissions = allSubmissions?.length || 0;
    const successful_submissions = allSubmissions?.filter(s => s.status === 'passed').length || 0;
    const unique_challenges_solved = new Set(
      allSubmissions?.filter(s => s.status === 'passed').map(s => s.challenge_id)
    ).size;
    const total_points_earned = allSubmissions?.reduce((sum, s) => sum + (s.points_earned || 0), 0) || 0;
    
    const passedSubmissions = allSubmissions?.filter(s => s.status === 'passed') || [];
    const avg_execution_time = passedSubmissions.length > 0
      ? passedSubmissions.reduce((sum, s) => sum + (s.execution_time_ms || 0), 0) / passedSubmissions.length
      : null;

    const submittedDates = allSubmissions?.map(s => s.submitted_at).filter(Boolean) || [];
    // Math.min/max return timestamps (numbers), so we need to convert back to Date objects
    const first_submission = submittedDates.length > 0 
      ? new Date(Math.min(...submittedDates.map(d => new Date(d).getTime()))) 
      : null;
    const last_submission = submittedDates.length > 0 
      ? new Date(Math.max(...submittedDates.map(d => new Date(d).getTime()))) 
      : null;

    return res.json({
      success: true,
      stats: {
        total_submissions,
        successful_submissions,
        unique_challenges_solved,
        total_points_earned,
        avg_execution_time: avg_execution_time ? Math.round(avg_execution_time) : null,
        first_submission: first_submission ? first_submission.toISOString() : null,
        last_submission: last_submission ? last_submission.toISOString() : null
      }
    });
  } catch (error) {
    console.error('Error fetching submission stats:', error);
    return res.status(500).json({ error: 'Failed to fetch submission stats' });
  }
});

module.exports = router;
