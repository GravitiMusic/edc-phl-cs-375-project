const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /stats/me
 * Get current user's statistics
 */
router.get("/me", requireAuth, async (req, res) => {
  const user_id = req.session.userId;

  try {
    const result = await db.query(
      `SELECT 
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
      FROM users 
      WHERE id = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's rank
    const rankResult = await db.query(
      `SELECT rank FROM (
        SELECT 
          id,
          ROW_NUMBER() OVER (ORDER BY total_points DESC, challenges_completed DESC, username ASC) as rank
        FROM users
      ) ranked
      WHERE id = $1`,
      [user_id]
    );

    const userStats = {
      ...result.rows[0],
      rank: rankResult.rows[0]?.rank || 0
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
    //TODO: Potentially use lastActive (last time solved a problem) instead of lastLogin
    try {
     // Calculate rank dynamically based on total_points (primary), challenges_completed (tiebreaker)
     const result = await db.query(`
      SELECT 
        ROW_NUMBER() OVER (
          ORDER BY total_points DESC, challenges_completed DESC, username ASC
        ) as rank,
        username, 
        last_login, 
        total_points,
        easy_completed,
        medium_completed,
        hard_completed,
        challenges_completed, 
        day_streak
      FROM users
      ORDER BY total_points DESC, challenges_completed DESC, username ASC
    `);
    res.json(result.rows)
    } catch (error) {
        console.error("Error fetching stats from SQL:", error);
        res.status(500).json({error: "Failed to fetch stats, please try again later."});
    }
})

module.exports = router;