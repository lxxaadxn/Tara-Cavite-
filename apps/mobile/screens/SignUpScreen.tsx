import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { JamIcon } from '../components/JamIcon';
import { GoogleLogoMark } from '../components/GoogleLogoMark';
import { GoogleConsentModal } from '../components/GoogleConsentModal';
import { Colors } from '../constants/theme';
import { Button } from '../components/Button';
import {
  isSupabaseConfigured,
  SUPABASE_ENV_MISSING_MESSAGE,
  supabase,
} from '../lib/supabase';
import { withAuthRetry, isNetworkErrorMsg, NETWORK_ERROR_USER_MESSAGE } from '../lib/authHelpers';
import { signInWithGoogleMobile } from '../lib/googleAuth';
import { getAdminReservedEmailMessage, isAdminReservedEmail } from '../lib/adminReservedEmail';

const MUTED = '#6B7280';
const BORDER = 'rgba(17, 24, 39, 0.1)';
const FIELD_BG = '#F9FAFB';

const MIN_PASSWORD_LENGTH = 6;

function toFriendlySignupError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();
  if (normalized.includes('user already registered') || normalized.includes('already exists')) {
    return 'This email is already registered. Log in instead, or use Google sign in if you first created the account with Google.';
  }
  return message || 'Sign up failed.';
}

const SignUpScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGoogleConsent, setShowGoogleConsent] = useState(false);
  const [googleAuthInProgress, setGoogleAuthInProgress] = useState(false);
  const [googlePhase, setGooglePhase] = useState<'starting' | 'google' | 'finishing' | 'done'>(
    'starting'
  );
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setFormError(null);
    if (!isSupabaseConfigured) {
      setFormError(SUPABASE_ENV_MISSING_MESSAGE);
      return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setConfirmPasswordError('');

    if (!trimmedEmail || !password || !confirmPassword) {
      setFormError('Please fill in all fields.');
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (isAdminReservedEmail(trimmedEmail)) {
      setFormError(getAdminReservedEmailMessage());
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const emailRedirectTo = Linking.createURL('auth/callback');
      const { data, error } = await withAuthRetry(() =>
        supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { emailRedirectTo },
        })
      );
      if (error) throw error;
      const identities = data.user?.identities ?? [];
      if (data.user && identities.length === 0) {
        throw new Error('User already registered');
      }
      if (data.session) {
        await AsyncStorage.setItem('isAuthenticated', 'true');
      } else if (data.user) {
        setFormError(
          'Check your email. We sent you a confirmation link. Open it to activate your account, then sign in.'
        );
        navigation.goBack();
      } else {
        throw new Error('Sign up failed. Please try again.');
      }
    } catch (error: unknown) {
      const message = isNetworkErrorMsg(error)
        ? NETWORK_ERROR_USER_MESSAGE
        : toFriendlySignupError(error);
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  const runGoogleSignUp = async () => {
    setFormError(null);
    setLoading(true);
    setGooglePhase('starting');
    setGoogleAuthInProgress(true);
    try {
      await signInWithGoogleMobile({
        onPhase: (phase) => {
          setGooglePhase(phase);
          if (phase === 'google') {
            setGoogleAuthInProgress(false);
          } else if (phase === 'finishing' || phase === 'starting') {
            setGoogleAuthInProgress(true);
          }
        },
      });
      setGooglePhase('done');
      setGoogleAuthInProgress(true);
      await AsyncStorage.setItem('isAuthenticated', 'true');
      setFormError(null);
      await new Promise((r) => setTimeout(r, 400));
    } catch (error: unknown) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setGoogleAuthInProgress(true);
        await AsyncStorage.setItem('isAuthenticated', 'true');
        setFormError(null);
        await new Promise((r) => setTimeout(r, 400));
        return;
      }
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Google sign up failed. Please try again.';
      setFormError(message);
    } finally {
      setLoading(false);
      setGoogleAuthInProgress(false);
    }
  };

  const handleGoogleSignUp = () => {
    if (!isSupabaseConfigured) {
      setFormError(SUPABASE_ENV_MISSING_MESSAGE);
      return;
    }
    setShowGoogleConsent(true);
  };

  return (
    <View style={styles.root}>
      <GoogleConsentModal
        visible={showGoogleConsent}
        mode="sign-up"
        onCancel={() => setShowGoogleConsent(false)}
        onContinue={() => {
          setShowGoogleConsent(false);
          void runGoogleSignUp();
        }}
      />

      <Modal visible={googleAuthInProgress} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.authOverlay}>
          <View style={styles.authCard}>
            <GoogleLogoMark size={32} />
            <ActivityIndicator size="large" color={Colors.accent} style={styles.authSpinner} />
            <Text style={styles.authTitle}>
              {googlePhase === 'finishing' || googlePhase === 'done'
                ? 'Finishing sign-in…'
                : 'Authenticating with Google'}
            </Text>
            <Text style={styles.authSubtitle}>
              {googlePhase === 'finishing' || googlePhase === 'done'
                ? 'Almost done — opening your home screen.'
                : 'Please continue in the Google sign-in window.'}
            </Text>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
            onPress={() => navigation.goBack()}
          >
            <JamIcon ionicon="chevron-back" size={22} color={Colors.text.primary} />
          </TouchableOpacity>

          <View style={styles.brandBlock}>
            <Text style={styles.brandMark}>Create account</Text>
            <Text style={styles.brandTagline}>Join Tara, Cavite! to save places and plan trips.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Sign up</Text>
            <Text style={styles.subtitle}>Email and password, or Google.</Text>

            <View style={styles.fieldsBlock}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={styles.field}>
                <Ionicons name="mail-outline" size={18} color={MUTED} style={styles.fieldIcon} />
                <TextInput
                  style={styles.fieldInput}
                  placeholder="you@example.com"
                  placeholderTextColor={MUTED}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Email"
                />
              </View>

              <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Password</Text>
              <View style={styles.field}>
                <Ionicons name="lock-closed-outline" size={18} color={MUTED} style={styles.fieldIcon} />
                <TextInput
                  style={styles.fieldInput}
                  placeholder="At least 6 characters"
                  placeholderTextColor={MUTED}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setConfirmPasswordError('');
                  }}
                  secureTextEntry
                  accessibilityLabel="Password"
                />
              </View>

              <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Confirm password</Text>
              <View style={styles.field}>
                <Ionicons name="lock-closed-outline" size={18} color={MUTED} style={styles.fieldIcon} />
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Repeat password"
                  placeholderTextColor={MUTED}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setConfirmPasswordError('');
                  }}
                  secureTextEntry
                  accessibilityLabel="Confirm password"
                />
              </View>
            </View>

            {confirmPasswordError ? (
              <Text style={styles.inlineErrorText} accessibilityRole="alert">
                {confirmPasswordError}
              </Text>
            ) : null}

            {formError ? (
              <Text style={styles.errorText} accessibilityRole="alert">
                {formError}
              </Text>
            ) : null}

            <Button
              title="Create account"
              onPress={handleSignUp}
              loading={loading}
              disabled={loading}
              accessibilityLabel="Create your Tara, Cavite! account"
              style={styles.primaryBtn}
              textStyle={styles.primaryBtnText}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignUp}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <GoogleLogoMark size={20} />
              <Text style={styles.googleBtnText}>Sign up with Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerMuted}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
    marginBottom: 8,
  },
  brandBlock: {
    marginBottom: 24,
  },
  brandMark: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    lineHeight: 34,
    color: Colors.text.primary,
    letterSpacing: -0.4,
  },
  brandTagline: {
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: MUTED,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: Colors.text.primary,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 20,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  fieldsBlock: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  fieldLabelSpaced: {
    marginTop: 14,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    backgroundColor: FIELD_BG,
  },
  fieldIcon: {
    marginRight: 10,
  },
  fieldInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.text.primary,
    paddingVertical: 12,
  },
  inlineErrorText: {
    fontSize: 13,
    color: '#B91C1C',
    fontFamily: 'Inter_400Regular',
    marginTop: 10,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    fontFamily: 'Inter_400Regular',
    marginTop: 12,
    marginBottom: 4,
    lineHeight: 18,
  },
  primaryBtn: {
    width: '100%',
    marginTop: 20,
    height: 50,
    minHeight: 50,
    borderRadius: 12,
    paddingVertical: 0,
    backgroundColor: Colors.accent,
  },
  primaryBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    textTransform: 'none',
    letterSpacing: 0,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
  },
  dividerLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: MUTED,
    textTransform: 'lowercase',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  googleBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.text.primary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    flexWrap: 'wrap',
  },
  footerMuted: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: MUTED,
  },
  footerLink: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.accent,
  },
  authOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  authCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  authSpinner: {
    marginTop: 14,
  },
  authTitle: {
    marginTop: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  authSubtitle: {
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
  },
});

export default SignUpScreen;
