import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Public anon client — never put the service_role key here.
 * Env vars override defaults when set (see `apps/mobile/.env.example`).
 */
const DEFAULT_SUPABASE_URL = 'https://bmsftpvixpvtjrlclnlz.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc2Z0cHZpeHB2dGpybGNsbmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzg1NDEsImV4cCI6MjA4NjYxNDU0MX0.ZEefnXcvDxxwaSEnsBvUxhxZar-V6M1v8F2_-kZRJkc';

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim() || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim() || DEFAULT_SUPABASE_ANON_KEY;

const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const SUPABASE_ENV_MISSING_MESSAGE =
  'Supabase is not configured on this device. Create apps/mobile/.env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart Expo.';

if (__DEV__ && !process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() && !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
  console.warn(
    '[supabase] Using built-in project URL/anon key. Set EXPO_PUBLIC_SUPABASE_* in apps/mobile/.env to override.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

export const isSupabaseConfigured = configured;
