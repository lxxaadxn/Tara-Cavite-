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
import { LogoWordmark } from '../components/LogoWordmark';
import { Button } from '../components/Button';
import {
  isSupabaseConfigured,
  SUPABASE_ENV_MISSING_MESSAGE,
  supabase,
} from '../lib/supabase';
import { isNetworkErrorMsg, NETWORK_ERROR_USER_MESSAGE } from '../lib/authHelpers';
import { siteContentValue } from 'cavitour-shared/siteContent';
import { useSiteContent } from '../lib/useSiteContent';

const MUTED = '#737373';
const BORDER = '#E5E5E5';
const CREAM = '#F1F7F6';
const TEAL = '#1B8A70';
const INK = '#16352E';

function getPasswordResetRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/reset-password`;
  }
  return Linking.createURL('reset-password');
}

const ForgotPasswordScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const cms = useSiteContent();
  const heading = siteContentValue(cms, 'auth.reset.heading') || 'Forgot password';
  const helper =
    siteContentValue(cms, 'auth.reset.helper') ||
    'Enter your email and we will send you a link to choose a new password.';
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
      const redirectTo = getPasswordResetRedirectUrl();
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
            <Text style={styles.title}>{heading}</Text>
            <Text style={styles.subtitle}>{helper}</Text>

            {sent ? (
              <View>
                <Text style={styles.sentText}>
                  Check your inbox (and spam). Open the reset link — it should open the Set new password
                  page so you can choose a new password.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  accessibilityRole="button"
                  accessibilityLabel="Back to login"
                  style={styles.footerRow}
                >
                  <Text style={styles.footerLink}>Back to login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={styles.pillInput}
                  placeholder="you@example.com"
                  placeholderTextColor={MUTED}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Email"
                />

                {formError ? (
                  <Text style={styles.errorText} accessibilityRole="alert">
                    {formError}
                  </Text>
                ) : null}

                <Button
                  title={loading ? 'Sending…' : 'Send reset link'}
                  onPress={handleSend}
                  loading={loading}
                  disabled={loading}
                  accessibilityLabel="Send password reset email"
                  style={styles.primaryBtn}
                  textStyle={styles.primaryBtnText}
                />

                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  accessibilityRole="button"
                  accessibilityLabel="Back to login"
                  style={styles.footerRow}
                >
                  <Text style={styles.footerLink}>Back to login</Text>
                </TouchableOpacity>
              </>
            )}
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
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontFamily: 'Poppins_400Regular',
    marginTop: 12,
    lineHeight: 18,
  },
  sentText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#404040',
    textAlign: 'center',
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
  footerRow: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerLink: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: TEAL,
    textAlign: 'center',
  },
});

export default ForgotPasswordScreen;
