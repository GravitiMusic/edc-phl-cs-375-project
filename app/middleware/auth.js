/**
 * Authentication Middleware
 * Use these to protect routes and check if users are logged in
 */

/**
 * Require authentication - redirect to login if not authenticated
 * Use this for pages that MUST have a logged-in user
 * 
 * Example:
 *   router.get('/protected-page', requireAuth, (req, res) => { ... });
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    // User is authenticated - allow access
    return next();
  }
  
  // User is NOT authenticated
  // If API request, send JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Please log in to access this resource' 
    });
  }
  
  // If page request, redirect to login
  return res.redirect('/pages/login.html');
}

/**
 * Attach user data to request
 * Makes user info available in req.user on every request
 * 
 * Use this in server.js: app.use(attachUser);
 */
async function attachUser(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const db = require('../database');
      const result = await db.query(
        'SELECT id, username FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }
  next();
}

module.exports = {
  requireAuth,
  attachUser
};

