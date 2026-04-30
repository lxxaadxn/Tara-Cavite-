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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
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

const TURQUOISE = '#54C0CC';
const MUTED = '#7A7878';
const LINE = 'rgba(122, 120, 120, 0.45)';

const MIN_PASSWORD_LENGTH = 6;

const SignUpScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
      const { data, error } = await withAuthRetry(() =>
        supabase.auth.signUp({
          email: trimmedEmail,
          password,
        })
      );
      if (error) throw error;
      if (data.session) {
        await AsyncStorage.setItem('isAuthenticated', 'true');
      } else {
        setFormError(
          'Check your email. We sent you a confirmation link. Open it to activate your account, then sign in.'
        );
        navigation.goBack();
      }
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

  const handleGoogleSignUp = async () => {
    setFormError(null);
    if (!isSupabaseConfigured) {
      setFormError(SUPABASE_ENV_MISSING_MESSAGE);
      return;
    }
    setLoading(true);
    try {
      await signInWithGoogleMobile();
      await AsyncStorage.setItem('isAuthenticated', 'true');
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Google sign up failed. Please try again.';
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
                <Text style={styles.title}>Sign Up</Text>
              </View>

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

                <View style={[styles.pill, styles.pillSpaced]}>
                  <Ionicons name="lock-closed-outline" size={19} color={MUTED} style={styles.pillIcon} />
                  <TextInput
                    style={styles.pillInput}
                    placeholder="Password"
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

                <View style={[styles.pill, styles.pillSpaced]}>
                  <Ionicons name="lock-closed-outline" size={19} color={MUTED} style={styles.pillIcon} />
                  <TextInput
                    style={styles.pillInput}
                    placeholder="Confirm Password"
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

              <View style={styles.primaryBtnWrap}>
                <Button
                  title="Sign Up"
                  onPress={handleSignUp}
                  loading={loading}
                  disabled={loading}
                  accessibilityLabel="Create your CaviTour account"
                  style={styles.primaryBtn}
                  textStyle={styles.primaryBtnText}
                />
              </View>

              <View style={styles.bottomBlock}>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerLabel}>Or sign up with</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialRow}>
                  <TouchableOpacity
                    style={styles.socialBtn}
                    accessibilityLabel="Sign up with Facebook"
                    onPress={() => {}}
                  >
                    <FontAwesome name="facebook" size={22} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.socialBtn}
                    accessibilityLabel="Sign up with Google"
                    onPress={handleGoogleSignUp}
                  >
                    <JamIcon ionicon="logo-google" size={22} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
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
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingBottom: 16,
  },
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
  pillSpaced: {
    marginTop: 18,
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
  inlineErrorText: {
    fontSize: 12,
    color: '#c62828',
    fontFamily: 'Poppins_400Regular',
    marginTop: 8,
    marginBottom: 4,
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
    marginBottom: 48,
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
  bottomBlock: {
    paddingTop: 0,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 12,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: LINE,
  },
  dividerLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: MUTED,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 4,
  },
  socialBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SignUpScreen;
