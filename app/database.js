const { Pool } = require("pg");

// Use connection string from Vercel Supabase integration or fallback to DATABASE_URL
const connectionString = process.env.POSTGRES_URL || 
                        process.env.POSTGRES_URL_NON_POOLING || 
                        process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  // Supabase requires SSL with self-signed certificates in production
  ssl: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' 
    ? { rejectUnauthorized: false } 
    : false,
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('❌ Unexpected database pool error:', err);
  // Don't exit - the pool will try to recover
});

module.exports = pool;