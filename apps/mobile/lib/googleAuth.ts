import { AppState, InteractionManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import {
  applyOAuthCallbackFromUrl,
  createSessionFromOAuthUrl,
  getExpoOAuthCallbackUrl,
  getRedirectToFromAuthorizeUrl,
  isLocalhostAuthUrl,
  isOAuthCallbackUrl,
  patchOAuthAuthorizeUrl,
  persistOAuthRedirectMode,
} from './authOAuth';

WebBrowser.maybeCompleteAuthSession();

const OAUTH_REDIRECT_MODE_KEY = 'google_oauth_redirect_mode';

const SETUP_HINT =
  'Google signed in, but the app did not get the return link.\n\n' +
  'In Supabase → Authentication → URL Configuration → Redirect URLs, add:\n\n' +
  '     cavitour://**\n' +
  '     cavitour://auth/callback\n' +
  '     exp://**\n\n' +
  'Site URL can stay http://localhost:5173\n' +
  'Remove old http://192.168.x.x… rows, Save, reload the app, try again.';

export type GoogleSignInPhase = 'starting' | 'google' | 'finishing' | 'done';

type GoogleSignInOptions = {
  onPhase?: (phase: GoogleSignInPhase) => void;
};

function isHttpUrl(url: string | undefined | null): boolean {
  return !!url && /^https?:\/\//i.test(url);
}

function waitForInteractions(): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
}

function isOAuthReturnUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    isOAuthCallbackUrl(url) ||
    /[?&#]code=/i.test(url) ||
    /access_token=/i.test(url) ||
    /^cavitour:/i.test(url)
  );
}

async function ensureSessionFromCallback(callbackUrl: string): Promise<void> {
  // Must return via app deep link — never a LAN/web page on the phone.
  if (isLocalhostAuthUrl(callbackUrl) || isHttpUrl(callbackUrl)) {
    throw new Error(SETUP_HINT);
  }

  if (__DEV__) {
    console.info('[authOAuth] finishing with callback', callbackUrl.split('?')[0]);
  }

  const ok = await applyOAuthCallbackFromUrl(supabase, callbackUrl);
  if (!ok) {
    try {
      await createSessionFromOAuthUrl(callbackUrl);
    } catch (err) {
      if (__DEV__) console.warn('[authOAuth] createSessionFromOAuthUrl:', err);
    }
  }

  for (let i = 0; i < 40; i++) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await persistOAuthRedirectMode('expo');
      await AsyncStorage.setItem('isAuthenticated', 'true');
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  throw new Error('Google sign-in finished, but no session was created. Try again.');
}

async function runGoogleOAuthExpoOnly(options?: GoogleSignInOptions): Promise<void> {
  const onPhase = options?.onPhase;
  await AsyncStorage.setItem(OAUTH_REDIRECT_MODE_KEY, 'expo');

  const redirectTo = getExpoOAuthCallbackUrl();

  if (__DEV__) {
    console.info('[authOAuth] mobile Google redirectTo=', redirectTo, 'os=', Platform.OS);
  }

  if (isHttpUrl(redirectTo) || isLocalhostAuthUrl(redirectTo)) {
    throw new Error(SETUP_HINT);
  }

  onPhase?.('starting');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error('Unable to start Google sign in.');

  const authorizeUrl = patchOAuthAuthorizeUrl(data.url, redirectTo);
  const redirectInUrl = getRedirectToFromAuthorizeUrl(authorizeUrl);

  if (__DEV__) {
    console.info('[authOAuth] authorize redirect_to=', redirectInUrl);
  }

  if (isLocalhostAuthUrl(redirectInUrl) || isHttpUrl(redirectInUrl)) {
    throw new Error(SETUP_HINT);
  }

  if (Platform.OS === 'web') {
    window.location.assign(authorizeUrl);
    return;
  }

  let linkCallback: string | null = null;
  const linkSub = Linking.addEventListener('url', ({ url }) => {
    if (isOAuthReturnUrl(url)) {
      linkCallback = url;
      // Unstick iOS if the auth sheet does not auto-dismiss on cavitour://
      void WebBrowser.dismissAuthSession();
    }
  });

  const appStateSub = AppState.addEventListener('change', (state) => {
    if (state === 'active' && !linkCallback) {
      void Linking.getInitialURL().then((url) => {
        if (isOAuthReturnUrl(url)) {
          linkCallback = url;
          void WebBrowser.dismissAuthSession();
        }
      });
    }
  });

  try {
    onPhase?.('google');
    await waitForInteractions();
    await new Promise((r) => setTimeout(r, Platform.OS === 'ios' ? 350 : 150));

    if (Platform.OS === 'android') {
      await WebBrowser.warmUpAsync().catch(() => undefined);
    }

    // Match prefix: cavitour://… — must match Supabase redirect_to.
    const authSessionOptions =
      Platform.OS === 'android'
        ? { showInRecents: true, createTask: true }
        : { preferEphemeralSession: false, createTask: false };

    const result = await WebBrowser.openAuthSessionAsync(
      authorizeUrl,
      redirectTo,
      authSessionOptions
    );

    onPhase?.('finishing');

    let callbackUrl: string | null =
      result.type === 'success' && result.url ? result.url : linkCallback;

    if (!callbackUrl) {
      await new Promise((r) => setTimeout(r, Platform.OS === 'android' ? 900 : 600));
      callbackUrl = linkCallback;
    }

    if (!callbackUrl) {
      const initial = await Linking.getInitialURL();
      if (isOAuthReturnUrl(initial)) {
        callbackUrl = initial;
      }
    }

    if (callbackUrl) {
      await ensureSessionFromCallback(callbackUrl);
      onPhase?.('done');
      return;
    }

    const { data: existing } = await supabase.auth.getSession();
    if (existing.session) {
      await persistOAuthRedirectMode('expo');
      await AsyncStorage.setItem('isAuthenticated', 'true');
      onPhase?.('done');
      return;
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      // Late deep link after dismiss
      if (linkCallback) {
        await ensureSessionFromCallback(linkCallback);
        onPhase?.('done');
        return;
      }
      throw new Error('Google sign in was cancelled.');
    }

    throw new Error(SETUP_HINT);
  } finally {
    linkSub.remove();
    appStateSub.remove();
    if (Platform.OS === 'android') {
      await WebBrowser.coolDownAsync().catch(() => undefined);
    }
  }
}

export async function signInWithGoogleMobile(options?: GoogleSignInOptions): Promise<void> {
  try {
    await runGoogleOAuthExpoOnly(options);
  } catch (err) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await persistOAuthRedirectMode('expo');
      await AsyncStorage.setItem('isAuthenticated', 'true');
      options?.onPhase?.('done');
      return;
    }
    throw err;
  }
}
