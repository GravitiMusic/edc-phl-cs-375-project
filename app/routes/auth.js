const express = require('express');
const router = express.Router();
const argon2 = require("argon2");
const db = require('../database');

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

/**
 * GET /auth/me
 * Get current logged-in user info
 */
router.get("/me", (req, res) => {
  // Check if user has a session
  if (req.session && req.session.userId) {
    return res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        username: req.session.username
      }
    });
  }
  
  // Not logged in
  return res.json({ 
    authenticated: false 
  });
});

/**
 * POST /auth/logout
 * Log out the current user
 */
router.post("/logout", (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ 
          success: false, 
          error: "Logout failed" 
        });
      }
      
      res.json({ 
        success: true, 
        message: "Logged out successfully" 
      });
    });
  } else {
    res.json({ 
      success: true, 
      message: "No active session" 
    });
  }
});

module.exports = router;