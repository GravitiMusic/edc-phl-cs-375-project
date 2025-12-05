const express = require('express');
const router = express.Router();
const argon2 = require("argon2");
const db = require('../database');
const { 
  authLimiter, 
  registerLimiter, 
  passwordChangeLimiter, 
  profileUpdateLimiter 
} = require('../middleware/rateLimiter');
const { 
  validateRegistration, 
  validateProfileUpdate, 
  validatePassword 
} = require('../middleware/validation');

router.post("/register", registerLimiter, validateRegistration, async (req, res) => {
  // Use sanitized data from validation middleware
  const { username, password, email, name, phone } = req.validatedData;
  
  // Basic validation
  if (!username || !password) {
    console.log("Missing username or password");
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    // Check if username already exists
    const existingUser = await db.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );
    if (existingUser.rows.length > 0) {
      console.log("Registration attempt with existing username");
      return res.status(400).json({ error: "Username already taken" });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await db.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );
      if (existingEmail.rows.length > 0) {
        console.log("Registration attempt with existing email");
        return res.status(400).json({ error: "Email already in use" });
      }
    }
  } catch (error) {
    console.error("Registration validation error:", error);
    return res.status(500).json({ error: "Registration validation failed"});
  }

  let hash;
  try {
    hash = await argon2.hash(password);
  } catch (error) {
    console.error("Password hashing failed:", error);
    return res.status(500).json({ error: "Password hashing failed"});
  }

  try {
    await db.query(
      "INSERT INTO users (username, password, email, name, phone) VALUES ($1, $2, $3, $4, $5)",
      [username, hash, email || null, name || null, phone || null]
    );
    console.log("✅ New user registered successfully");
  } catch (error) {
    console.error("User registration insert failed:", error);
    return res.status(500).json({ error: "Registration failed" });
  }

  return res.json({ 
    success: true,
  });
})

router.post("/login", authLimiter, async (req, res) => {
  const { username, password } = req.body;
  
  // Basic validation
  if (!username || !password) {
    console.log("Login attempt with missing credentials");
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    // Get user from database
    const result = await db.query(
      "SELECT id, username, password FROM users WHERE username = $1",
      [username]
    );

    let isValidLogin = false;
    let user = null;

    if (result.rows.length > 0) {
      user = result.rows[0];
      
      // Verify password
      const verifyResult = await argon2.verify(user.password, password);
      
      if (verifyResult) {
        isValidLogin = true;
      }
    } else {
      // Timing attack protection: Run password verification even if user doesn't exist
      // This ensures similar response time whether user exists or not
      await argon2.hash(password);
    }

    // Use generic error message to prevent username enumeration
    if (!isValidLogin) {
      console.log("Failed login attempt");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✨ SUCCESS! Create session
    req.session.userId = user.id;
    req.session.username = user.username;
    
    console.log(`✅ User ID ${user.id} logged in successfully`);
    
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
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      name: error.name
    });
    return res.status(500).json({ 
      error: "Login failed",
      // Include error details in development for debugging
      ...(process.env.NODE_ENV !== 'production' && { details: error.message })
    });
  }
});

/**
 * GET /auth/me
 * Get current logged-in user info
 */
router.get("/me", (req, res) => {
  try {
    // Check if user has a session
    if (req.session && req.session.userId) {
      console.log('✅ /auth/me - User authenticated:', req.session.userId);
      return res.json({
        authenticated: true,
        user: {
          id: req.session.userId,
          username: req.session.username
        }
      });
    }
    
    // Not logged in
    console.log('⚠️ /auth/me - No session found');
    return res.json({ 
      authenticated: false 
    });
  } catch (error) {
    console.error('❌ /auth/me error:', error);
    return res.status(500).json({
      authenticated: false,
      error: 'Failed to check authentication'
    });
  }
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

/**
 * GET /auth/profile
 * Get full user profile information
 */
router.get("/profile", async (req, res) => {
  // Check if user is authenticated
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      error: "Not authenticated" 
    });
  }

  try {
    const result = await db.query(
      "SELECT id, username, email, name, phone, created_at FROM users WHERE id = $1",
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    
    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        phone: user.phone,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/**
 * PUT /auth/profile
 * Update user profile information
 */
router.put("/profile", profileUpdateLimiter, validateProfileUpdate, async (req, res) => {
  // Check if user is authenticated
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      error: "Not authenticated" 
    });
  }

  // Use sanitized data from validation middleware
  const { username, email, name, phone } = req.validatedData;
  const userId = req.session.userId;

  try {
    // Check if username is being changed and if it's already taken
    if (username && username !== req.session.username) {
      const existingUser = await db.query(
        "SELECT id FROM users WHERE username = $1 AND id != $2",
        [username, userId]
      );
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: "Username already taken" });
      }
    }

    // Check if email is being changed and if it's already taken
    if (email) {
      const existingEmail = await db.query(
        "SELECT id FROM users WHERE email = $1 AND id != $2",
        [email, userId]
      );
      if (existingEmail.rows.length > 0) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    // Update the user profile
    const result = await db.query(
      `UPDATE users 
       SET username = COALESCE($1, username),
           email = COALESCE($2, email),
           name = COALESCE($3, name),
           phone = COALESCE($4, phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, username, email, name, phone`,
      [username || null, email || null, name || null, phone || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = result.rows[0];

    // Update session if username changed
    if (username) {
      req.session.username = username;
    }

    console.log("✅ User profile updated successfully");

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone
      }
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

/**
 * PUT /auth/password
 * Change user password
 */
router.put("/password", passwordChangeLimiter, async (req, res) => {
  // Check if user is authenticated
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      error: "Not authenticated" 
    });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ 
      error: "Current password and new password required" 
    });
  }

  // Validate new password strength
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({ 
      error: "New password does not meet requirements",
      details: passwordValidation.errors
    });
  }

  try {
    // Get current password hash
    const result = await db.query(
      "SELECT password FROM users WHERE id = $1",
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    // Verify current password
    const isValid = await argon2.verify(user.password, currentPassword);
    if (!isValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const newHash = await argon2.hash(newPassword);

    // Update password
    await db.query(
      "UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [newHash, req.session.userId]
    );

    console.log("✅ User password updated successfully");

    return res.json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({ error: "Failed to update password" });
  }
});

module.exports = router;