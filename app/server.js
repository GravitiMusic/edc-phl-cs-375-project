// Load environment variables from .env file
require('dotenv').config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const db = require("./database");

const app = express();

const port = process.env.PORT || 3000;
const hostname = process.env.HOSTNAME || "localhost";

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

//Routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

app.listen(port, hostname, () => {
  console.log(`Listening at: http://${hostname}:${port}`);
});

module.exports = app;
