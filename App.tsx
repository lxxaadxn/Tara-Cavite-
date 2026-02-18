import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from './constants/Colors';
import { supabase } from './lib/supabase';

// Keep native splash (CaviTour logo) visible until app is ready
SplashScreen.preventAutoHideAsync();

// Screens
import DirectionsScreen from './screens/DirectionsScreen';
import HistoryScreen from './screens/HistoryScreen';
import HomeScreen from './screens/HomeScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import PlaceDetailScreen from './screens/PlaceDetailScreen';
import PreferencesScreen from './screens/PreferencesScreen';
import ProfileScreen from './screens/ProfileScreen';
import SavedListScreen from './screens/SavedListScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import TerminalDetailScreen from './screens/TerminalDetailScreen';
import TerminalsScreen from './screens/TerminalsScreen';
import UserDetailsScreen from './screens/UserDetailsScreen';
import NewListScreen from './screens/NewListScreen';
import CategoriesScreen from './screens/CategoriesScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SignIn" component={SignInScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
  </Stack.Navigator>
);

// Home Stack
const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen name="Terminals" component={TerminalsScreen} />
    <Stack.Screen name="TerminalDetail" component={TerminalDetailScreen} />
    <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} />
    <Stack.Screen name="Directions" component={DirectionsScreen} />
    <Stack.Screen name="Categories" component={CategoriesScreen} />
  </Stack.Navigator>
);

// Saved Stack (placeholder for now)
const SavedStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SavedMain" component={HomeScreen} />
  </Stack.Navigator>
);

// Profile Stack
const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} />
    <Stack.Screen name="UserDetails" component={UserDetailsScreen} />
    <Stack.Screen name="Preferences" component={PreferencesScreen} />
    <Stack.Screen name="History" component={HistoryScreen} />
    <Stack.Screen name="SavedList" component={SavedListScreen} />
    <Stack.Screen name="NewList" component={NewListScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

// Main Tabs Navigator
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap;

        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Saved') {
          iconName = focused ? 'bookmark' : 'bookmark-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        } else {
          iconName = 'help-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: Colors.white,
      tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
      headerShown: false,
      tabBarStyle: {
        backgroundColor: Colors.primary,
        borderTopWidth: 0,
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeStack} />
    <Tab.Screen name="Saved" component={SavedStack} />
    <Tab.Screen name="Profile" component={ProfileStack} />
  </Tab.Navigator>
);

// Bundling page: our logo from assets/images/cavitour-logo.png
const bundlingPageStyle = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 220,
    height: 60,
  },
});

export default function App() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    let interval: any;

    const init = async () => {
      // For development / QR-code launches, always start from onboarding.
      // This clears any previous onboarding flag on each fresh app start,
      // but handleGetStarted() can still mark it true for this session.
      await AsyncStorage.removeItem('onboardingComplete');
      await checkOnboardingStatus();
      await checkAuthStatus();
      // Keep polling so SignIn/SignUp and logout are picked up
      interval = setInterval(() => {
        checkOnboardingStatus();
        checkAuthStatus();
      }, 500);
    };

    init();

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  // Sync auth state with Supabase session (persisted across app restarts)
  useEffect(() => {
    const updateAuthFromSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const isSignedIn = !!session;
        await AsyncStorage.setItem('isAuthenticated', isSignedIn ? 'true' : 'false');
        setIsAuthenticated(isSignedIn);
      } catch {
        setIsAuthenticated(false);
      }
    };

    updateAuthFromSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const isSignedIn = !!session;
      await AsyncStorage.setItem('isAuthenticated', isSignedIn ? 'true' : 'false');
      setIsAuthenticated(isSignedIn);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const value = await AsyncStorage.getItem('onboardingComplete');
      // Only treat as complete when explicitly 'true'. Missing or any other value → show onboarding first.
      setIsOnboardingComplete(value === 'true');
    } catch {
      // On error, show onboarding so we always land on onboarding after bundling before sign in
      setIsOnboardingComplete(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        return;
      }
      const value = await AsyncStorage.getItem('isAuthenticated');
      setIsAuthenticated(value === 'true');
    } catch {
      setIsAuthenticated(false);
    }
  };

  // Hide native splash once we know initial state (show our in-app loading or main UI)
  useEffect(() => {
    if (isOnboardingComplete !== null) {
      SplashScreen.hideAsync();
    }
  }, [isOnboardingComplete]);

  // Bundling page: always use our logo from assets/images/cavitour-logo.png
  if (isOnboardingComplete === null) {
    return (
      <SafeAreaProvider>
        <View style={bundlingPageStyle.container}>
          <Image
            source={require('./assets/images/cavitour-logo.png')}
            style={bundlingPageStyle.logo}
            resizeMode="contain"
          />
        </View>
      </SafeAreaProvider>
    );
  }

  // 2) Always Onboarding first after bundling, then Sign In/Sign Up, then Main (never Auth before Onboarding)
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isOnboardingComplete ? (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          ) : !isAuthenticated ? (
            <Stack.Screen name="Auth" component={AuthStack} />
          ) : (
            <Stack.Screen name="Main" component={MainTabs} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
