/**
 * Rate Limiting Middleware
 * Protects against brute force and DoS attacks
 */

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * Applies to all requests
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests in counting (optional)
  skipSuccessfulRequests: false,
  // Skip failed requests in counting (optional)
  skipFailedRequests: false,
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force login attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 failed attempts per windowMs
  message: {
    error: 'Too many authentication attempts, please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Only count failed requests
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter for registration
 * Prevents mass account creation
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registration attempts per hour
  message: {
    error: 'Too many accounts created from this IP, please try again after an hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for password changes
 * Prevents password change abuse
 */
const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 password changes per hour
  message: {
    error: 'Too many password change attempts, please try again after an hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for profile updates
 * Prevents profile spam/abuse
 */
const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 profile updates per 15 minutes
  message: {
    error: 'Too many profile updates, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for code execution (Judge0)
 * Prevents API quota abuse
 */
const codeExecutionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 code executions per minute
  message: {
    error: 'Too many code execution requests, please slow down.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  authLimiter,
  registerLimiter,
  passwordChangeLimiter,
  profileUpdateLimiter,
  codeExecutionLimiter
};

