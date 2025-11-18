const express = require('express');
const router = express.Router();
const db = require('../database');

router.get("/allStats", async (req, res) => {
    console.log("Fetching all stats for leaderboard");
    //TODO: Potentially use lastActive (last time solved a problem) instead of lastLogin
    try {
     const result = await db.query(
      "SELECT username, last_login, rank, total_points, challenges_completed, day_streak FROM users ORDER BY rank ASC"
    );
    res.json(result.rows)
    } catch (error) {
        console.error("Error fetching stats from SQL:", error);
        res.status(500).json({error: "Failed to fetch stats, please try again later."});
    }
})

module.exports = router;