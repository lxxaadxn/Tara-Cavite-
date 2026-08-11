import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import {
  extractCheckinCodeFromText,
  normalizeCheckinCode,
  resolveCheckinWebOrigin,
} from 'cavitour-shared/placeCheckin';
import { getDevOAuthBridgeBaseUrl } from './authOAuth';

const PENDING_CHECKIN_KEY = 'pending_checkin_code';

/** Web origin encoded in establishment QRs (phone camera → browser check-in). */
export function getMobileCheckinWebOrigin(): string {
  const bridge = getDevOAuthBridgeBaseUrl();
  const env = process.env.EXPO_PUBLIC_OAUTH_BRIDGE_BASE_URL?.replace(/\/$/, '') || '';
  return resolveCheckinWebOrigin(bridge || env);
}

/** Expo Go / app deep link that opens CheckinScreen (optional secondary). */
export function buildMobileCheckinDeepLink(code: string): string {
  const normalized = normalizeCheckinCode(code);
  if (!normalized) return '';
  return Linking.createURL(`checkin/${encodeURIComponent(normalized)}`);
}

export function isCheckinUrl(url: string): boolean {
  if (!url) return false;
  return /checkin/i.test(url) && Boolean(extractCheckinCodeFromText(url));
}

export async function savePendingCheckinCode(code: string): Promise<void> {
  const normalized = normalizeCheckinCode(code);
  if (!normalized) return;
  await AsyncStorage.setItem(PENDING_CHECKIN_KEY, normalized);
}

export async function consumePendingCheckinCode(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(PENDING_CHECKIN_KEY);
  if (!raw) return null;
  await AsyncStorage.removeItem(PENDING_CHECKIN_KEY);
  return normalizeCheckinCode(raw) || null;
}

export async function peekPendingCheckinCode(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(PENDING_CHECKIN_KEY);
  return raw ? normalizeCheckinCode(raw) || null : null;
}
