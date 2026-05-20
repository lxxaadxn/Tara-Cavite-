import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { JamIcon } from '../components/JamIcon';
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

function toFriendlyLoginError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) {
    return 'Email or password is incorrect. If this account was created with Google, use Google sign in or reset your password.';
  }
  return message || 'Sign in failed.';
}

const SignInScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleAuthInProgress, setGoogleAuthInProgress] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setFormError(null);
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
      const { error } = await withAuthRetry(() =>
        supabase.auth.signInWithPassword({ email: trimmedEmail, password })
      );
      if (error) throw error;
      await AsyncStorage.setItem('isAuthenticated', 'true');
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
    setLoading(true);
    setGoogleAuthInProgress(true);
    try {
      await signInWithGoogleMobile();
      await AsyncStorage.setItem('isAuthenticated', 'true');
    } catch (error: unknown) {
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

  return (
    <View style={styles.root}>
      <Modal visible={googleAuthInProgress} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.authOverlay}>
          <View style={styles.authCard}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.authTitle}>Signing in with Google</Text>
            <Text style={styles.authSubtitle}>Complete sign-in in the Google window.</Text>
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
            { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandBlock}>
            <Text style={styles.brandMark}>CaviTour</Text>
            <Text style={styles.brandTagline}>Mabuhay — explore Cavite with ease.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>Use your email or Google account.</Text>

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
                  placeholder="Your password"
                  placeholderTextColor={MUTED}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  accessibilityLabel="Password"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotWrap}
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              onPress={() => {
                const parent = navigation.getParent();
                if (parent) {
                  parent.navigate('Auth' as never, { screen: 'ForgotPassword' } as never);
                } else {
                  navigation.navigate('ForgotPassword' as never);
                }
              }}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {formError ? (
              <Text style={styles.errorText} accessibilityRole="alert">
                {formError}
              </Text>
            ) : null}

            <Button
              title="Sign in"
              onPress={handleSignIn}
              loading={loading}
              disabled={loading}
              accessibilityLabel="Sign in to your CaviTour account"
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
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <JamIcon ionicon="logo-google" size={20} color={Colors.primary} />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerMuted}>{"Don't have an account? "}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')} accessibilityRole="button">
              <Text style={styles.footerLink}>Sign up</Text>
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
  brandBlock: {
    marginBottom: 28,
  },
  brandMark: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 32,
    lineHeight: 38,
    color: Colors.accent,
    letterSpacing: -0.5,
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
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginBottom: 4,
  },
  forgotText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.accent,
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

export default SignInScreen;
