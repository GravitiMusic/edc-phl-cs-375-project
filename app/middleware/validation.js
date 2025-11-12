/**
 * Input Validation Middleware
 * Validates and sanitizes user input to prevent injection attacks
 */

const validator = require('validator');

/**
 * Password strength requirements
 */
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false, // Optional for better UX
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - {valid: boolean, errors: array}
 */
function validatePassword(password) {
  const errors = [];
  
  if (!password || password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }
  
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {object} - {valid: boolean, error: string}
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  const trimmedEmail = email.trim();
  
  if (!validator.isEmail(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  if (trimmedEmail.length > 100) {
    return { valid: false, error: 'Email is too long (max 100 characters)' };
  }
  
  return { valid: true, sanitized: validator.normalizeEmail(trimmedEmail) };
}

/**
 * Validate username
 * @param {string} username - Username to validate
 * @returns {object} - {valid: boolean, error: string}
 */
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  
  const trimmedUsername = username.trim();
  
  if (trimmedUsername.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters long' };
  }
  
  if (trimmedUsername.length > 50) {
    return { valid: false, error: 'Username is too long (max 50 characters)' };
  }
  
  // Allow alphanumeric characters, underscores, and hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  return { valid: true, sanitized: trimmedUsername };
}

/**
 * Validate phone number (optional field)
 * @param {string} phone - Phone number to validate
 * @returns {object} - {valid: boolean, error: string}
 */
function validatePhone(phone) {
  if (!phone) {
    return { valid: true, sanitized: null }; // Optional field
  }
  
  if (typeof phone !== 'string') {
    return { valid: false, error: 'Invalid phone number format' };
  }
  
  const trimmedPhone = phone.trim();
  
  if (trimmedPhone.length > 20) {
    return { valid: false, error: 'Phone number is too long' };
  }
  
  // Allow digits, spaces, hyphens, parentheses, and plus sign
  if (!/^[0-9\s\-()+ ]+$/.test(trimmedPhone)) {
    return { valid: false, error: 'Phone number contains invalid characters' };
  }
  
  return { valid: true, sanitized: trimmedPhone };
}

/**
 * Validate name (optional field)
 * @param {string} name - Name to validate
 * @returns {object} - {valid: boolean, error: string}
 */
function validateName(name) {
  if (!name) {
    return { valid: true, sanitized: null }; // Optional field
  }
  
  if (typeof name !== 'string') {
    return { valid: false, error: 'Invalid name format' };
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length > 100) {
    return { valid: false, error: 'Name is too long (max 100 characters)' };
  }
  
  // Allow letters, spaces, hyphens, apostrophes, and periods
  if (!/^[a-zA-Z\s\-'.]+$/.test(trimmedName)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }
  
  return { valid: true, sanitized: trimmedName };
}

/**
 * Sanitize general text input
 * @param {string} text - Text to sanitize
 * @param {number} maxLength - Maximum length
 * @returns {string} - Sanitized text
 */
function sanitizeText(text, maxLength = 1000) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // Trim and limit length
  let sanitized = text.trim();
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Escape HTML special characters
  return validator.escape(sanitized);
}

/**
 * Middleware to validate registration input
 */
function validateRegistration(req, res, next) {
  const { username, email, password, name, phone } = req.body;
  
  // Validate username
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return res.status(400).json({ error: usernameValidation.error });
  }
  
  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ error: emailValidation.error });
  }
  
  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ 
      error: 'Password does not meet requirements',
      details: passwordValidation.errors
    });
  }
  
  // Validate name (optional)
  const nameValidation = validateName(name);
  if (!nameValidation.valid) {
    return res.status(400).json({ error: nameValidation.error });
  }
  
  // Validate phone (optional)
  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.valid) {
    return res.status(400).json({ error: phoneValidation.error });
  }
  
  // Attach sanitized values to request
  req.validatedData = {
    username: usernameValidation.sanitized,
    email: emailValidation.sanitized,
    password: password, // Don't sanitize password, will be hashed
    name: nameValidation.sanitized,
    phone: phoneValidation.sanitized
  };
  
  next();
}

/**
 * Middleware to validate profile update input
 */
function validateProfileUpdate(req, res, next) {
  const { username, email, name, phone } = req.body;
  const validated = {};
  
  // Validate username if provided
  if (username !== undefined) {
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({ error: usernameValidation.error });
    }
    validated.username = usernameValidation.sanitized;
  }
  
  // Validate email if provided
  if (email !== undefined) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }
    validated.email = emailValidation.sanitized;
  }
  
  // Validate name if provided
  if (name !== undefined) {
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({ error: nameValidation.error });
    }
    validated.name = nameValidation.sanitized;
  }
  
  // Validate phone if provided
  if (phone !== undefined) {
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      return res.status(400).json({ error: phoneValidation.error });
    }
    validated.phone = phoneValidation.sanitized;
  }
  
  req.validatedData = validated;
  next();
}

module.exports = {
  validatePassword,
  validateEmail,
  validateUsername,
  validatePhone,
  validateName,
  sanitizeText,
  validateRegistration,
  validateProfileUpdate,
  PASSWORD_REQUIREMENTS
};

