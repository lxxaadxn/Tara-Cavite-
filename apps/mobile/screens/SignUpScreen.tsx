import React, { useEffect, useState } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleLogoMark } from '../components/GoogleLogoMark';
import { JamIcon } from '../components/JamIcon';
import { LogoWordmark } from '../components/LogoWordmark';
import { Colors } from '../constants/theme';
import { Button } from '../components/Button';
import {
  isSupabaseConfigured,
  SUPABASE_ENV_MISSING_MESSAGE,
  supabase,
} from '../lib/supabase';
import { isNetworkErrorMsg, NETWORK_ERROR_USER_MESSAGE } from '../lib/authHelpers';
import { signInWithGoogleMobile } from '../lib/googleAuth';
import { getAdminReservedEmailMessage, isAdminReservedEmail } from '../lib/adminReservedEmail';

const MUTED = '#737373';
const BORDER = '#E5E5E5';
const CREAM = '#F1F7F6';
const TEAL = '#1B8A70';
const INK = '#16352E';

const MIN_PASSWORD_LENGTH = 8;

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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleAuthInProgress, setGoogleAuthInProgress] = useState(false);
  const [googlePhase, setGooglePhase] = useState<'starting' | 'google' | 'finishing' | 'done'>(
    'starting'
  );
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    void WebBrowser.warmUpAsync().catch(() => undefined);
    return () => {
      void WebBrowser.coolDownAsync().catch(() => undefined);
    };
  }, []);

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
      setFormError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      return;
    }
    if (!acceptedTerms) {
      setFormError('Agree to the Terms of Use to create an account.');
      return;
    }
    setLoading(true);
    try {
      const trimmedName = name.trim() || trimmedEmail.split('@')[0];
      const emailRedirectTo = Linking.createURL('auth/callback');
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { data: { username: trimmedName }, emailRedirectTo },
      });
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
      setGoogleAuthInProgress(false);
      void AsyncStorage.setItem('isAuthenticated', 'true');
      setFormError(null);
    } catch (error: unknown) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        void AsyncStorage.setItem('isAuthenticated', 'true');
        setFormError(null);
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
    if (!acceptedTerms) {
      setFormError('Agree to the Terms of Use before continuing.');
      return;
    }
    void runGoogleSignUp();
  };

  return (
    <View style={styles.root}>
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
            { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            <View style={styles.brandWrap}>
              <LogoWordmark />
            </View>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Enter your details to get started with Tara, Cavite!</Text>

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.pillInput}
              placeholder="Enter your name"
              placeholderTextColor={MUTED}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              accessibilityLabel="Name"
            />

            <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Email</Text>
            <TextInput
              style={styles.pillInput}
              placeholder="Enter your email"
              placeholderTextColor={MUTED}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Email"
            />

            <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Password</Text>
            <TextInput
              style={styles.pillInput}
              placeholder="Create your password"
              placeholderTextColor={MUTED}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setConfirmPasswordError('');
              }}
              secureTextEntry
              accessibilityLabel="Password"
            />
            <Text style={styles.hint}>Must be at least 8 characters.</Text>

            <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Confirm password</Text>
            <TextInput
              style={styles.pillInput}
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

            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAcceptedTerms((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxOn]}>
                {acceptedTerms ? <JamIcon ionicon="checkmark" size={14} color="#fff" /> : null}
              </View>
              <Text style={styles.legalText}>
                I agree to the{' '}
                <Text
                  style={styles.legalLink}
                  onPress={() => (navigation as { navigate: (name: string) => void }).navigate('Terms')}
                >
                  Terms of Use
                </Text>
                .
              </Text>
            </TouchableOpacity>

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
              title={loading ? 'Creating account...' : 'Create account'}
              onPress={handleSignUp}
              loading={loading}
              disabled={loading || !acceptedTerms}
              accessibilityLabel="Create your Tara, Cavite! account"
              style={styles.primaryBtn}
              textStyle={styles.primaryBtnText}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignUp}
              disabled={loading || !acceptedTerms}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Sign up with Google"
            >
              <GoogleLogoMark size={20} />
              <Text style={styles.googleBtnText}>Sign up with Google</Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerMuted}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
                <Text style={styles.footerLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CREAM,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  form: {
    width: '100%',
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    lineHeight: 30,
    color: INK,
    textAlign: 'center',
    width: '100%',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: MUTED,
    textAlign: 'center',
    width: '100%',
  },
  fieldLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 18,
    color: MUTED,
    marginBottom: 8,
  },
  fieldLabelSpaced: {
    marginTop: 14,
  },
  pillInput: {
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: INK,
    backgroundColor: '#FFFFFF',
  },
  hint: {
    marginTop: 6,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: MUTED,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#f7fbfa',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  legalText: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
  },
  legalLink: {
    fontFamily: 'Poppins_600SemiBold',
    color: TEAL,
  },
  inlineErrorText: {
    fontSize: 13,
    color: '#DC2626',
    fontFamily: 'Poppins_400Regular',
    marginTop: 10,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontFamily: 'Poppins_400Regular',
    marginTop: 12,
    lineHeight: 18,
  },
  primaryBtn: {
    width: '100%',
    marginTop: 18,
    height: 44,
    minHeight: 44,
    borderRadius: 999,
    paddingVertical: 0,
    backgroundColor: TEAL,
  },
  primaryBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    textTransform: 'none',
    letterSpacing: 0,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
  },
  dividerLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#A3A3A3',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  googleBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#262626',
  },
  footerRow: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerMuted: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: MUTED,
  },
  footerLink: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: TEAL,
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
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
  },
});

export default SignUpScreen;
