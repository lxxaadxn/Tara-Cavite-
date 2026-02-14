import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors } from './constants/Colors';

// Screens
import OnboardingScreen from './screens/OnboardingScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import PlaceDetailScreen from './screens/PlaceDetailScreen';
import DirectionsScreen from './screens/DirectionsScreen';
import ProfileScreen from './screens/ProfileScreen';
import UserDetailsScreen from './screens/UserDetailsScreen';
import PreferencesScreen from './screens/PreferencesScreen';
import HistoryScreen from './screens/HistoryScreen';
import SavedListScreen from './screens/SavedListScreen';
import NotificationsScreen from './screens/NotificationsScreen';

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
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.text.light,
      headerShown: false,
      tabBarStyle: {
        backgroundColor: Colors.background,
        borderTopWidth: 1,
        borderTopColor: Colors.text.light,
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
      // Always start a fresh session when the app loads in Expo Go:
      // - show onboarding first
      // - require login again before entering the main app
      try {
        await AsyncStorage.multiRemove(['onboardingComplete', 'isAuthenticated']);
      } catch {
        // ignore errors here; we'll fall back to default state below
      }

      await checkOnboardingStatus();
      await checkAuthStatus();

      // Keep polling storage so SignIn/SignUp and logout changes are picked up
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
      const value = await AsyncStorage.getItem('isAuthenticated');
      setIsAuthenticated(value === 'true');
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  if (isOnboardingComplete === null) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: Colors.primary }}>Loading...</Text>
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
