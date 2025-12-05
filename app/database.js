// database.js
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const isServerless =
  process.env.VERCEL === "1" || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

/**
 * Load SSL certificate for database connection
 * Supports:
 * 1. File path from DATABASE_SSL_CERT env var
 * 2. Default certificate files in app/certs/ directory
 * 3. Certificate content from DATABASE_SSL_CERT_CONTENT env var (for Vercel)
 */
function getSSLOptions() {
  // If explicitly disabled
  if (process.env.DATABASE_SSL === "false") {
    return false;
  }

  // For localhost, no SSL needed
  const host = process.env.DATABASE_HOST;
  const isLocal = !host || 
                  host === "localhost" || 
                  host === "127.0.0.1" || 
                  host === "::1";
  
  if (isLocal && !isServerless && process.env.NODE_ENV !== "production") {
    return false;
  }

  // Option 1: Certificate content from environment variable (for Vercel/serverless)
  if (process.env.DATABASE_SSL_CERT_CONTENT) {
    try {
      const certContent = Buffer.from(
        process.env.DATABASE_SSL_CERT_CONTENT,
        process.env.DATABASE_SSL_CERT_ENCODING === "base64" ? "base64" : "utf8"
      ).toString();
      return {
        ca: certContent,
        rejectUnauthorized: true, // Verify certificate when we have it
      };
    } catch (err) {
      console.warn("⚠️  Failed to parse DATABASE_SSL_CERT_CONTENT, falling back to rejectUnauthorized: false");
    }
  }

  // Option 2: Certificate file path from environment variable
  if (process.env.DATABASE_SSL_CERT) {
    try {
      const certPath = path.resolve(process.env.DATABASE_SSL_CERT);
      if (fs.existsSync(certPath)) {
        const certContent = fs.readFileSync(certPath, "utf8");
        return {
          ca: certContent,
          rejectUnauthorized: true, // Verify certificate when we have it
        };
      } else {
        console.warn(`⚠️  SSL certificate file not found: ${certPath}`);
      }
    } catch (err) {
      console.warn(`⚠️  Failed to read SSL certificate from ${process.env.DATABASE_SSL_CERT}:`, err.message);
    }
  }

  // Option 3: Try default certificate files in app/certs/
  if (!isServerless) {
    const certsDir = path.join(__dirname, "certs");
    const defaultCertNames = ["supabase.crt", "supabase.pem", "ca.crt", "ca.pem"];
    
    for (const certName of defaultCertNames) {
      const certPath = path.join(certsDir, certName);
      if (fs.existsSync(certPath)) {
        try {
          const certContent = fs.readFileSync(certPath, "utf8");
          console.log(`✅ Using SSL certificate: ${certPath}`);
          return {
            ca: certContent,
            rejectUnauthorized: true, // Verify certificate when we have it
          };
        } catch (err) {
          console.warn(`⚠️  Failed to read certificate ${certPath}:`, err.message);
        }
      }
    }
  }

  // Fallback: Use SSL without certificate verification (less secure)
  // This is the default behavior for Supabase when no certificate is provided
  return {
    rejectUnauthorized: false,
  };
}

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
  const sslOptions = getSSLOptions();
  poolConfig = {
    connectionString,
    // Use SSL certificate if available, otherwise fallback to rejectUnauthorized: false
    ssl: sslOptions,
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

  const sslOptions = local ? false : getSSLOptions();
  poolConfig = {
    user: process.env.DATABASE_USER,
    host,
    database: process.env.DATABASE_NAME,
    password: process.env.DATABASE_PASSWORD,
    port: process.env.DATABASE_PORT,
    ssl: sslOptions, // 🔒 Use certificate if available, otherwise fallback
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
