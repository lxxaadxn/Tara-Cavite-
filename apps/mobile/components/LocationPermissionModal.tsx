import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants/Colors';

const DISMISSED_KEY = 'cavitour_location_prompt_dismissed_user';
const PENDING_KEY = 'cavitour_location_prompt_pending';

type Props = {
  /** When true, user just signed in / is authenticated — consider showing the prompt. */
  isAuthenticated: boolean;
  userId?: string | null;
};

/**
 * After mobile sign-in, ask for location via the native OS permission dialog
 * (expo-location). Much more reliable than the web browser lock-icon flow.
 */
export function LocationPermissionModal({ isAuthenticated, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState('');

  const maybeShow = useCallback(async (uid: string | null | undefined) => {
    if (!uid) return;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        await AsyncStorage.removeItem(PENDING_KEY);
        return;
      }
      const dismissed = await AsyncStorage.getItem(DISMISSED_KEY);
      const pending = await AsyncStorage.getItem(PENDING_KEY);
      if (dismissed === uid && pending !== '1') return;
      setBlocked(status === 'denied');
      setError('');
      setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setOpen(false);
      return;
    }
    let cancelled = false;
    (async () => {
      // Brief delay so the main tabs finish mounting after login.
      await new Promise((r) => setTimeout(r, 600));
      if (!cancelled) await maybeShow(userId);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId, maybeShow]);

  const handleAllow = async () => {
    setBusy(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        await AsyncStorage.removeItem(PENDING_KEY);
        await AsyncStorage.removeItem(DISMISSED_KEY);
        setOpen(false);
        setBlocked(false);
        return;
      }
      setBlocked(true);
      setError(
        Platform.OS === 'ios'
          ? 'Location is off for Tara, Cavite!. Open Settings → Tara, Cavite! → Location → While Using the App, then tap Try again.'
          : 'Location is off for Tara, Cavite!. Open Settings → Apps → Tara, Cavite! → Permissions → Location → Allow, then tap Try again.'
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not request location.');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      setError('Could not open Settings. Enable Location for Tara, Cavite! manually, then tap Try again.');
    }
  };

  const handleNotNow = async () => {
    if (userId) {
      await AsyncStorage.setItem(DISMISSED_KEY, userId);
    }
    await AsyncStorage.removeItem(PENDING_KEY);
    setOpen(false);
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={handleNotNow}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="location" size={22} color={Colors.accent} />
          </View>
          <Text style={styles.title}>Share your location?</Text>
          <Text style={styles.body}>
            Tara, Cavite! uses your GPS so maps can place a green dot where you are and route you to
            establishments accurately.
          </Text>

          {blocked ? (
            <View style={styles.hintBox}>
              <Text style={styles.hintTitle}>Location is turned off for this app</Text>
              <Text style={styles.hintBody}>
                {Platform.OS === 'ios'
                  ? 'Open Settings → Tara, Cavite! → Location → While Using the App.'
                  : 'Open Settings → Apps → Tara, Cavite! → Permissions → Location → Allow.'}
              </Text>
            </View>
          ) : (
            <Text style={styles.sub}>
              Tap Allow location — your phone will ask you to Allow or Deny next.
            </Text>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity onPress={handleNotNow} disabled={busy} style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>Not now</Text>
            </TouchableOpacity>
            {blocked ? (
              <TouchableOpacity onPress={handleOpenSettings} disabled={busy} style={styles.settingsBtn}>
                <Text style={styles.settingsText}>Open Settings</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={handleAllow}
              disabled={busy}
              style={[styles.primaryBtn, busy && styles.primaryDisabled]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>{blocked ? 'Try again' : 'Allow location'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Call right after a successful sign-in so the modal opens once the main app mounts. */
export async function markMobileLocationPromptPending(): Promise<void> {
  await AsyncStorage.setItem(PENDING_KEY, '1');
}

export async function clearMobileLocationPromptDismissed(): Promise<void> {
  await AsyncStorage.multiRemove([DISMISSED_KEY, PENDING_KEY]);
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 22,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 163, 127,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: Colors.text.primary,
  },
  body: {
    marginTop: 8,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.text.secondary,
  },
  sub: {
    marginTop: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: Colors.text.secondary,
  },
  hintBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5D98A',
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hintTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#6B4E00',
    marginBottom: 4,
  },
  hintBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#6B4E00',
  },
  error: {
    marginTop: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#B91C1C',
  },
  actions: {
    marginTop: 18,
    gap: 8,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.text.secondary,
  },
  settingsBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.12)',
  },
  settingsText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.text.primary,
  },
  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryDisabled: {
    opacity: 0.65,
  },
  primaryText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.white,
  },
});
