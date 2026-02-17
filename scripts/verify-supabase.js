/**
 * Quick Supabase Verification Script
 * Run this to verify your Supabase setup is correct
 * 
 * Usage: node scripts/verify-supabase.js
 * 
 * Note: This requires your Supabase credentials to be set up correctly
 */

const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials (from lib/supabase.ts)
const SUPABASE_URL = 'https://bmsftpvixpvtjrlclnlz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc2Z0cHZpeHB2dGpybGNsbmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzg1NDEsImV4cCI6MjA4NjYxNDU0MX0.ZEefnXcvDxxwaSEnsBvUxhxZar-V6M1v8F2_-kZRJkc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifySetup() {
  console.log('🔍 Verifying Supabase Setup...\n');

  const checks = {
    tables: false,
    rls: false,
    storage: false,
    auth: false,
  };

  // Check 1: Verify Tables Exist
  console.log('1️⃣ Checking tables...');
  const tables = [
    'user_profiles',
    'saved_lists',
    'places',
    'saved_list_items',
    'route_history',
    'recent_searches',
    'notifications',
    'user_preferences',
  ];

  try {
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(0);
      if (error && error.code !== 'PGRST116') {
        console.log(`   ❌ Table "${table}" has issues: ${error.message}`);
      } else {
        console.log(`   ✅ Table "${table}" exists`);
      }
    }
    checks.tables = true;
  } catch (error) {
    console.log(`   ❌ Error checking tables: ${error.message}`);
  }

  // Check 2: Verify Storage Bucket
  console.log('\n2️⃣ Checking storage bucket...');
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.log(`   ❌ Error checking storage: ${error.message}`);
    } else {
      const avatarsBucket = data.find(bucket => bucket.name === 'avatars');
      if (avatarsBucket) {
        console.log(`   ✅ Storage bucket "avatars" exists`);
        console.log(`   ${avatarsBucket.public ? '✅' : '⚠️'} Bucket is ${avatarsBucket.public ? 'public' : 'private'}`);
        checks.storage = true;
      } else {
        console.log(`   ❌ Storage bucket "avatars" not found`);
        console.log(`   💡 Create it in Supabase Dashboard → Storage → New bucket`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error checking storage: ${error.message}`);
  }

  // Check 3: Test Authentication Connection
  console.log('\n3️⃣ Checking authentication...');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log(`   ⚠️ Auth check: ${error.message}`);
    } else {
      console.log(`   ✅ Authentication service is accessible`);
      checks.auth = true;
    }
  } catch (error) {
    console.log(`   ❌ Error checking auth: ${error.message}`);
  }

  // Summary
  console.log('\n📊 Verification Summary:');
  console.log(`   Tables: ${checks.tables ? '✅' : '❌'}`);
  console.log(`   Storage: ${checks.storage ? '✅' : '❌'}`);
  console.log(`   Auth: ${checks.auth ? '✅' : '❌'}`);

  const allPassed = Object.values(checks).every(check => check === true);
  
  if (allPassed) {
    console.log('\n✅ All checks passed! Your Supabase setup looks good.');
    console.log('🚀 You can now run your app!');
  } else {
    console.log('\n⚠️ Some checks failed. Please review the errors above.');
    console.log('📖 See SUPABASE_VERIFICATION.md for detailed troubleshooting.');
  }

  return allPassed;
}

// Run verification
verifySetup().catch(console.error);
