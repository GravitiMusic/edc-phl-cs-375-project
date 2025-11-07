const { Pool } = require("pg");

// Use environment variables from .env
const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT
});

pool.connect().then(() => {
  console.log("Connected to database");
});

module.exports = pool