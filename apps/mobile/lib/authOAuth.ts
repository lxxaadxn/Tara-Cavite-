import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { parseAuthParams } from './authUrlParams';

const AUTH_CALLBACK_PATH = 'auth/callback';
const MOBILE_BRIDGE_PATH = 'auth/mobile-callback';
const DEFAULT_WEB_DEV_PORT = '5173';
const OAUTH_REDIRECT_MODE_KEY = 'google_oauth_redirect_mode';

const LAN_IPV4 = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/;

export type OAuthRedirectMode = 'expo' | 'bridge' | 'web';

export function isLocalhostAuthUrl(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url);
}

function getDevMachineLanHost(): string | null {
  const candidates: string[] = [];
  if (Constants.expoConfig?.hostUri) {
    candidates.push(Constants.expoConfig.hostUri);
  }
  if (typeof Constants.linkingUri === 'string' && Constants.linkingUri) {
    candidates.push(Constants.linkingUri);
  }
  try {
    candidates.push(Linking.createURL(AUTH_CALLBACK_PATH));
  } catch {
    // ignore
  }
  for (const raw of candidates) {
    const match = raw.match(LAN_IPV4);
    if (match?.[1] && match[1] !== '127.0.0.1') {
      return match[1];
    }
  }
  return null;
}

export function getDevOAuthBridgeBaseUrl(): string | null {
  const explicit = process.env.EXPO_PUBLIC_OAUTH_BRIDGE_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const host = getDevMachineLanHost();
  if (!host) {
    return null;
  }
  const port = (process.env.EXPO_PUBLIC_WEB_DEV_PORT ?? DEFAULT_WEB_DEV_PORT).trim() || DEFAULT_WEB_DEV_PORT;
  return `http://${host}:${port}`;
}

export function getExpoOAuthCallbackUrl(): string {
  return Linking.createURL(AUTH_CALLBACK_PATH);
}

export function buildOAuthRedirectUrl(mode: OAuthRedirectMode): string {
  if (mode === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/${AUTH_CALLBACK_PATH}`;
    }
    return Linking.createURL(AUTH_CALLBACK_PATH);
  }
  if (mode === 'bridge') {
    const base = getDevOAuthBridgeBaseUrl();
    const expoCallback = getExpoOAuthCallbackUrl();
    if (!base) {
      return expoCallback;
    }
    return `${base}/${MOBILE_BRIDGE_PATH}?expo_redirect=${encodeURIComponent(expoCallback)}`;
  }
  return getExpoOAuthCallbackUrl();
}

async function getSavedOAuthRedirectMode(): Promise<OAuthRedirectMode | null> {
  const raw = await AsyncStorage.getItem(OAUTH_REDIRECT_MODE_KEY);
  if (raw === 'expo' || raw === 'bridge' || raw === 'web') {
    return raw;
  }
  return null;
}

export async function persistOAuthRedirectMode(mode: OAuthRedirectMode): Promise<void> {
  await AsyncStorage.setItem(OAUTH_REDIRECT_MODE_KEY, mode);
}

/** One working strategy per sign-in — no manual env toggles. */
export async function resolveOAuthRedirectModes(): Promise<OAuthRedirectMode[]> {
  if (Platform.OS === 'web') {
    return ['web'];
  }

  if (!__DEV__) {
    return ['expo'];
  }

  const saved = await getSavedOAuthRedirectMode();
  const bridgeReady = Boolean(getDevOAuthBridgeBaseUrl());

  if (saved === 'bridge' && bridgeReady) {
    return ['bridge'];
  }
  if (saved === 'expo') {
    return ['expo'];
  }

  // First sign-in (or unknown): try fast exp:// once; fall back to bridge only if needed.
  return bridgeReady ? ['expo', 'bridge'] : ['expo'];
}

export function patchOAuthAuthorizeUrl(oauthUrl: string, redirectTo: string): string {
  const url = new URL(oauthUrl);
  url.searchParams.set('redirect_to', redirectTo);
  return url.toString();
}

export function getRedirectToFromAuthorizeUrl(oauthUrl: string): string {
  try {
    return decodeURIComponent(new URL(oauthUrl).searchParams.get('redirect_to') ?? '');
  } catch {
    return '';
  }
}

export function isOAuthCallbackUrl(url: string): boolean {
  return /auth\/callback|auth\/mobile-callback/i.test(url);
}

export async function createSessionFromOAuthUrl(url: string): Promise<void> {
  const params = parseAuthParams(url);
  const oauthError = params.get('error');
  const oauthErrorDescription = params.get('error_description');
  if (oauthError) {
    throw new Error(oauthErrorDescription || oauthError);
  }

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
    return;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      throw error;
    }
    return;
  }

  throw new Error('Google sign in did not return a valid session.');
}

export async function applyOAuthCallbackFromUrl(
  supabaseClient: SupabaseClient,
  url: string,
): Promise<boolean> {
  if (!isOAuthCallbackUrl(url)) {
    return false;
  }
  try {
    const params = parseAuthParams(url);
    const oauthError = params.get('error');
    if (oauthError) {
      if (__DEV__) {
        console.warn('[authOAuth]', params.get('error_description') || oauthError);
      }
      return false;
    }

    const code = params.get('code');
    if (code) {
      const { error } = await supabaseClient.auth.exchangeCodeForSession(code);
      if (error && __DEV__) {
        console.warn('[authOAuth] exchangeCodeForSession:', error.message);
      }
      return !error;
    }

    const accessToken = params.get('access_token') ?? '';
    const refreshToken = params.get('refresh_token') ?? '';
    if (accessToken && refreshToken) {
      const { error } = await supabaseClient.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error && __DEV__) {
        console.warn('[authOAuth] setSession:', error.message);
      }
      return !error;
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[authOAuth] applyOAuthCallbackFromUrl:', err);
    }
  }
  return false;
}

export class OAuthLocalhostRedirectError extends Error {
  constructor() {
    super('OAUTH_LOCALHOST_REDIRECT');
    this.name = 'OAuthLocalhostRedirectError';
  }
}
