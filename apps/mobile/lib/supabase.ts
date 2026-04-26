import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Public anon client — never put the service_role key here.
 * Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` (see `.env.example`).
 * Expo inlines `EXPO_PUBLIC_*` at bundle time; restart the dev server after changing `.env`.
 */
const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const SUPABASE_ENV_MISSING_MESSAGE =
  'Supabase is not configured on this device. Create apps/mobile/.env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart Expo.';

if (!configured && __DEV__) {
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy `.env.example` to `.env`, add your Supabase URL and anon key from the dashboard, then restart Expo.'
  );
}

/** Placeholder host so createClient does not throw when env is missing (e.g. fresh clone). RPC will fail until .env is set. */
const FALLBACK_URL = 'https://placeholder.supabase.co';
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.invalid';

export const supabase = createClient(
  configured ? SUPABASE_URL : FALLBACK_URL,
  configured ? SUPABASE_ANON_KEY : FALLBACK_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export const isSupabaseConfigured = configured;
