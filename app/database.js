const { Pool } = require("pg");

// Use connection string from Vercel Supabase integration or fallback to DATABASE_URL
let connectionString = process.env.POSTGRES_URL || 
                       process.env.POSTGRES_URL_NON_POOLING || 
                       process.env.DATABASE_URL;

// Remove any existing SSL parameters from connection string to avoid conflicts
// We'll set SSL config explicitly below
if (connectionString) {
  connectionString = connectionString
    .replace(/[?&]sslmode=[^&]*/gi, '')
    .replace(/[?&]ssl=[^&]*/gi, '');
}

// Always use SSL with rejectUnauthorized: false for Supabase (self-signed certificates)
// This is required for Supabase connections
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