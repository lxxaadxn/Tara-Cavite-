import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  extractCheckinCodeFromText,
  normalizeCheckinCode,
} from 'cavitour-shared/placeCheckin';
import { Header } from '../components/Header';
import { confirmCheckinFromCode } from '../lib/confirmCheckin';

const TEAL = '#1f4f59';
const MUTED = '#737373';
const BORDER = '#e5e5e5';

type CheckinRouteParams = {
  code?: string;
  fromDestinationReached?: boolean;
  expectedPlaceId?: string;
  expectedPlaceName?: string;
  placeImage?: string;
};

const CheckinScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params as CheckinRouteParams | undefined) || {};
  const initial = normalizeCheckinCode(params.code || '') || '';
  const [code, setCode] = useState(initial);
  const [busy, setBusy] = useState(false);
  const autoRan = useRef(false);

  const runCheckin = useCallback(
    async (raw: string, source: 'qr' | 'code') => {
      const normalized = extractCheckinCodeFromText(raw);
      if (!normalized) {
        Alert.alert('Check-in', 'Enter a valid establishment code.');
        return;
      }
      setBusy(true);
      try {
        const ok = await confirmCheckinFromCode(normalized, source, {
          expectedPlaceId: params.expectedPlaceId,
          expectedPlaceName: params.expectedPlaceName,
          placeImage: params.placeImage,
          requireExpectedPlace: Boolean(params.fromDestinationReached && params.expectedPlaceName),
          recordAsDestinationReached: true,
        });
        if (ok && navigation.canGoBack()) {
          navigation.goBack();
        }
      } finally {
        setBusy(false);
      }
    },
    [
      navigation,
      params.expectedPlaceId,
      params.expectedPlaceName,
      params.fromDestinationReached,
      params.placeImage,
    ]
  );

  useEffect(() => {
    if (initial && !autoRan.current) {
      autoRan.current = true;
      void runCheckin(initial, 'qr');
    }
  }, [initial, runCheckin]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header
        title={params.fromDestinationReached ? 'Confirm arrival' : 'Check in'}
        showBack
        showNotification={false}
        darkBackground
      />
      <View style={styles.body}>
        <Text style={styles.hint}>
          {params.fromDestinationReached && params.expectedPlaceName
            ? `Scan or type the QR code for ${params.expectedPlaceName} to record Destination Reached on admin Destinations and your Profile.`
            : 'Scan the establishment QR with your camera (opens this screen) or type its unique code. Each QR is unique per business.'}
        </Text>
        <Text style={styles.label}>Check-in code</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="CT-XXXXXXXX"
          placeholderTextColor={MUTED}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!busy}
        />
        <TouchableOpacity
          style={[styles.btn, busy && styles.btnDisabled]}
          disabled={busy}
          onPress={() => void runCheckin(code, 'code')}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Check in</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f7f9' },
  body: { padding: 16 },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#525252',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: '#171717',
    letterSpacing: 0.5,
  },
  btn: {
    marginTop: 14,
    height: 48,
    borderRadius: 12,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.65 },
  btnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#fff',
  },
});

export default CheckinScreen;
