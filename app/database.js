const { Pool } = require("pg");

// Use environment variables from .env
const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection not established
});

// Test database connection
pool.connect()
  .then((client) => {
    console.log("✅ Connected to database successfully");
    console.log(`   Database: ${process.env.DATABASE_NAME}`);
    console.log(`   Host: ${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}`);
    client.release(); // Release the test client back to the pool
  })
  .catch((err) => {
    console.error("❌ Failed to connect to database:");
    console.error(`   Error: ${err.message}`);
    console.error("\n🔧 Troubleshooting steps:");
    console.error("   1. Make sure PostgreSQL is running");
    console.error("   2. Check your .env file has correct DATABASE_* settings");
    console.error("   3. Verify the database exists: psql -U postgres -c '\\l'");
    console.error("   4. Run 'npm run reset' to create the database\n");
    process.exit(1); // Exit with error code
  });

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('❌ Unexpected database error:', err);
  // Don't exit - the pool will try to recover
});

module.exports = pool;