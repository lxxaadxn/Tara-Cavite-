import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
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

const SignInScreen: React.FC = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoBackToOnboarding = async () => {
    await AsyncStorage.setItem('onboardingComplete', 'false');
    // App.tsx polling will switch to Onboarding stack
  };

  const handleSignIn = async () => {
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await withAuthRetry(() =>
        supabase.auth.signInWithPassword({ email: trimmedEmail, password })
      );
      if (error) throw error;
      await AsyncStorage.setItem('isAuthenticated', 'true');
      // App.tsx polling will pick up the change and navigate to Main
    } catch (error: unknown) {
      const message = isNetworkErrorMsg(error) ? NETWORK_ERROR_USER_MESSAGE : (error instanceof Error ? error.message : String(error));
      Alert.alert('Sign in failed', message);
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
        <View style={styles.cardWrapper}>
          <Card style={styles.card}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/images/cavitour-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.titleGroup}>
              <Text style={styles.title}>Sign in</Text>
              <Text style={styles.subtitle}>
                Welcome back! Sign in to resume your journey.
              </Text>
            </View>

            <Input
              label="Email"
              placeholder="Enter Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <Input
              label="Password"
              placeholder="Enter Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <View style={styles.buttonContainer}>
              <Button
                title="SIGN IN"
                onPress={handleSignIn}
                loading={loading}
                disabled={loading}
                accessibilityLabel="Sign in to your CaviTour account"
              />
            </View>

            <View style={styles.googleButton}>
              <Ionicons name="logo-google" size={20} color={Colors.text.primary} />
              <Text style={styles.googleButtonText}>Log in with Google</Text>
            </View>

            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Don’t have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp' as never)}>
                <Text style={styles.signUpLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </Card>
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
  cardWrapper: {
    flex: 1,
    marginTop: 40,
    alignItems: 'center',
  },
  card: {
    padding: Theme.spacing.xl,
    borderRadius: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  logo: {
    width: 140,
    height: 40,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Theme.spacing.lg,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 14,
  },
  buttonContainer: {
    marginBottom: Theme.spacing.md,
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
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  signUpLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SignInScreen;
