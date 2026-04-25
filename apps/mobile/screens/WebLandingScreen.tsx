import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Theme } from '../constants/theme';

const WebLandingScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../assets/images/cavitour-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')} style={styles.logInButton}>
            <Text style={styles.logInText}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={styles.signUpButton}>
            <Text style={styles.signUpButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.hero}>
        <Text style={styles.headline}>
          Your Guide to Exploring <Text style={styles.headlineGreen}>Cavite</Text>
        </Text>
        <Text style={styles.subtitle}>
          Your go to tourist guide for discovering Cavite's destinations, routes, food spots, and
          hidden gems all in one app.
        </Text>
        <View style={styles.ctaRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate('SignIn')}
            style={styles.primaryCta}
          >
            <Text style={styles.primaryCtaText}>Start Exploring</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryCta}>
            <Text style={styles.secondaryCtaText}>Download the App</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
  },
  logo: {
    height: 36,
    width: 140,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.lg,
  },
  logInButton: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
  },
  logInText: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  signUpButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Colors.accent,
  },
  signUpButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
  hero: {
    flex: 1,
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: 48,
    maxWidth: 520,
  },
  headline: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Theme.spacing.md,
    lineHeight: 44,
  },
  headlineGreen: {
    color: Colors.accent,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.text.secondary,
    lineHeight: 26,
    marginBottom: Theme.spacing.xl,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    flexWrap: 'wrap',
  },
  primaryCta: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Colors.accent,
  },
  primaryCtaText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  secondaryCta: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.text.light,
  },
  secondaryCtaText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
});

export default WebLandingScreen;
