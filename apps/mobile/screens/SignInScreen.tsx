import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleLogoMark } from '../components/GoogleLogoMark';
import { LogoWordmark } from '../components/LogoWordmark';
import { Colors } from '../constants/theme';
import { Button } from '../components/Button';
import {
  isSupabaseConfigured,
  SUPABASE_ENV_MISSING_MESSAGE,
  supabase,
} from '../lib/supabase';
import { isNetworkErrorMsg, NETWORK_ERROR_USER_MESSAGE, withAuthRetry } from '../lib/authHelpers';
import { signInWithGoogleMobile } from '../lib/googleAuth';
import { getAdminReservedEmailMessage, isAdminReservedEmail } from '../lib/adminReservedEmail';
import { markMobileLocationPromptPending } from '../components/LocationPermissionModal';
import { TRAVELER_ACCOUNT_DISABLED_MESSAGE } from 'cavitour-shared/accountStatus';
import { siteContentValue } from 'cavitour-shared/siteContent';
import { rejectDisabledTraveler } from '../lib/rejectDisabledTraveler';
import { useSiteContent } from '../lib/useSiteContent';

const MUTED = '#737373';
const BORDER = '#E5E5E5';
const CREAM = '#F1F7F6';
const TEAL = '#1B8A70';
const INK = '#16352E';
const REMEMBER_EMAIL_KEY = 'cavitour.remember_email';

function toFriendlyLoginError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();
  if (normalized.includes('email not confirmed') || normalized.includes('email_not_confirmed')) {
    return 'Verify your email first. Open the confirmation link we sent, then sign in. You can resend it below.';
  }
  if (normalized.includes('invalid login credentials')) {
    return 'Email or password is incorrect. If this account was created with Google, use Google sign in or reset your password.';
  }
  return message || 'Sign in failed.';
}

const SignInScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const cms = useSiteContent();
  const loginWelcome = 'Welcome back! Enter your details to continue exploring';
  const loginBanner = siteContentValue(cms, 'auth.login.banner_url');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleAuthInProgress, setGoogleAuthInProgress] = useState(false);
  const [googlePhase, setGooglePhase] = useState<'starting' | 'google' | 'finishing' | 'done'>(
    'starting'
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const needsEmailConfirm =
    !!formError && /verify your email|email not confirmed|confirmation link/i.test(formError);

  useEffect(() => {
    void WebBrowser.warmUpAsync().catch(() => undefined);
    return () => {
      void WebBrowser.coolDownAsync().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    void AsyncStorage.getItem(REMEMBER_EMAIL_KEY).then((saved) => {
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    });
  }, []);

  const handleResendConfirmation = async () => {
    setFormError(null);
    setInfoMessage(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setFormError('Enter your email above, then tap resend.');
      return;
    }
    setResendLoading(true);
    try {
      const emailRedirectTo = Linking.createURL('auth/callback');
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: trimmedEmail,
        options: { emailRedirectTo },
      });
      if (error) throw error;
      setInfoMessage('Confirmation email sent. Check your inbox (and spam).');
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Could not resend confirmation email.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSignIn = async () => {
    setFormError(null);
    setInfoMessage(null);
    if (!isSupabaseConfigured) {
      setFormError(SUPABASE_ENV_MISSING_MESSAGE);
      return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !password) {
      setFormError('Please enter your email and password.');
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
    setLoading(true);
    try {
      const session = await withAuthRetry(
        async () => {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          });
          if (error) throw error;
          if (data.session) return data.session;
          const { data: again } = await supabase.auth.getSession();
          if (again.session) return again.session;
          throw new Error('Signed in but session was not ready. Please try again.');
        },
        { retries: 3, delayMs: 400 }
      );
      const allowed = await rejectDisabledTraveler(session);
      if (!allowed) {
        await AsyncStorage.setItem('isAuthenticated', 'false');
        setFormError(TRAVELER_ACCOUNT_DISABLED_MESSAGE);
        return;
      }
      const rememberTask = remember
        ? AsyncStorage.setItem(REMEMBER_EMAIL_KEY, trimmedEmail)
        : AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
      void Promise.all([
        AsyncStorage.setItem('isAuthenticated', 'true'),
        rememberTask,
        markMobileLocationPromptPending(),
      ]);
    } catch (error: unknown) {
      const message = isNetworkErrorMsg(error)
        ? NETWORK_ERROR_USER_MESSAGE
        : toFriendlyLoginError(error);
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  const runGoogleSignIn = async () => {
    setFormError(null);
    setInfoMessage(null);
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
      const { data } = await supabase.auth.getSession();
      const allowed = await rejectDisabledTraveler(data.session);
      if (!allowed) {
        await AsyncStorage.setItem('isAuthenticated', 'false');
        setFormError(TRAVELER_ACCOUNT_DISABLED_MESSAGE);
        return;
      }
      void Promise.all([
        AsyncStorage.setItem('isAuthenticated', 'true'),
        markMobileLocationPromptPending(),
      ]);
      setFormError(null);
    } catch (error: unknown) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const allowed = await rejectDisabledTraveler(data.session);
        if (!allowed) {
          await AsyncStorage.setItem('isAuthenticated', 'false');
          setFormError(TRAVELER_ACCOUNT_DISABLED_MESSAGE);
          return;
        }
        void Promise.all([
          AsyncStorage.setItem('isAuthenticated', 'true'),
          markMobileLocationPromptPending(),
        ]);
        setFormError(null);
        return;
      }
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Google sign in failed. Please try again.';
      setFormError(message);
    } finally {
      setLoading(false);
      setGoogleAuthInProgress(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (!isSupabaseConfigured) {
      setFormError(SUPABASE_ENV_MISSING_MESSAGE);
      return;
    }
    void runGoogleSignIn();
  };

  const goForgot = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('Auth' as never, { screen: 'ForgotPassword' } as never);
    } else {
      navigation.navigate('ForgotPassword' as never);
    }
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
            {loginBanner ? (
              <Image source={{ uri: loginBanner }} style={styles.loginBanner} resizeMode="cover" />
            ) : null}

            <View style={styles.brandWrap}>
              <LogoWordmark />
            </View>
            <Text style={styles.title}>Login to your account</Text>
            <Text style={styles.subtitle}>{loginWelcome}</Text>

            <Text style={styles.fieldLabel}>Email</Text>
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
              placeholder="Enter your password"
              placeholderTextColor={MUTED}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void handleSignIn()}
              accessibilityLabel="Password"
            />

            <View style={styles.rowBetween}>
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRemember((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: remember }}
              >
                <View style={[styles.checkbox, remember && styles.checkboxOn]} />
                <Text style={styles.rememberText}>Remember login</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goForgot} accessibilityRole="button">
                <Text style={styles.link}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {infoMessage ? <Text style={styles.infoText}>{infoMessage}</Text> : null}
            {formError ? (
              <Text style={styles.errorText} accessibilityRole="alert">
                {formError}
              </Text>
            ) : null}
            {needsEmailConfirm ? (
              <TouchableOpacity
                onPress={handleResendConfirmation}
                disabled={resendLoading || loading}
                accessibilityRole="button"
              >
                <Text style={styles.resendText}>
                  {resendLoading ? 'Sending…' : 'Resend confirmation email'}
                </Text>
              </TouchableOpacity>
            ) : null}

            <Button
              title={loading ? 'Logging in...' : 'Login'}
              onPress={handleSignIn}
              loading={loading}
              disabled={loading}
              accessibilityLabel="Login to your Tara, Cavite! account"
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
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Sign in with Google"
            >
              <GoogleLogoMark size={20} />
              <Text style={styles.googleBtnText}>Sign in with Google</Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerMuted}>New here? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')} accessibilityRole="button">
                <Text style={styles.footerLink}>Sign up</Text>
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
  loginBanner: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    flexWrap: 'wrap',
    rowGap: 8,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    backgroundColor: '#fff',
  },
  checkboxOn: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  rememberText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: MUTED,
  },
  link: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: TEAL,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontFamily: 'Poppins_400Regular',
    marginTop: 12,
    lineHeight: 18,
  },
  infoText: {
    fontSize: 13,
    color: '#047857',
    fontFamily: 'Poppins_400Regular',
    marginTop: 12,
    lineHeight: 18,
  },
  resendText: {
    fontSize: 13,
    color: TEAL,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 8,
    textDecorationLine: 'underline',
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

export default SignInScreen;
