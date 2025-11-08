/**
 * Seed Script
 * Creates a default admin account for development/testing
 * Safe to run multiple times - won't duplicate if admin already exists
 */

require('dotenv').config();
const argon2 = require('argon2');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: process.env.DATABASE_USER || 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  database: process.env.DATABASE_NAME || 'oneup',
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT || 5432,
});

// Admin account credentials (CHANGE THESE FOR PRODUCTION!)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  email: 'admin@oneup.dev',
  password: 'admin',  // Simple password for development
};

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Check if admin already exists
    const checkAdmin = await pool.query(
      'SELECT id, username FROM users WHERE username = $1 OR email = $2',
      [ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.email]
    );

    if (checkAdmin.rows.length > 0) {
      console.log('✅ Admin account already exists:');
      console.log(`   Username: ${checkAdmin.rows[0].username}`);
      console.log(`   ID: ${checkAdmin.rows[0].id}`);
    } else {
      // Hash the password
      console.log('🔐 Hashing admin password...');
      const hashedPassword = await argon2.hash(ADMIN_CREDENTIALS.password);

      // Create admin account
      console.log('👤 Creating admin account...');
      const result = await pool.query(
        'INSERT INTO users (username, email, password, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, username, email',
        [ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.email, hashedPassword]
      );

      console.log('✅ Admin account created successfully!');
      console.log(`   ID: ${result.rows[0].id}`);
      console.log(`   Username: ${result.rows[0].username}`);
      console.log(`   Email: ${result.rows[0].email}`);
    }

    console.log('\n📋 Login credentials for testing:');
    console.log('   ================================');
    console.log(`   Username: ${ADMIN_CREDENTIALS.username}`);
    console.log(`   Password: ${ADMIN_CREDENTIALS.password}`);
    console.log('   ================================');
    console.log('\n✨ Seed completed successfully!\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the seed function
seedDatabase();

