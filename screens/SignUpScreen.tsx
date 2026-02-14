import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Theme } from '../constants/Theme';
import { Header } from '../components/Header';
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

  const handleSignUp = async () => {
    const trimmedEmail = email.trim();
    setConfirmPasswordError('');

    if (!trimmedEmail || !password || !confirmPassword) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    const trimmedUsername = username.trim() || trimmedEmail.split('@')[0];
    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert(
        'Invalid password',
        'Password must be at least 6 characters and contain at least one uppercase letter.'
      );
      return;
    }
    if (!hasUppercase(password)) {
      Alert.alert(
        'Invalid password',
        'Password must contain at least one uppercase letter.'
      );
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
        Alert.alert(
          'Check your email',
          'We sent you a confirmation link. Open it to activate your account, then sign in.'
        );
        navigation.goBack();
      }
    } catch (error: unknown) {
      const message = isNetworkErrorMsg(error) ? NETWORK_ERROR_USER_MESSAGE : (error instanceof Error ? error.message : String(error));
      Alert.alert('Sign up failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Sign up" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Card style={styles.card}>
          <Text style={styles.title}>Sign up</Text>
          <Text style={styles.subtitle}>
            Create your account to save your favorite routes and get real-time terminal updates.
          </Text>

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
            placeholder="Retype password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setConfirmPasswordError('');
            }}
            secureTextEntry
          />
          {confirmPasswordError ? (
            <Text style={styles.errorText}>{confirmPasswordError}</Text>
          ) : null}

          <View style={styles.buttonContainer}>
            <Button
              title="SIGN UP"
              onPress={handleSignUp}
              loading={loading}
              disabled={loading}
            />
          </View>

          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.signInLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.lg,
  },
  card: {
    padding: Theme.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: Theme.spacing.xl,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
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
    marginTop: -Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
});

export default SignUpScreen;
