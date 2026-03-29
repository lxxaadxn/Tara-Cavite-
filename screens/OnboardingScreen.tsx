import React, { useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/theme';
import { LaunchAuthContext } from '../contexts/LaunchAuthContext';

/** Slightly longer than before so the landing is easier to read */
const LANDING_MS = 3200;

/**
 * Brief CaviTour landing — wordmark matches dashboard Header; then Main (signed in) or sign-in flow.
 * Shown on every cold start for everyone (see App root stack initialRouteName).
 */
const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isAuthenticated } = useContext(LaunchAuthContext);
  const authedRef = useRef(isAuthenticated);
  authedRef.current = isAuthenticated;

  useEffect(() => {
    const t = setTimeout(() => {
      navigation.replace(authedRef.current ? 'Main' : 'Unauthed');
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
