import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Theme } from '../constants/Theme';
import { Header } from '../components/Header';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

const SignUpScreen: React.FC = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignUp = async () => {
    try {
      await AsyncStorage.setItem('isAuthenticated', 'true');
      // Navigation handled by App.tsx
    } catch (error) {
      console.error('Error signing up:', error);
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

          <Input
            label="Confirm Password"
            placeholder="retype password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <View style={styles.buttonContainer}>
            <Button title="SIGN UP" onPress={handleSignUp} />
          </View>

          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <Text
              style={styles.signInLink}
              onPress={() => navigation.goBack()}
            >
              Sign in
            </Text>
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
});

export default SignUpScreen;
