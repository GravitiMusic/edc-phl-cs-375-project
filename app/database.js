const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const isServerless = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

// Load Supabase CA cert
let sslConfig;
const caCertPath = path.join(__dirname, "certs", "supabase-ca.crt");

try {
  if (fs.existsSync(caCertPath)) {
    const ca = fs.readFileSync(caCertPath).toString();
    sslConfig = {
      ca,                   // ← TRUST Supabase's certificate
      rejectUnauthorized: true,  // ← perform full verification
    };
    console.log("✅ Using Supabase SSL certificate for secure connection");
  } else {
    // Fallback: Use SSL without certificate verification (for development or if cert not yet placed)
    console.warn(`⚠️  SSL certificate not found at ${caCertPath}`);
    console.warn("   Using rejectUnauthorized: false (less secure)");
    console.warn("   Place your Supabase certificate at app/certs/supabase-ca.crt for full SSL verification");
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

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  max: isServerless ? 1 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

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
