import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackActions, useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/theme';
import { LogoWordmark } from '../components/LogoWordmark';

/** Slightly longer than before so the landing is easier to read */
const LANDING_MS = 3200;

/**
 * Brief Tara, Cavite! opening — mark + wordmark, then sign-in.
 * Shown on every app launch while logged out.
 */
const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const t = setTimeout(() => {
      navigation.dispatch(StackActions.replace('Auth'));
    }, LANDING_MS);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <LogoWordmark markSize={52} wordFontSize={42} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});

export default OnboardingScreen;
