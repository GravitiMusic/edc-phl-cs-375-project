const { Pool } = require("pg");

// Detect serverless environment
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Use connection string from Vercel Supabase integration
// CRITICAL: Use NON_POOLING for serverless to avoid connection pooler limits
// The pooler has strict limits in Session mode (max clients = pool_size)
const connectionString = process.env.POSTGRES_URL_NON_POOLING || 
                        process.env.POSTGRES_URL || 
                        process.env.DATABASE_URL;

// Parse connection string to use individual parameters with explicit SSL config
// This ensures SSL settings are properly applied
let poolConfig;

if (connectionString) {
  try {
    // Parse PostgreSQL connection string
    // Handle both postgres:// and postgresql:// formats
    const url = new URL(connectionString.replace(/^postgresql?:\/\//, 'https://'));
    
    poolConfig = {
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1) || 'postgres', // Remove leading slash
      // Explicitly set SSL - this is required for Supabase
      ssl: {
        rejectUnauthorized: false // Required for Supabase self-signed certificates
      },
      // CRITICAL: Limit pool size for serverless to avoid "max clients reached" errors
      // Supabase free tier has limited connections, and serverless functions should use minimal connections
      max: isServerless ? 1 : 10, // Use only 1 connection in serverless, 10 in regular server
      idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
      connectionTimeoutMillis: 10000, // Timeout after 10 seconds if connection can't be established
    };
    
    if (isServerless) {
      console.log(`📦 Serverless mode: Using ${poolConfig.max} max connection(s) to ${url.hostname}:${poolConfig.port}`);
      if (!process.env.POSTGRES_URL_NON_POOLING) {
        console.warn('⚠️  WARNING: POSTGRES_URL_NON_POOLING not set. Using pooler URL may cause connection limit issues.');
      }
    }
  } catch (parseError) {
    // Fallback: use connection string directly
    console.warn('⚠️ Could not parse connection string, using as-is');
    poolConfig = {
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      max: isServerless ? 1 : 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
  }
} else {
  // Fallback to individual environment variables
  poolConfig = {
    user: process.env.POSTGRES_USER || process.env.DATABASE_USER,
    host: process.env.POSTGRES_HOST || process.env.DATABASE_HOST,
    database: process.env.POSTGRES_DATABASE || process.env.DATABASE_NAME,
    password: process.env.POSTGRES_PASSWORD || process.env.DATABASE_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT || process.env.DATABASE_PORT || '5432'),
    ssl: {
      rejectUnauthorized: false
    },
    max: isServerless ? 1 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('❌ Unexpected database pool error:', err);
  // Don't exit - the pool will try to recover
});

module.exports = pool;