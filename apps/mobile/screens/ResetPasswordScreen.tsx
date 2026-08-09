import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { JamIcon } from '../components/JamIcon';
import { Colors } from '../constants/theme';
import { Button } from '../components/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isSupabaseConfigured,
  SUPABASE_ENV_MISSING_MESSAGE,
  supabase,
} from '../lib/supabase';
import { useAuthRecovery } from '../context/AuthRecoveryContext';

const MUTED = '#7A7878';
const LINE = 'rgba(122, 120, 120, 0.45)';
const MIN_LEN = 8;

const ResetPasswordScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { endPasswordRecoveryFlow } = useAuthRecovery();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSave = async () => {
    setFormError(null);
    if (!isSupabaseConfigured) {
      setFormError(SUPABASE_ENV_MISSING_MESSAGE);
      return;
    }
    if (password.length < MIN_LEN) {
      setFormError(`Password must be at least ${MIN_LEN} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await AsyncStorage.setItem('isAuthenticated', 'true');
      Alert.alert('Password updated', 'Your password was successfully changed.');
      endPasswordRecoveryFlow();
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Could not update password.');
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
                onPress={() => navigation.navigate('SignIn' as never)}
              >
                <JamIcon ionicon="chevron-left" size={22} color={Colors.primary} />
                <Text style={styles.backText}>Back to Login</Text>
              </TouchableOpacity>

              <View style={styles.head}>
                <Text style={styles.title}>New password</Text>
                <Text style={styles.subtitle}>Choose a password for your account.</Text>
              </View>

              {!ready ? (
                <Text style={styles.waitText}>
                  Waiting for a valid reset link… Open the link from your email on this device.
                </Text>
              ) : (
                <>
                  <View style={styles.fieldsBlock}>
                    <View style={styles.pill}>
                      <Ionicons name="lock-closed-outline" size={19} color={MUTED} style={styles.pillIcon} />
                      <TextInput
                        style={styles.pillInput}
                        placeholder="New password"
                        placeholderTextColor={MUTED}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        accessibilityLabel="New password"
                      />
                    </View>

                    <View style={[styles.pill, styles.pillSpaced]}>
                      <Ionicons name="lock-closed-outline" size={19} color={MUTED} style={styles.pillIcon} />
                      <TextInput
                        style={styles.pillInput}
                        placeholder="Confirm password"
                        placeholderTextColor={MUTED}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        accessibilityLabel="Confirm password"
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
                      title="Save password"
                      onPress={handleSave}
                      loading={loading}
                      disabled={loading}
                      accessibilityLabel="Save new password"
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

const TURQUOISE = '#54C0CC';

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
  waitText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: MUTED,
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
});

export default ResetPasswordScreen;
