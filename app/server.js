// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require("path");
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const db = require("./database");

const app = express();

const port = 3000;
const hostname = "localhost";

//removed for codemirror
//app.use(express.static("public"));

//testing for Codemirror:
app.use(express.static(path.join(__dirname, "public")));

//Middleware
app.use(express.json());

// Session configuration
app.use(session({
  store: new pgSession({
    pool: db,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'strict'
  }
}));

// Middleware to attach user info to every request
const { attachUser } = require('./middleware/auth');
app.use(attachUser);

// Routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Root redirect - send to home if authenticated, login otherwise
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    res.redirect('/pages/home.html');
  } else {
    res.redirect('/pages/login.html');
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
