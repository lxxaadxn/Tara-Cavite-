import { Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import { googleMapsDirectionsUrl } from './googleMapsDirections';

/**
 * Opens Google Maps driving directions to a destination.
 * Uses the device location as origin when permission is granted (same as Start CaviTrip).
 */
export async function launchGoogleMapsDrivingTo(
  destLat: number,
  destLng: number,
  knownOrigin?: { lat: number; lng: number } | null
): Promise<boolean> {
  const la = Number(destLat);
  const lo = Number(destLng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) {
    Alert.alert('Could not open Maps', 'This place does not have map coordinates yet.');
    return false;
  }

  let originLat = knownOrigin?.lat ?? null;
  let originLng = knownOrigin?.lng ?? null;
  if (originLat == null || originLng == null) {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        originLat = pos.coords.latitude;
        originLng = pos.coords.longitude;
      }
    } catch {
    }
  }

  const url = googleMapsDirectionsUrl(la, lo, {
    mode: 'driving',
    originLat,
    originLng,
  });
  if (!url) {
    Alert.alert('Could not open Maps', 'Missing destination coordinates.');
    return false;
  }

  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('Could not open Google Maps', 'Install Google Maps or try again.');
    return false;
  }
}
