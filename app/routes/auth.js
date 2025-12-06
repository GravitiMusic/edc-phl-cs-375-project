const express = require('express');
const router = express.Router();
const argon2 = require("argon2");
const supabase = require('../database'); // Supabase client
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
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .limit(1);
    
    if (userError) throw userError;
    
    if (existingUser && existingUser.length > 0) {
      console.log("Registration attempt with existing username");
      return res.status(400).json({ error: "Username already taken" });
    }

    // Check if email already exists (if provided)
    if (email) {
      const { data: existingEmail, error: emailError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .limit(1);
      
      if (emailError) throw emailError;
      
      if (existingEmail && existingEmail.length > 0) {
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
    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        password: hash,
        email: email || null,
        name: name || null,
        phone: phone || null
      })
      .select('id')
      .single();

    if (error) throw error;
    
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
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, password')
      .eq('username', username)
      .limit(1);

    if (error) throw error;

    let isValidLogin = false;
    let user = null;

    if (users && users.length > 0) {
      user = users[0];
      
      // Verify password
      const verifyResult = await argon2.verify(user.password, password);
      
      if (verifyResult) {
        isValidLogin = true;
      }
    } else {
      // Timing attack protection: Run password verification even if user doesn't exist
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
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, name, phone, created_at')
      .eq('id', req.session.userId)
      .single();

    if (error) throw error;

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
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
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', userId)
        .limit(1);
      
      if (userError) throw userError;
      
      if (existingUser && existingUser.length > 0) {
        return res.status(400).json({ error: "Username already taken" });
      }
    }

    // Check if email is being changed and if it's already taken
    if (email) {
      const { data: existingEmail, error: emailError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', userId)
        .limit(1);
      
      if (emailError) throw emailError;
      
      if (existingEmail && existingEmail.length > 0) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    // Build update object (only include fields that are provided)
    const updateData = {
      updated_at: new Date().toISOString()
    };
    if (username) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    // Update the user profile
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, username, email, name, phone')
      .single();

    if (updateError) throw updateError;

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

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
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('password')
      .eq('id', req.session.userId)
      .single();

    if (fetchError) throw fetchError;

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isValid = await argon2.verify(userData.password, currentPassword);
    if (!isValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const newHash = await argon2.hash(newPassword);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: newHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.session.userId);

    if (updateError) throw updateError;

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
