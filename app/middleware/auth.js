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
  // If API/AJAX request (JSON expected), send JSON error
  if (req.path.startsWith('/api/') || 
      req.path.startsWith('/run') || 
      req.path.startsWith('/auth/') ||
      req.headers.accept?.includes('application/json')) {
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
 * 
 * Note: This uses session data (no DB query) for performance.
 * Username is stored in session during login (auth.js line 120).
 */
function attachUser(req, res, next) {
  if (req.session && req.session.userId && req.session.username) {
    // Use session data - no database query needed!
    req.user = {
      id: req.session.userId,
      username: req.session.username
    };
  }
  next();
}

module.exports = {
  requireAuth,
  attachUser
};

