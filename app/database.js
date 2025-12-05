const { Pool } = require("pg");

// Use connection string from Vercel Supabase integration
// Prefer NON_POOLING for serverless (better connection handling)
// Fallback to regular POSTGRES_URL or DATABASE_URL
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
    };
    
    if (process.env.VERCEL === '1') {
      console.log(`📦 Using parsed connection: ${url.hostname}:${poolConfig.port}`);
    }
  } catch (parseError) {
    // Fallback: use connection string directly
    console.warn('⚠️ Could not parse connection string, using as-is');
    poolConfig = {
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false
      },
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
  };
}

const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('❌ Unexpected database pool error:', err);
  // Don't exit - the pool will try to recover
});

module.exports = pool;