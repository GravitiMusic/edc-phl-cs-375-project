// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require("path");
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const db = require("./database");

const app = express();

const port = 3000;
const hostname = "localhost";

// Static files
app.use(express.static(path.join(__dirname, "public")));

//Middleware
app.use(express.json());
app.use(cookieParser());

// Security Headers - Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://esm.sh", "'unsafe-inline'"], // Allow CodeMirror CDN
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// Rate limiting - protect against brute force attacks
const { generalLimiter, codeExecutionLimiter } = require('./middleware/rateLimiter');
app.use('/auth', generalLimiter);

// Session configuration
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  store: new pgSession({
    pool: db,
    tableName: 'session',
    pruneSessionInterval: 60 * 15 // Clean up expired sessions every 15 minutes
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sessionId', // Change default name from 'connect.sid' for security through obscurity
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: isProduction, // Use secure cookies in production (HTTPS only)
    sameSite: 'strict'
  },
  proxy: isProduction // Trust first proxy in production (nginx, etc.)
}));

// Middleware to attach user info to every request
const { attachUser, requireAuth } = require('./middleware/auth');
app.use(attachUser);

// Route to get CSRF token (returns dummy token for frontend compatibility)
// Note: CSRF protection is provided by SameSite=strict cookies
app.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: 'not-needed-samesite-cookie-protection' });
});

// Routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Challenges API
const challengesRoutes = require('./routes/challenges');
app.use('/challenges', challengesRoutes);

// Stats API
const statsRoutes = require('./routes/stats');
app.use('/stats', statsRoutes);

// Submissions API
const submissionsRoutes = require('./routes/submissions');
app.use('/submissions', submissionsRoutes);

// Root redirect - send to home if authenticated, login otherwise
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    res.redirect('/pages/home.html');
  } else {
    res.redirect('/pages/login.html');
  }
});

// Protect authenticated pages - require login
app.get('/pages/index.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'index.html'));
});

app.get('/pages/home.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'home.html'));
});

app.get('/pages/account-settings.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'account-settings.html'));
});

app.get('/pages/statistics.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'statistics.html'));
});

app.get('/pages/history.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'history.html'));
});

app.get('/pages/problem.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'problem.html'));
});

// Legacy route for old problem pages (if any)
app.get('/pages/problems/:name', requireAuth, (req, res) => {
  const filePath = path.join(__dirname, 'public', 'pages', 'problems', req.params.name, req.params.name + '.html');
  res.sendFile(filePath);
});

//for judge0 - requires authentication
app.post("/run", requireAuth, codeExecutionLimiter, async (req, res) => {
  const { source_code, language_id } = req.body;

  try {
    // Base64 encode the source code
    const encodedSourceCode = Buffer.from(source_code).toString('base64');
    
    const response = await fetch(
      `${process.env.JUDGE_API_URL}/submissions?base64_encoded=true&wait=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": process.env.JUDGE_API_KEY,
          "X-RapidAPI-Host": process.env.JUDGE_API_HOST,
        },
        body: JSON.stringify({ 
          source_code: encodedSourceCode, 
          language_id 
        }),
      }
    );

    const result = await response.json();
    
    // Decode base64 responses
    if (result.stdout) result.stdout = Buffer.from(result.stdout, 'base64').toString('utf-8');
    if (result.stderr) result.stderr = Buffer.from(result.stderr, 'base64').toString('utf-8');
    if (result.compile_output) result.compile_output = Buffer.from(result.compile_output, 'base64').toString('utf-8');
    
    res.json(result);
  } catch (err) {
    console.error("Judge0 error:", err);
    res.status(500).json({ error: "Error calling Judge0" });
  }
});

// Challenge execution endpoint - runs user code against test cases
app.post("/challenge/run", requireAuth, codeExecutionLimiter, async (req, res) => {
  const { source_code, challengeId } = req.body;

  try {
      // Base64 encode the source code
      const encodedSourceCode = Buffer.from(source_code).toString('base64');
      
      const response = await fetch(
      `${process.env.JUDGE_API_URL}/submissions?base64_encoded=true&wait=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": process.env.JUDGE_API_KEY,
          "X-RapidAPI-Host": process.env.JUDGE_API_HOST,
        },
        body: JSON.stringify({
          source_code: encodedSourceCode,
          language_id: 71, // Python
        }),
      }
    );

    const result = await response.json();
    
    // Decode base64 responses
    if (result.stdout) result.stdout = Buffer.from(result.stdout, 'base64').toString('utf-8');
    if (result.stderr) result.stderr = Buffer.from(result.stderr, 'base64').toString('utf-8');
    if (result.compile_output) result.compile_output = Buffer.from(result.compile_output, 'base64').toString('utf-8');

    const stdout = (result.stdout || "").trim();
    const lines = stdout.split("\n");
    const summary = lines[lines.length - 1] || "No output";

    res.json({
      summary,       // e.g. "3/3 tests passed"
      raw_stdout: stdout, // optional, for debugging
    });
  } catch (err) {
    console.error("Challenge run error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});




// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, hostname, () => {
  console.log(`Listening at: http://${hostname}:${port}`);
});

module.exports = app;
