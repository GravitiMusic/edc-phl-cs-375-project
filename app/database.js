// database.js
const { Pool } = require("pg");

const isServerless =
  process.env.VERCEL === "1" || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

let poolConfig;

// Helper: decide if we’re clearly on localhost
const isLocalHost = (host) =>
  !host ||
  host === "localhost" ||
  host === "127.0.0.1" ||
  host === "::1";

if (connectionString) {
  // ✅ Connection string path (Supabase / Vercel Postgres / etc.)
  poolConfig = {
    connectionString,
    // Force SSL for anything deployed
    ssl: isServerless || process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
    max: isServerless ? 1 : 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  if (isServerless) {
    const source = process.env.POSTGRES_URL_NON_POOLING
      ? "POSTGRES_URL_NON_POOLING"
      : process.env.POSTGRES_URL
      ? "POSTGRES_URL"
      : "DATABASE_URL";
    console.log(`📦 Using ${source} for database connection`);
  }
} else {
  // ✅ Individual env var path
  const host = process.env.DATABASE_HOST;
  const local = isLocalHost(host);

  poolConfig = {
    user: process.env.DATABASE_USER,
    host,
    database: process.env.DATABASE_NAME,
    password: process.env.DATABASE_PASSWORD,
    port: process.env.DATABASE_PORT,
    ssl: local
      ? false
      : { rejectUnauthorized: false }, // 🔒 Force SSL for any non-local DB
    max: isServerless ? 1 : 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

const pool = new Pool(poolConfig);

if (!isServerless) {
  pool
    .connect()
    .then((client) => {
      console.log("✅ Connected to database successfully");
      client.release();
    })
    .catch((err) => {
      console.error("❌ Failed to connect to database:", err.message);
      process.exit(1);
    });
} else {
  console.log(
    "📦 Serverless environment detected - database connections will be established on demand"
  );
}

pool.on("error", (err) => {
  console.error("❌ Unexpected database pool error:", {
    message: err.message,
    code: err.code,
    stack: err.stack,
  });
});

module.exports = pool;
