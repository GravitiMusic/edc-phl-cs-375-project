// Supabase client setup
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://zoaosfjclyjahltdwcuz.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ ERROR: SUPABASE_KEY or SUPABASE_ANON_KEY environment variable is not set!');
  console.error('   Get your Supabase anon key from: Project Settings → API → anon/public key');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Supabase client initialized');
console.log(`   URL: ${supabaseUrl}`);

// Export the client
module.exports = supabase;
