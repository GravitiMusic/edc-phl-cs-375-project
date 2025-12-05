const { Pool } = require("pg");

// Check if running in serverless environment (Vercel)
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Support multiple environment variable naming conventions:
// 1. Vercel Supabase integration (POSTGRES_URL, POSTGRES_*)
// 2. Custom DATABASE_URL
// 3. Individual DATABASE_* variables
// 4. Individual POSTGRES_* variables (Vercel Supabase integration)

let poolConfig;

// Priority 1: Use connection string if available (Vercel Supabase integration or custom)
const connectionString = process.env.POSTGRES_URL || 
                        process.env.POSTGRES_URL_NON_POOLING || 
                        process.env.POSTGRES_PRISMA_URL ||
                        process.env.DATABASE_URL;

if (connectionString) {
  // Use connection string (Supabase provides this)
  poolConfig = {
    connectionString: connectionString,
    // Supabase requires SSL with self-signed certificates
    // Always set rejectUnauthorized: false for Supabase connections
    ssl: {
      rejectUnauthorized: false // Required for Supabase (self-signed certs)
    },
    // Connection pool settings - optimized for serverless
    max: isServerless ? 2 : 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased timeout for cloud databases
  };
} else {
  // Use individual environment variables (support both naming conventions)
  poolConfig = {
    user: process.env.POSTGRES_USER || process.env.DATABASE_USER,
    host: process.env.POSTGRES_HOST || process.env.DATABASE_HOST,
    database: process.env.POSTGRES_DATABASE || process.env.DATABASE_NAME,
    password: process.env.POSTGRES_PASSWORD || process.env.DATABASE_PASSWORD,
    port: process.env.POSTGRES_PORT || process.env.DATABASE_PORT || 5432,
    // SSL for cloud databases (Supabase, etc.)
    ssl: (process.env.POSTGRES_HOST || process.env.DATABASE_HOST) && 
         !(process.env.POSTGRES_HOST || process.env.DATABASE_HOST || '').includes('localhost') ? {
      rejectUnauthorized: false
    } : false,
    // Connection pool settings - optimized for serverless
    max: isServerless ? 2 : 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased timeout for cloud databases
  };
}

const pool = new Pool(poolConfig);

// Test database connection (non-blocking for serverless)
if (!isServerless) {
  // Only test connection in non-serverless environments
  pool.connect()
    .then((client) => {
      console.log("✅ Connected to database successfully");
      const dbName = process.env.POSTGRES_DATABASE || process.env.DATABASE_NAME;
      const dbHost = process.env.POSTGRES_HOST || process.env.DATABASE_HOST;
      const dbPort = process.env.POSTGRES_PORT || process.env.DATABASE_PORT;
      console.log(`   Database: ${dbName}`);
      console.log(`   Host: ${dbHost}:${dbPort}`);
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
  console.error('❌ Unexpected database pool error:', err);
  console.error('Error details:', {
    message: err.message,
    code: err.code,
    stack: err.stack
  });
  // Don't exit - the pool will try to recover
});

// Add connection error handler with better logging
pool.on('connect', (client) => {
  console.log('✅ Database client connected');
});

pool.on('acquire', (client) => {
  console.log('📦 Database client acquired from pool');
});

pool.on('remove', (client) => {
  console.log('🗑️ Database client removed from pool');
});

module.exports = pool;