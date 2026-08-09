import { Alert } from 'react-native';
import {
  extractCheckinCodeFromText,
  normalizeCheckinCode,
  recordCheckinByCode,
} from 'cavitour-shared/placeCheckin';
import { savePendingCheckinCode } from './checkinDeepLink';
import { supabase } from './supabase';

export function thankYouVisitMessage(placeName: string, alreadyCheckedIn: boolean): string {
  const name = placeName?.trim() || 'this establishment';
  if (alreadyCheckedIn) {
    return `You already checked in today at ${name}. Thank you for visiting!`;
  }
  return `Thank you for visiting ${name}! Your visit was counted.`;
}

/**
 * Record a QR visit and show an in-app alert — does not navigate away.
 */
export async function confirmCheckinFromCode(
  rawCode: string,
  source: 'qr' | 'code' = 'qr'
): Promise<boolean> {
  const code = extractCheckinCodeFromText(rawCode) || normalizeCheckinCode(rawCode);
  if (!code) {
    Alert.alert('Check-in', 'Invalid check-in code.');
    return false;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    await savePendingCheckinCode(code);
    Alert.alert('Sign in required', 'Sign in first, then scan the QR again to count your visit.');
    return false;
  }

  try {
    const result = await recordCheckinByCode(supabase, code, source);
    Alert.alert(
      result.alreadyCheckedIn ? 'Already checked in' : 'Thank you for visiting!',
      thankYouVisitMessage(result.placeName, result.alreadyCheckedIn)
    );
    return true;
  } catch (e) {
    Alert.alert('Check-in', e instanceof Error ? e.message : 'Could not record your visit.');
    return false;
  }
}
