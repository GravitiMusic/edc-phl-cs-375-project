const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const isServerless = process.env.VERCEL === "1" || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// Pick the best URL env var (Supabase + Vercel integration)
const rawUrl =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

if (!rawUrl) {
  console.error("❌ No database URL found in POSTGRES_URL_NON_POOLING / POSTGRES_URL / DATABASE_URL");
}

// ---------- SSL CONFIG ----------
let sslConfig;
const caCertPath = path.join(__dirname, "certs", "supabase-ca.crt");

try {
  if (fs.existsSync(caCertPath)) {
    const ca = fs.readFileSync(caCertPath, "utf8");
    sslConfig = {
      ca,
      rejectUnauthorized: true, // full verification with Supabase CA
    };
    console.log("✅ Using Supabase SSL certificate for secure connection");
  } else {
    console.warn(`⚠️  SSL certificate not found at ${caCertPath}`);
    console.warn("   Falling back to rejectUnauthorized: false (less secure)");
    sslConfig = {
      rejectUnauthorized: false,
    };
  }
} catch (error) {
  console.error("❌ Error loading SSL certificate:", error.message);
  console.warn("   Falling back to rejectUnauthorized: false");
  sslConfig = {
    rejectUnauthorized: false,
  };
}

// ---------- PARSE URL INTO PARTS ----------
let poolConfig = {
  max: isServerless ? 1 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: sslConfig,
};

if (rawUrl) {
  try {
    const url = new URL(rawUrl);

    poolConfig = {
      ...poolConfig,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 5432,
      database: url.pathname.slice(1), // strip leading '/'
    };

    console.log("📦 Database config (sanitized):", {
      host: poolConfig.host,
      port: poolConfig.port,
      database: poolConfig.database,
      serverless: isServerless,
    });
  } catch (e) {
    console.error("❌ Failed to parse database URL:", e.message);
  }
}

const pool = new Pool(poolConfig);

// Test database connection (non-blocking for serverless)
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
