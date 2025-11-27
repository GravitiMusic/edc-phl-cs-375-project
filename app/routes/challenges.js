const express = require('express');
const router = express.Router();
const db = require('../database');

// Retrieve a list of active challenges with completion status for each difficulty
router.get('/', async (req, res) => {
  try {
    const userId = req.session?.userId;
    
    // Get all active challenges
    const challengesResult = await db.query(
      "SELECT id, title, description, created_at FROM challenges WHERE is_active = true ORDER BY created_at ASC"
    );

    // If user is logged in, get their completion status for each difficulty
    let completions = [];
    if (userId) {
      const completionsResult = await db.query(
        "SELECT challenge_id, difficulty FROM user_completions WHERE user_id = $1",
        [userId]
      );
      completions = completionsResult.rows;
    }

    // Add completion status to each challenge
    const challengesWithStatus = challengesResult.rows.map(challenge => {
      const easyCompleted = completions.some(c => c.challenge_id === challenge.id && c.difficulty === 'easy');
      const mediumCompleted = completions.some(c => c.challenge_id === challenge.id && c.difficulty === 'medium');
      const hardCompleted = completions.some(c => c.challenge_id === challenge.id && c.difficulty === 'hard');
      
      return {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        created_at: challenge.created_at,
        completions: {
          easy: easyCompleted,
          medium: mediumCompleted,
          hard: hardCompleted
        }
      };
    });

    return res.json({
      success: true,
      challenges: challengesWithStatus
    });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// Get a specific challenge with all difficulty versions
router.get('/:id', async (req, res) => {
  try {
    const challengeId = parseInt(req.params.id);
    const userId = req.session?.userId;

    // Get challenge details
    const challengeResult = await db.query(
      `SELECT 
        id, title, description,
        easy_instructions, easy_starter_code, easy_hint,
        medium_instructions, medium_starter_code, medium_hint,
        hard_instructions, hard_starter_code, hard_hint,
        test_cases, time_limit_ms, memory_limit_mb
      FROM challenges 
      WHERE id = $1 AND is_active = true`,
      [challengeId]
    );

    if (challengeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const challenge = challengeResult.rows[0];

    // Get user's completion status if logged in
    let completions = { easy: false, medium: false, hard: false };
    if (userId) {
      const completionsResult = await db.query(
        "SELECT difficulty FROM user_completions WHERE user_id = $1 AND challenge_id = $2",
        [userId, challengeId]
      );
      completionsResult.rows.forEach(row => {
        completions[row.difficulty] = true;
      });
    }

    return res.json({
      success: true,
      challenge: {
        ...challenge,
        completions
      }
    });
  } catch (error) {
    console.error('Error fetching challenge:', error);
    return res.status(500).json({ error: 'Failed to fetch challenge' });
  }
});

module.exports = router;
