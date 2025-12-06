// Separate PostgreSQL connection for sessions (connect-pg-simple requires pg Pool)
// This is kept separate from Supabase client since sessions need direct PostgreSQL connection
const { Pool } = require("pg");

// Support both connection string (Supabase) and individual env vars
let poolConfig;

if (process.env.DATABASE_URL) {
  // Detect if this is a Supabase connection (contains 'supabase.co')
  const isSupabase = process.env.DATABASE_URL.includes('supabase.co');
  
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: isSupabase 
      ? { rejectUnauthorized: false }
      : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
    max: 5, // Smaller pool for sessions only
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
} else {
  // Use individual environment variables (for local development)
  poolConfig = {
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    database: process.env.DATABASE_NAME,
    password: process.env.DATABASE_PASSWORD,
    port: process.env.DATABASE_PORT,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Session database pool error:', err);
});

module.exports = pool;

