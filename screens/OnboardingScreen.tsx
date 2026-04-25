import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackActions, useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/theme';

/** Slightly longer than before so the landing is easier to read */
const LANDING_MS = 3200;

/**
 * Brief CaviTour landing — wordmark matches dashboard Header; then navigates to sign-in.
 * Shown on every app launch while logged out (no AsyncStorage flag — see App Unauthed stack).
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
        <View
          style={styles.wordmarkRow}
          accessible
          accessibilityRole="header"
          accessibilityLabel="CaviTour"
        >
          <Text style={styles.wordmarkC}>C</Text>
          <Text style={styles.wordmarkAvi}>avi</Text>
          <Text style={styles.wordmarkTour}>Tour</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  wordmarkC: {
    fontFamily: 'Pacifico_400Regular',
    fontSize: 42,
    lineHeight: 50,
    color: Colors.accent,
  },
  wordmarkAvi: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 42,
    lineHeight: 50,
    color: Colors.accent,
  },
  wordmarkTour: {
    fontFamily: 'Pacifico_400Regular',
    fontSize: 42,
    lineHeight: 50,
    color: Colors.primary,
  },
});

export default OnboardingScreen;
