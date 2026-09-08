import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bmsftpvixpvtjrlclnlz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc2Z0cHZpeHB2dGpybGNsbmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzg1NDEsImV4cCI6MjA4NjYxNDU0MX0.ZEefnXcvDxxwaSEnsBvUxhxZar-V6M1v8F2_-kZRJkc';

const SHARED_CLIENT_KEY = '__cavitourSupabase';

/**
 * One auth client per browser origin. When this app runs embedded at /admin the
 * web app has already created a client on the same storage key; a second GoTrue
 * instance would clobber the stored session and PKCE verifier mid-sign-in.
 */
function getSharedClient(): SupabaseClient {
  const scope = globalThis as typeof globalThis & { [SHARED_CLIENT_KEY]?: SupabaseClient };
  if (!scope[SHARED_CLIENT_KEY]) {
    scope[SHARED_CLIENT_KEY] = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
  }
  return scope[SHARED_CLIENT_KEY] as SupabaseClient;
}

export const supabase = getSharedClient();
