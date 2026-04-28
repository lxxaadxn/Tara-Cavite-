import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { JamIcon } from '../components/JamIcon';
import { Colors } from '../constants/theme';
import { Button } from '../components/Button';
import {
  isSupabaseConfigured,
  SUPABASE_ENV_MISSING_MESSAGE,
  supabase,
} from '../lib/supabase';
import { isNetworkErrorMsg, NETWORK_ERROR_USER_MESSAGE } from '../lib/authHelpers';

const TURQUOISE = '#54C0CC';
const MUTED = '#7A7878';
const LINE = 'rgba(122, 120, 120, 0.45)';

const ForgotPasswordScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setFormError(null);
    if (!isSupabaseConfigured) {
      setFormError(SUPABASE_ENV_MISSING_MESSAGE);
      return;
    }
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmed) {
      setFormError('Please enter your email.');
      return;
    }
    if (!emailRegex.test(trimmed)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = Linking.createURL('reset-password');
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
      if (error) throw error;
      setSent(true);
    } catch (error: unknown) {
      const message = isNetworkErrorMsg(error)
        ? NETWORK_ERROR_USER_MESSAGE
        : error instanceof Error
          ? error.message
          : String(error);
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={[styles.column, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <View style={[styles.hero, { marginTop: -insets.top, paddingTop: insets.top + 8 }]}>
            <View style={styles.decoTurquoise} pointerEvents="none" />
            <View style={styles.decoTealBlob} pointerEvents="none" />
          </View>

          <View style={styles.sheet}>
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <TouchableOpacity
                style={styles.backRow}
                accessibilityRole="button"
                accessibilityLabel="Back to login"
                onPress={() => navigation.goBack()}
              >
                <JamIcon ionicon="chevron-left" size={22} color={Colors.primary} />
                <Text style={styles.backText}>Back to Login</Text>
              </TouchableOpacity>

              <View style={styles.head}>
                <Text style={styles.title}>Forgot password</Text>
                <Text style={styles.subtitle}>
                  We&apos;ll email you a link to set a new password. Open it on this device to continue in
                  the app.
                </Text>
              </View>

              {sent ? (
                <View style={styles.sentBox}>
                  <Text style={styles.sentText}>
                    Check your email. Tap the link to open the app and choose a new password.
                  </Text>
                  <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
                    <Text style={styles.linkText}>Back to login</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.fieldsBlock}>
                    <View style={styles.pill}>
                      <Ionicons name="mail-outline" size={19} color={MUTED} style={styles.pillIcon} />
                      <TextInput
                        style={styles.pillInput}
                        placeholder="Email"
                        placeholderTextColor={MUTED}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        accessibilityLabel="Email"
                      />
                    </View>
                  </View>

                  {formError ? (
                    <Text style={styles.errorText} accessibilityRole="alert">
                      {formError}
                    </Text>
                  ) : null}

                  <View style={styles.primaryBtnWrap}>
                    <Button
                      title="Send reset link"
                      onPress={handleSend}
                      loading={loading}
                      disabled={loading}
                      accessibilityLabel="Send password reset email"
                      style={styles.primaryBtn}
                      textStyle={styles.primaryBtnText}
                    />
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  flex: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  column: {
    flex: 1,
    backgroundColor: Colors.white,
    overflow: 'visible',
  },
  hero: {
    flex: 1,
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  decoTurquoise: {
    position: 'absolute',
    width: 160,
    height: 110,
    borderRadius: 56,
    backgroundColor: TURQUOISE,
    opacity: 0.95,
    top: 4,
    left: -48,
    transform: [{ rotate: '-18deg' }],
  },
  decoTealBlob: {
    position: 'absolute',
    width: 220,
    height: 320,
    borderRadius: 110,
    backgroundColor: Colors.primary,
    top: 24,
    right: -72,
  },
  sheet: {
    flex: 3,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 22,
    paddingTop: 8,
    minHeight: 0,
  },
  sheetScroll: { flex: 1 },
  sheetScrollContent: { paddingBottom: 16 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 10,
    paddingBottom: 8,
    alignSelf: 'flex-start',
  },
  backText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: Colors.primary,
  },
  head: {
    paddingTop: 8,
    paddingBottom: 22,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    lineHeight: 30,
    color: Colors.primary,
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: MUTED,
    marginTop: 10,
    lineHeight: 20,
  },
  fieldsBlock: {
    marginBottom: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 14,
    minHeight: 46,
    backgroundColor: Colors.white,
  },
  pillIcon: {
    marginRight: 10,
  },
  pillInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: Colors.text.primary,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#c62828',
    fontFamily: 'Poppins_400Regular',
    marginBottom: 8,
    marginTop: 8,
  },
  primaryBtnWrap: {
    marginTop: 14,
    marginBottom: 24,
  },
  primaryBtn: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    height: 48,
    minHeight: 48,
    borderRadius: 999,
    paddingVertical: 0,
    backgroundColor: Colors.accent,
  },
  primaryBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  sentBox: {
    paddingVertical: 8,
  },
  sentText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: MUTED,
    lineHeight: 22,
    marginBottom: 16,
  },
  linkText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: Colors.primary,
  },
});

export default ForgotPasswordScreen;
