/**
 * Daily Challenge Routes
 * API endpoints for daily challenge feature
 */

const express = require('express');
const router = express.Router();
const {
  getDailyChallenge,
  getUserToday,
  getUserChallengeCompletions
} = require('../utils/dailyChallengeService');

/**
 * GET /api/daily-challenge
 * Get today's daily challenge
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Must be logged in to view daily challenge' 
      });
    }

    // Get user's timezone (default to UTC if not set)
    // In the future, fetch this from user preferences
    const userTimezone = 'UTC'; // TODO: Get from user settings
    const today = getUserToday(userTimezone);

    // Get or create today's daily challenge
    const result = await getDailyChallenge(today);

    if (!result.success || !result.dailyChallenge) {
      return res.status(500).json({
        success: false,
        error: 'No daily challenge available today'
      });
    }

    const dailyChallenge = result.dailyChallenge;
    const challenge = dailyChallenge.challenges;

    // Check if user has completed this challenge at any difficulty
    const completions = await getUserChallengeCompletions(userId, challenge.id);

    // Format response
    const response = {
      success: true,
      daily: {
        id: dailyChallenge.id,
        date: dailyChallenge.date,
        cycle: dailyChallenge.pool_cycle,
        isNew: result.isNew
      },
      challenge: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        difficulties: {
          easy: {
            instructions: challenge.easy_instructions,
            starterCode: challenge.easy_starter_code,
            hint: challenge.easy_hint,
            completed: completions.easy
          },
          medium: {
            instructions: challenge.medium_instructions,
            starterCode: challenge.medium_starter_code,
            hint: challenge.medium_hint,
            completed: completions.medium
          },
          hard: {
            instructions: challenge.hard_instructions,
            starterCode: challenge.hard_starter_code,
            hint: challenge.hard_hint,
            completed: completions.hard
          }
        },
        testCases: challenge.test_cases
      },
      bonus: {
        available: !completions.easy && !completions.medium && !completions.hard,
        points: 50,
        message: completions.easy || completions.medium || completions.hard
          ? 'You already completed this challenge'
          : 'Complete today to earn +50 bonus points!'
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching daily challenge:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch daily challenge',
      details: error.message
    });
  }
});

/**
 * GET /api/daily-challenge/history
 * Get user's daily challenge completion history
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Must be logged in' 
      });
    }

    const supabase = require('../database');

    // Get user's daily challenge submissions
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select(`
        id,
        challenge_id,
        difficulty,
        status,
        points_earned,
        bonus_points,
        completed_on_daily_date,
        submitted_at,
        challenges (
          id,
          title
        )
      `)
      .eq('user_id', userId)
      .not('completed_on_daily_date', 'is', null)
      .order('completed_on_daily_date', { ascending: false })
      .limit(30);

    if (error) throw error;

    return res.json({
      success: true,
      history: submissions || []
    });
  } catch (error) {
    console.error('Error fetching daily challenge history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch history'
    });
  }
});

/**
 * GET /api/daily-challenge/stats
 * Get daily challenge statistics for user
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Must be logged in' 
      });
    }

    const supabase = require('../database');

    // Get user's streak data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('day_streak, longest_streak, last_daily_challenge_date')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Count total daily challenges completed
    const { count: totalCompleted, error: countError } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('completed_on_daily_date', 'is', null)
      .eq('status', 'passed');

    if (countError) throw countError;

    // Get total bonus points earned
    const { data: bonusData, error: bonusError } = await supabase
      .from('submissions')
      .select('bonus_points')
      .eq('user_id', userId)
      .not('completed_on_daily_date', 'is', null);

    if (bonusError) throw bonusError;

    const totalBonusPoints = (bonusData || []).reduce(
      (sum, sub) => sum + (sub.bonus_points || 0),
      0
    );

    return res.json({
      success: true,
      stats: {
        currentStreak: userData.day_streak || 0,
        longestStreak: userData.longest_streak || 0,
        lastCompletedDate: userData.last_daily_challenge_date,
        totalDailyChallengesCompleted: totalCompleted || 0,
        totalBonusPointsEarned: totalBonusPoints
      }
    });
  } catch (error) {
    console.error('Error fetching daily challenge stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

module.exports = router;

