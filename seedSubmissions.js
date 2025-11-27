    /**
 * Seed Script - Add Sample Submissions
 * Creates realistic submission data for testing the statistics page
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT,
});

async function seedSubmissions() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Seeding sample submissions...\n');

    // Get admin user ID
    const userResult = await client.query(
      'SELECT id, username FROM users WHERE username = $1',
      ['admin']
    );

    if (userResult.rows.length === 0) {
      console.log('❌ Admin user not found. Please run "npm run reset" first.');
      return;
    }

    const userId = userResult.rows[0].id;
    const username = userResult.rows[0].username;
    console.log(`👤 Creating submissions for user: ${username} (ID: ${userId})`);

    // Get challenge ID and difficulty (assuming challenge 1 exists)
    const challengeResult = await client.query('SELECT id, difficulty FROM challenges LIMIT 1');
    if (challengeResult.rows.length === 0) {
      console.log('❌ No challenges found. Please add challenges to the database first.');
      return;
    }
    const challengeId = challengeResult.rows[0].id;
    const challengeDifficulty = challengeResult.rows[0].difficulty;

    // Sample Python code submissions
    const sampleCodes = [
      // Passing submission
      `def solution(a, b):
    return a + b`,
      
      // Another passing submission (retry)
      `def solution(a, b):
    # Simple addition
    return a + b`,
      
      // Failed submission (wrong logic)
      `def solution(a, b):
    return a - b  # Oops, subtraction instead`,
      
      // Error submission (syntax error)
      `def solution(a, b):
    return a + b
  # Missing indentation`,
      
      // Timeout simulation (long loop)
      `def solution(a, b):
    total = 0
    for i in range(1000000000):
        total += 1
    return a + b`,
    ];

    const submissionData = [
      // Recent successful submission (3 hours ago)
      {
        code: sampleCodes[0],
        status: 'passed',
        tests_passed: 3,
        tests_total: 3,
        execution_time: 45,
        memory_used: 8192,
        points: 0,  // Points already awarded via user_completions
        error: null,
        hours_ago: 3
      },
      // Successful submission from yesterday
      {
        code: sampleCodes[1],
        status: 'passed',
        tests_passed: 3,
        tests_total: 3,
        execution_time: 42,
        memory_used: 8156,
        points: 0,
        error: null,
        hours_ago: 24
      },
      // Failed submission from 2 days ago
      {
        code: sampleCodes[2],
        status: 'failed',
        tests_passed: 0,
        tests_total: 3,
        execution_time: 38,
        memory_used: 8100,
        points: 0,
        error: null,
        hours_ago: 48
      },
      // Error submission from 3 days ago
      {
        code: sampleCodes[3],
        status: 'error',
        tests_passed: 0,
        tests_total: 3,
        execution_time: null,
        memory_used: null,
        points: 0,
        error: 'IndentationError: unexpected indent',
        hours_ago: 72
      },
      // Older passing submission (5 days ago)
      {
        code: sampleCodes[0],
        status: 'passed',
        tests_passed: 3,
        tests_total: 3,
        execution_time: 50,
        memory_used: 8200,
        points: 0,
        error: null,
        hours_ago: 120
      },
      // Another failed attempt (6 days ago)
      {
        code: sampleCodes[2],
        status: 'failed',
        tests_passed: 1,
        tests_total: 3,
        execution_time: 44,
        memory_used: 8180,
        points: 0,
        error: null,
        hours_ago: 144
      },
      // Timeout from a week ago
      {
        code: sampleCodes[4],
        status: 'timeout',
        tests_passed: 0,
        tests_total: 3,
        execution_time: null,
        memory_used: null,
        points: 0,
        error: 'Time Limit Exceeded',
        hours_ago: 168
      },
      // First ever submission (10 days ago) - successful!
      {
        code: sampleCodes[0],
        status: 'passed',
        tests_passed: 3,
        tests_total: 3,
        execution_time: 55,
        memory_used: 8250,
        points: 0,
        error: null,
        hours_ago: 240
      },
    ];

    console.log(`\n📊 Creating ${submissionData.length} sample submissions...\n`);

    // Insert submissions
    for (let i = 0; i < submissionData.length; i++) {
      const sub = submissionData[i];
      const submittedAt = new Date(Date.now() - sub.hours_ago * 60 * 60 * 1000);

      await client.query(
        `INSERT INTO submissions 
          (user_id, challenge_id, source_code, language_id, status, tests_passed, tests_total,
           execution_time_ms, memory_used_kb, points_earned, error_message, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          userId,
          challengeId,
          sub.code,
          71, // Python
          sub.status,
          sub.tests_passed,
          sub.tests_total,
          sub.execution_time,
          sub.memory_used,
          sub.points,
          sub.error,
          submittedAt
        ]
      );

      console.log(`   ✓ Submission ${i + 1}: ${sub.status.toUpperCase()} (${sub.tests_passed}/${sub.tests_total} tests) - ${sub.hours_ago}h ago`);
    }

    // Add user completion record (first time completing the challenge - award points)
    const completionResult = await client.query(
      'SELECT id FROM user_completions WHERE user_id = $1 AND challenge_id = $2',
      [userId, challengeId]
    );

    if (completionResult.rows.length === 0) {
      // Award points based on difficulty
      const pointsMap = { easy: 25, medium: 50, hard: 75 };
      const pointsAwarded = pointsMap[challengeDifficulty] || 25;
      
      await client.query(
        'INSERT INTO user_completions (user_id, challenge_id, difficulty, points_awarded, completed_at) VALUES ($1, $2, $3, $4, $5)',
        [userId, challengeId, challengeDifficulty, pointsAwarded, new Date(Date.now() - 240 * 60 * 60 * 1000)] // 10 days ago (first successful submission)
      );

      // Update user stats
      await client.query(
        `UPDATE users 
         SET total_points = total_points + $1,
             challenges_completed = challenges_completed + 1,
             last_login = $2
         WHERE id = $3`,
        [pointsAwarded, new Date(Date.now() - 3 * 60 * 60 * 1000), userId] // Last login 3 hours ago
      );

      console.log(`\n   💰 Awarded ${pointsAwarded} points for challenge completion!`);
      console.log(`   📈 Updated user stats: +1 challenge completed`);
    } else {
      console.log(`\n   ℹ️  User already has completion record for this challenge`);
    }

    // Display final stats
    const statsResult = await client.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'passed') as passed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'error') as errors,
        COUNT(*) FILTER (WHERE status = 'timeout') as timeouts,
        AVG(execution_time_ms) FILTER (WHERE status = 'passed') as avg_time
      FROM submissions WHERE user_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0];
    console.log('\n' + '='.repeat(60));
    console.log('📈 SUBMISSION STATISTICS');
    console.log('='.repeat(60));
    console.log(`   Total Submissions: ${stats.total}`);
    console.log(`   ✓ Passed: ${stats.passed}`);
    console.log(`   ✗ Failed: ${stats.failed}`);
    console.log(`   ⚠ Errors: ${stats.errors}`);
    console.log(`   ⏱ Timeouts: ${stats.timeouts}`);
    console.log(`   ⚡ Avg Execution Time: ${Math.round(stats.avg_time)}ms`);
    console.log(`   📊 Success Rate: ${Math.round((stats.passed / stats.total) * 100)}%`);
    console.log('='.repeat(60));

    console.log('\n✅ Sample submissions seeded successfully!');
    console.log('🔗 Visit http://localhost:3000/pages/statistics.html to view your stats\n');

  } catch (error) {
    console.error('❌ Error seeding submissions:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed function
seedSubmissions()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

