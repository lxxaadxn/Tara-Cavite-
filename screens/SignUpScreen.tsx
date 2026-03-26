import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../constants/theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { supabase } from '../lib/supabase';
import { withAuthRetry, isNetworkErrorMsg, NETWORK_ERROR_USER_MESSAGE } from '../lib/authHelpers';

const MIN_PASSWORD_LENGTH = 6;
const hasUppercase = (str: string) => /[A-Z]/.test(str);

const SignUpScreen: React.FC = () => {
  const navigation = useNavigation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setFormError(null);
    const trimmedEmail = email.trim();
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
    const trimmedUsername = username.trim() || trimmedEmail.split('@')[0];
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(
        'Password must be at least 6 characters and contain at least one uppercase letter.'
      );
      return;
    }
    if (!hasUppercase(password)) {
      setFormError('Password must contain at least one uppercase letter.');
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('Password do not match.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await withAuthRetry(() =>
        supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { data: { username: trimmedUsername } },
        })
      );
      if (error) throw error;
      if (data.session) {
        await AsyncStorage.setItem('isAuthenticated', 'true');
        // App.tsx will navigate to Main
      } else {
        setFormError(
          'Check your email. We sent you a confirmation link. Open it to activate your account, then sign in.'
        );
        navigation.goBack();
      }
    } catch (error: unknown) {
      const message = isNetworkErrorMsg(error) ? NETWORK_ERROR_USER_MESSAGE : (error instanceof Error ? error.message : String(error));
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.cardShellWrapper}>
          <View style={styles.cardShell}>
            <View style={[styles.topStrip, styles.topStripSignUp]}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                accessibilityLabel="Go back"
                accessibilityRole="button"
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>

            <Card style={styles.panel}>
              <View style={styles.titleGroup}>
                <Text style={styles.title}>Sign up</Text>
                <Text style={styles.subtitle}>Let’s start your journey!</Text>
              </View>

              <Input
                label="Username"
                placeholder="Choose a username"
                value={username}
                onChangeText={setUsername}
              />

              <Input
                label="Email"
                placeholder="Enter Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />

              <Input
                label="Password"
                placeholder="Enter Password (min 6 chars, one uppercase)"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setConfirmPasswordError('');
                }}
                secureTextEntry
              />

              <Input
                label="Confirm Password"
                placeholder="Enter Password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setConfirmPasswordError('');
                }}
                secureTextEntry
              />

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

              <View style={styles.buttonContainer}>
                <Button
                  title="SIGN UP"
                  onPress={handleSignUp}
                  loading={loading}
                  disabled={loading}
                  accessibilityLabel="Create your CaviTour account"
                  style={styles.signUpButton}
                  textStyle={styles.signUpButtonText}
                />
              </View>

              <TouchableOpacity
                style={styles.googleButton}
                accessibilityRole="button"
                accessibilityLabel="Sign up with Google"
                onPress={() => {}}
              >
                <Ionicons name="logo-google" size={20} color={Colors.text.primary} />
                <Text style={styles.googleButtonText}>Sign up with Google</Text>
              </TouchableOpacity>

              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
                  <Text style={styles.signInLink}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.lg,
  },
  cardShellWrapper: {
    flex: 1,
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  cardShell: {
    width: '100%',
    maxWidth: 402,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  topStrip: {
    width: '100%',
    height: 239,
    paddingHorizontal: 21,
    paddingTop: 38,
  },
  topStripSignUp: {
    backgroundColor: Colors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  panel: {
    padding: Theme.spacing.xl,
    borderRadius: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  titleGroup: {
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    lineHeight: 28,
  },
  buttonContainer: {
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    alignItems: 'center',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  signInLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#c62828',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Theme.spacing.sm,
  },
  inlineErrorText: {
    color: '#c62828',
    fontSize: 13,
    fontWeight: '600',
    marginTop: -Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.text.light,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.lg,
  },
  googleButtonText: {
    marginLeft: Theme.spacing.sm,
    fontSize: 16,
    color: Colors.text.primary,
  },
  signUpButton: {
    width: 264,
    height: 48,
    minHeight: 48,
    borderRadius: 10,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  signUpButtonText: {
    fontSize: 14,
    letterSpacing: 0.15,
  },
});

export default SignUpScreen;
