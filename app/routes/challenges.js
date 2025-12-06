const express = require('express');
const router = express.Router();
const supabase = require('../database');

// Retrieve a list of active challenges with completion status for each difficulty
router.get('/', async (req, res) => {
  try {
    const userId = req.session?.userId;
    
    // Get all active challenges
    const { data: challenges, error: challengesError } = await supabase
      .from('challenges')
      .select('id, title, description, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (challengesError) throw challengesError;

    // If user is logged in, get their completion status for each difficulty
    let completions = [];
    if (userId) {
      const { data: userCompletions, error: completionsError } = await supabase
        .from('user_completions')
        .select('challenge_id, difficulty')
        .eq('user_id', userId);

      if (completionsError) throw completionsError;
      completions = userCompletions || [];
    }

    // Add completion status to each challenge
    const challengesWithStatus = (challenges || []).map(challenge => {
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
    const { data: challengeData, error: challengeError } = await supabase
      .from('challenges')
      .select(`
        id, title, description,
        easy_instructions, easy_starter_code, easy_hint,
        medium_instructions, medium_starter_code, medium_hint,
        hard_instructions, hard_starter_code, hard_hint,
        test_cases, time_limit_ms, memory_limit_mb
      `)
      .eq('id', challengeId)
      .eq('is_active', true)
      .single();

    if (challengeError) throw challengeError;

    if (!challengeData) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Get user's completion status if logged in
    let completions = { easy: false, medium: false, hard: false };
    if (userId) {
      const { data: userCompletions, error: completionsError } = await supabase
        .from('user_completions')
        .select('difficulty')
        .eq('user_id', userId)
        .eq('challenge_id', challengeId);

      if (!completionsError && userCompletions) {
        userCompletions.forEach(row => {
          completions[row.difficulty] = true;
        });
      }
    }

    return res.json({
      success: true,
      challenge: {
        ...challengeData,
        completions
      }
    });
  } catch (error) {
    console.error('Error fetching challenge:', error);
    return res.status(500).json({ error: 'Failed to fetch challenge' });
  }
});

module.exports = router;
