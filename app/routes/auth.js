const express = require('express');
const router = express.Router();
const argon2 = require("argon2");
const db = require('../database');

// No more tokenStorage or makeToken needed!
// Sessions handle everything for us

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  
  // Basic validation
  if (!username || !password) {
    console.log("Missing username or password");
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    // Get user from database (including id this time!)
    const result = await db.query(
      "SELECT id, username, password FROM users WHERE username = $1",
      [username]
    );

    // Check if user exists
    if (result.rows.length === 0) {
      console.log("Username doesn't exist:", username);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    
    // Verify password (removed logging for security!)
    const verifyResult = await argon2.verify(user.password, password);

    if (!verifyResult) {
      console.log("Password didn't match for user:", username);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✨ SUCCESS! Create session
    req.session.userId = user.id;
    req.session.username = user.username;
    
    console.log(`✅ User ${username} logged in successfully`);
    
    return res.json({ 
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;