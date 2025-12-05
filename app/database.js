const { Pool } = require("pg");

// Use connection string from Vercel Supabase integration
// Prefer NON_POOLING for serverless (better connection handling)
// Fallback to regular POSTGRES_URL or DATABASE_URL
const connectionString = process.env.POSTGRES_URL_NON_POOLING || 
                        process.env.POSTGRES_URL || 
                        process.env.DATABASE_URL;

// Log which connection string is being used (for debugging)
if (process.env.VERCEL === '1') {
  const usingNonPooling = !!process.env.POSTGRES_URL_NON_POOLING;
  const usingPooler = !!process.env.POSTGRES_URL && !process.env.POSTGRES_URL_NON_POOLING;
  console.log(`📦 Database connection: ${usingNonPooling ? 'NON_POOLING (recommended)' : usingPooler ? 'POOLER' : 'CUSTOM'}`);
}

// Always use SSL with rejectUnauthorized: false for Supabase (self-signed certificates)
// The SSL config object will override any SSL parameters in the connection string
const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  },
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('❌ Unexpected database pool error:', err);
  // Don't exit - the pool will try to recover
});

module.exports = pool;