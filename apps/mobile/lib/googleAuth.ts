import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const AUTH_CALLBACK_PATH = 'auth/callback';

/**
 * OAuth redirect must match Supabase → Authentication → URL Configuration → Redirect URLs.
 *
 * Always use Expo’s resolved URL (Expo Go → exp://…, dev client / release → cavitour://…).
 * In Supabase add wildcard patterns once so every device/session works without Metro:
 * - cavitour://**
 * - exp://**
 *
 * @see https://supabase.com/docs/guides/auth/redirect-urls
 */
function getOAuthRedirectTo(): string {
  return Linking.createURL(AUTH_CALLBACK_PATH);
}

function pickFirst(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function getHashParams(url: string): Record<string, string> {
  const hash = url.split('#')[1];
  if (!hash) {
    return {};
  }

  const hashParams = new URLSearchParams(hash);
  const result: Record<string, string> = {};
  hashParams.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export async function signInWithGoogleMobile(): Promise<void> {
  const redirectTo = getOAuthRedirectTo();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }
  if (!data?.url) {
    throw new Error('Unable to start Google sign in.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    throw new Error('Google sign in was cancelled.');
  }

  const parsed = Linking.parse(result.url);
  const query = parsed.queryParams ?? {};
  const hash = getHashParams(result.url);

  const authCode = pickFirst(query.code);
  const accessToken = hash.access_token ?? pickFirst(query.access_token);
  const refreshToken = hash.refresh_token ?? pickFirst(query.refresh_token);
  const oauthError = hash.error ?? pickFirst(query.error);
  const oauthErrorDescription = hash.error_description ?? pickFirst(query.error_description);

  if (oauthError) {
    throw new Error(oauthErrorDescription || oauthError);
  }

  if (authCode) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
    if (exchangeError) {
      throw exchangeError;
    }
    return;
  }

  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) {
      throw sessionError;
    }
    return;
  }

  throw new Error('Google sign in did not return a valid session.');
}
