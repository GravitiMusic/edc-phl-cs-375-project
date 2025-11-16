const express = require('express');
const router = express.Router();
const db = require('../database');

// Retrieve a list of active challenges with id, title, difficulty, created_at
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, title, difficulty, created_at FROM challenges WHERE is_active = true ORDER BY created_at DESC"
    );

    return res.json({
      success: true,
      challenges: result.rows
    });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch challenges' });
  }
});

module.exports = router;
