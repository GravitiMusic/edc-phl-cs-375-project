const express = require('express');
const router = express.Router();
const supabase = require('../database');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /stats/me
 * Get current user's statistics
 */
router.get("/me", requireAuth, async (req, res) => {
  const user_id = req.session.userId;

  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        username,
        total_points,
        easy_completed,
        medium_completed,
        hard_completed,
        challenges_completed,
        day_streak,
        created_at,
        last_login
      `)
      .eq('id', user_id)
      .single();

    if (userError) throw userError;

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's rank using RPC or manual calculation
    // Note: Supabase doesn't support window functions directly in client
    // We'll need to calculate rank manually or use a database function
    const { data: allUsers, error: rankError } = await supabase
      .from('users')
      .select('id, total_points, challenges_completed, username')
      .order('total_points', { ascending: false })
      .order('challenges_completed', { ascending: false })
      .order('username', { ascending: true });

    if (rankError) throw rankError;

    // Calculate rank manually
    let rank = 1;
    for (const user of allUsers || []) {
      if (user.id === user_id) break;
      if (user.total_points > userData.total_points || 
          (user.total_points === userData.total_points && 
           user.challenges_completed > userData.challenges_completed) ||
          (user.total_points === userData.total_points && 
           user.challenges_completed === userData.challenges_completed &&
           user.username < userData.username)) {
        rank++;
      }
    }

    const userStats = {
      ...userData,
      rank
    };

    return res.json({
      success: true,
      stats: userStats
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

router.get("/allStats", async (req, res) => {
  console.log("Fetching all stats for leaderboard");
  try {
    // Get all users ordered by points, challenges, username
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        username, 
        last_login, 
        total_points,
        easy_completed,
        medium_completed,
        hard_completed,
        challenges_completed, 
        day_streak
      `)
      .order('total_points', { ascending: false })
      .order('challenges_completed', { ascending: false })
      .order('username', { ascending: true });

    if (error) throw error;

    // Add rank to each user
    const usersWithRank = (users || []).map((user, index) => ({
      rank: index + 1,
      ...user
    }));

    res.json(usersWithRank);
  } catch (error) {
    console.error("Error fetching stats from Supabase:", error);
    res.status(500).json({ error: "Failed to fetch stats, please try again later." });
  }
});

module.exports = router;
