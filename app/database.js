const { Pool } = require("pg");

// Check if running in serverless environment (Vercel)
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Prioritize connection strings for serverless compatibility
// CRITICAL: Use NON_POOLING for serverless to avoid connection pooler limits
// Vercel Supabase integration provides POSTGRES_URL_NON_POOLING, POSTGRES_URL, and DATABASE_URL
const connectionString = process.env.POSTGRES_URL_NON_POOLING || 
                         process.env.POSTGRES_URL || 
                         process.env.DATABASE_URL;

// Support both connection string (Supabase) and individual env vars
let poolConfig;

if (connectionString) {
  // Use connection string (Supabase provides this)
  poolConfig = {
    connectionString: connectionString,
    // Supabase requires SSL
    ssl: {
      rejectUnauthorized: false // Required for Supabase
    },
    // Connection pool settings - optimized for serverless
    max: isServerless ? 1 : 20, // Use only 1 connection in serverless to avoid pooler limits
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased timeout for cloud databases
  };
  
  // Log which connection source is being used (helpful for debugging)
  if (isServerless) {
    const source = process.env.POSTGRES_URL_NON_POOLING ? 'POSTGRES_URL_NON_POOLING' :
                   process.env.POSTGRES_URL ? 'POSTGRES_URL' : 'DATABASE_URL';
    console.log(`📦 Using ${source} for database connection`);
    if (source !== 'POSTGRES_URL_NON_POOLING') {
      console.warn(`⚠️  WARNING: Using ${source} instead of POSTGRES_URL_NON_POOLING.`);
      console.warn('   This may cause connection issues. Set POSTGRES_URL_NON_POOLING in Vercel for better serverless compatibility.');
    }
  }
} else {
  // Use individual environment variables
  poolConfig = {
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    database: process.env.DATABASE_NAME,
    password: process.env.DATABASE_PASSWORD,
    port: process.env.DATABASE_PORT,
    // SSL for cloud databases (Supabase, etc.)
    ssl: process.env.DATABASE_HOST && !process.env.DATABASE_HOST.includes('localhost') ? {
      rejectUnauthorized: false
    } : false,
    // Connection pool settings - optimized for serverless
    max: isServerless ? 1 : 20,
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