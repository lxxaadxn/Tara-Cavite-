import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
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

export default function App() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    let interval: any;

    const init = async () => {
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
      setIsOnboardingComplete(value === 'true');
    } catch (error) {
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

  if (isOnboardingComplete === null) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
          <Image
            source={require('./assets/images/cavitour-logo.png')}
            style={{ width: 200, height: 60, resizeMode: 'contain' }}
          />
        </View>
      </SafeAreaProvider>
    );
  }

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
