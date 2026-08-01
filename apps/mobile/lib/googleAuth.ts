import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import {
  buildOAuthRedirectUrl,
  createSessionFromOAuthUrl,
  getDevOAuthBridgeBaseUrl,
  getExpoOAuthCallbackUrl,
  getRedirectToFromAuthorizeUrl,
  isLocalhostAuthUrl,
  OAuthLocalhostRedirectError,
  OAuthRedirectMode,
  patchOAuthAuthorizeUrl,
  persistOAuthRedirectMode,
  resolveOAuthRedirectModes,
} from './authOAuth';

WebBrowser.maybeCompleteAuthSession();

function getOAuthSetupHint(mode: OAuthRedirectMode): string {
  const bridgeBase = getDevOAuthBridgeBaseUrl();
  if (mode === 'bridge' && bridgeBase) {
    return (
      `Google sign-in needs the web dev server on your PC.\n\n` +
      `1. In apps/web run: npm run dev\n` +
      `2. Supabase → Redirect URLs: ${bridgeBase}/**\n` +
      `3. Add exp://** and cavitour://** as well`
    );
  }
  return 'Add exp://** and cavitour://** under Supabase → Authentication → Redirect URLs.';
}

async function runGoogleOAuthWithMode(mode: OAuthRedirectMode): Promise<void> {
  const redirectTo = buildOAuthRedirectUrl(mode);
  const expoReturnUrl = getExpoOAuthCallbackUrl();

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

  // Native: wait for exp:// (bridge page forwards here after LAN callback).
  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, expoReturnUrl);

  if (result.type === 'success' && result.url) {
    if (isLocalhostAuthUrl(result.url)) {
      throw new OAuthLocalhostRedirectError();
    }
    await createSessionFromOAuthUrl(result.url);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error('Google sign in did not return a valid session.');
    }
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
        console.info('[authOAuth] Using LAN bridge. Keep apps/web `npm run dev` running.');
      }
      return;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;

      const localhostFailure = err instanceof OAuthLocalhostRedirectError;
      if (localhostFailure && hasFallback && mode === 'bridge') {
        if (__DEV__) {
          console.info('[authOAuth] LAN bridge failed — retrying with exp://…');
        }
        continue;
      }
      if (localhostFailure && hasFallback && mode === 'expo') {
        if (__DEV__) {
          console.info('[authOAuth] exp:// blocked — retrying via LAN bridge…');
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
