import { Alert } from 'react-native';
import {
  extractCheckinCodeFromText,
  fetchPlaceCheckinDisplay,
  foldEstablishmentName,
  normalizeCheckinCode,
  recordCheckinByCode,
} from 'cavitour-shared/placeCheckin';
import { recordDestinationReached } from './destinationReachedActivity';
import { savePendingCheckinCode } from './checkinDeepLink';
import { supabase } from './supabase';

export function thankYouVisitMessage(placeName: string, alreadyCheckedIn: boolean): string {
  const name = placeName?.trim() || 'this establishment';
  if (alreadyCheckedIn) {
    return `You already checked in today at ${name}. Thank you for visiting!`;
  }
  return `Thank you for visiting ${name}! Your visit was counted.`;
}

export type ConfirmCheckinOptions = {
  expectedPlaceId?: string;
  expectedPlaceName?: string;
  placeImage?: string;
  requireExpectedPlace?: boolean;
  recordAsDestinationReached?: boolean;
};

export async function confirmCheckinFromCode(
  rawCode: string,
  source: 'qr' | 'code' = 'qr',
  options: ConfirmCheckinOptions = {}
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
    if (options.requireExpectedPlace && options.expectedPlaceId) {
      const expected = await fetchPlaceCheckinDisplay(supabase, options.expectedPlaceId);
      if (expected?.code && normalizeCheckinCode(expected.code) !== code) {
        Alert.alert(
          'Wrong establishment',
          `This QR is not for ${options.expectedPlaceName || 'this destination'}. Scan the printed poster QR at the place you reached.`
        );
        return false;
      }
    }

    const result = await recordCheckinByCode(supabase, code, source);

    if (options.requireExpectedPlace && options.expectedPlaceName) {
      const expected = foldEstablishmentName(options.expectedPlaceName);
      const actual = foldEstablishmentName(result.placeName);
      if (expected && actual && expected !== actual) {
        Alert.alert(
          'Wrong establishment',
          `This QR is for ${result.placeName}. Scan the QR for ${options.expectedPlaceName} to confirm you arrived.`
        );
        return false;
      }
    }

    const profilePlaceId = String(options.expectedPlaceId || result.placeId || '').trim();
    if (options.recordAsDestinationReached !== false && profilePlaceId) {
      await recordDestinationReached(user.id, profilePlaceId, {
        name: options.expectedPlaceName || result.placeName,
        image: options.placeImage,
      });
    }

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
