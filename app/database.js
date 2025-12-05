const { Pool } = require("pg");

// Check if running in serverless environment (Vercel)
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Use environment variables from .env
const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT,
  // Connection pool settings - optimized for serverless
  max: isServerless ? 2 : 20, // Lower max connections for serverless (each function instance is separate)
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection not established
});

// Test database connection (non-blocking for serverless)
if (!isServerless) {
  // Only test connection in non-serverless environments
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
      process.exit(1); // Exit with error code (only in non-serverless)
    });
} else {
  // In serverless, log that we're ready (connection will be established on first use)
  console.log("📦 Serverless environment detected - database connections will be established on demand");
}

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('❌ Unexpected database error:', err);
  // Don't exit - the pool will try to recover
});

module.exports = pool;