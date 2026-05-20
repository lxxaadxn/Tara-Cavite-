import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import {
  buildOAuthRedirectUrl,
  createSessionFromOAuthUrl,
  getDevOAuthBridgeBaseUrl,
  getRedirectToFromAuthorizeUrl,
  isLocalhostAuthUrl,
  OAuthLocalhostRedirectError,
  OAuthRedirectMode,
  patchOAuthAuthorizeUrl,
  persistOAuthRedirectMode,
  resolveOAuthRedirectModes,
} from './authOAuth';

WebBrowser.maybeCompleteAuthSession();

const SUPABASE_PROJECT_REF = 'bmsftpvixpvtjrlclnlz';

export function getSupabaseAuthConfigUrl(): string {
  return `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/auth/url-configuration`;
}

function getOAuthSetupHint(mode: OAuthRedirectMode): string {
  const bridgeBase = getDevOAuthBridgeBaseUrl();
  if (mode === 'bridge' && bridgeBase) {
    return (
      `Google sign-in needs the web dev server.\n\n` +
      `1. Run: npm run web\n` +
      `2. In Supabase Redirect URLs add: ${bridgeBase}/**\n` +
      `3. Set Site URL to ${bridgeBase} (not localhost)`
    );
  }
  return 'Add exp://** and cavitour://** under Supabase → Authentication → Redirect URLs.';
}

async function runGoogleOAuthWithMode(mode: OAuthRedirectMode): Promise<void> {
  const redirectTo = buildOAuthRedirectUrl(mode);

  if (__DEV__) {
    console.info(`[authOAuth] mode=${mode} redirectTo=`, redirectTo.split('?')[0]);
  }

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

  const authorizeUrl = patchOAuthAuthorizeUrl(data.url, redirectTo);
  const redirectInUrl = getRedirectToFromAuthorizeUrl(authorizeUrl);

  if (isLocalhostAuthUrl(redirectInUrl)) {
    throw new OAuthLocalhostRedirectError();
  }

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      throw new Error('Google sign in is not available in this environment.');
    }
    window.location.assign(authorizeUrl);
    return;
  }

  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, redirectTo);

  if (result.type === 'success' && result.url) {
    if (isLocalhostAuthUrl(result.url)) {
      throw new OAuthLocalhostRedirectError();
    }
    await createSessionFromOAuthUrl(result.url);
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) {
    return;
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Google sign in was cancelled.');
  }

  throw new Error('Google sign in did not return a valid session.');
}

export async function signInWithGoogleMobile(): Promise<void> {
  const modes = await resolveOAuthRedirectModes();
  let lastError: Error | null = null;

  for (let i = 0; i < modes.length; i++) {
    const mode = modes[i];
    const hasFallback = i < modes.length - 1;

    try {
      await runGoogleOAuthWithMode(mode);
      await persistOAuthRedirectMode(mode);
      if (__DEV__ && mode === 'bridge') {
        console.info('[authOAuth] Using LAN bridge (saved for next sign-in). Keep npm run web running.');
      }
      return;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;

      const localhostFailure = err instanceof OAuthLocalhostRedirectError;
      if (localhostFailure && hasFallback && mode === 'expo') {
        if (__DEV__) {
          console.info('[authOAuth] exp:// blocked by Supabase — retrying via LAN bridge…');
        }
        continue;
      }

      if (localhostFailure) {
        lastError = new Error(getOAuthSetupHint(mode));
      }
      break;
    }
  }

  throw lastError ?? new Error('Google sign in failed.');
}
