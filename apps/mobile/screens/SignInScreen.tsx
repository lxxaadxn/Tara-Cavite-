import React, { useState } from 'react';
import {
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

const TURQUOISE = '#54C0CC';
const MUTED = '#7A7878';
const LINE = 'rgba(122, 120, 120, 0.45)';

const SignInScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
        : error instanceof Error
          ? error.message
          : String(error);
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
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
          : 'Google sign in failed. Please try again.';
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

            <View style={styles.headerTextBlock}>
              <Text style={styles.mabuhay}>Mabuhay!</Text>
              <Text style={styles.welcome}>Welcome to CaviTour</Text>
            </View>
          </View>

          <View style={styles.sheet}>
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.loginHead}>
                <Text style={styles.loginTitle}>Login</Text>
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
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              {formError ? (
                <Text style={styles.errorText} accessibilityRole="alert">
                  {formError}
                </Text>
              ) : null}

              <View style={styles.loginBtnWrap}>
                <Button
                  title="Login"
                  onPress={handleSignIn}
                  loading={loading}
                  disabled={loading}
                  accessibilityLabel="Sign in to your CaviTour account"
                  style={styles.loginBtn}
                  textStyle={styles.loginBtnText}
                />
              </View>

              <View style={styles.bottomBlock}>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerLabel}>Or login with</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialRow}>
                  <TouchableOpacity
                    style={styles.socialBtn}
                    accessibilityLabel="Log in with Facebook"
                    onPress={() => {}}
                  >
                    <FontAwesome name="facebook" size={22} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.socialBtn}
                    accessibilityLabel="Log in with Google"
                    onPress={handleGoogleSignIn}
                  >
                    <JamIcon ionicon="logo-google" size={22} color={Colors.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.footerRow}>
                  <Text style={styles.footerMuted}>{"Don't have an account? "}</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('SignUp')} accessibilityRole="button">
                    <Text style={styles.footerLink}>Sign up</Text>
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
  /** White behind status bar / nav bar; hero is pulled up with insets for green under status bar */
  root: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingTop: 0,
  },
  flex: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  /** flex 1 : flex 3 ≈ 25% hero / 75% white sheet */
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
  headerTextBlock: {
    paddingBottom: 4,
  },
  mabuhay: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 38,
    lineHeight: 46,
    color: Colors.white,
  },
  welcome: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 17,
    lineHeight: 24,
    color: Colors.white,
    marginTop: 8,
    opacity: 0.98,
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
  loginHead: {
    paddingTop: 18,
    paddingBottom: 26,
  },
  loginTitle: {
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
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
  },
  forgotText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: Colors.primary,
  },
  errorText: {
    fontSize: 12,
    color: '#c62828',
    fontFamily: 'Poppins_400Regular',
    marginBottom: 8,
    marginTop: 4,
  },
  loginBtnWrap: {
    marginTop: 20,
    marginBottom: 48,
  },
  loginBtn: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    height: 48,
    minHeight: 48,
    borderRadius: 999,
    paddingVertical: 0,
    backgroundColor: Colors.accent,
  },
  loginBtnText: {
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
    marginBottom: 10,
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 4,
    flexWrap: 'wrap',
  },
  footerMuted: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: MUTED,
  },
  footerLink: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: Colors.primary,
  },
});

export default SignInScreen;
