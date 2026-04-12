import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  CommonActions,
  createNavigationContainerRef,
  getFocusedRouteNameFromRoute,
  NavigationContainer,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { JamIcon } from './components/JamIcon';
import { Colors } from './constants/Colors';
import { LaunchAuthContext } from './contexts/LaunchAuthContext';
import { isStoredSessionInvalidError } from './lib/authHelpers';
import { getMainFloatingTabBarStyle } from './lib/mainTabBarStyle';
import { supabase } from './lib/supabase';

// Keep native splash (CaviTour logo) visible until app is ready
SplashScreen.preventAutoHideAsync();

// Screens
import DirectionsScreen from './screens/DirectionsScreen';
import HistoryScreen from './screens/HistoryScreen';
import HomeScreen from './screens/HomeScreen';
import ItinerariesScreen from './screens/ItinerariesScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import MapScreen from './screens/MapScreen';
import MapCommuteDetailScreen from './screens/MapCommuteDetailScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import PlaceDetailScreen from './screens/PlaceDetailScreen';
import AboutEstablishmentScreen from './screens/AboutEstablishmentScreen';
import FullRouteMapScreen from './screens/FullRouteMapScreen';
import PreferencesScreen from './screens/PreferencesScreen';
import ProfileScreen from './screens/ProfileScreen';
import SavedListScreen from './screens/SavedListScreen';
import SavedListDetailScreen from './screens/SavedListDetailScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import TerminalDetailScreen from './screens/TerminalDetailScreen';
import TerminalsScreen from './screens/TerminalsScreen';
import UserDetailsScreen from './screens/UserDetailsScreen';
import NewListScreen from './screens/NewListScreen';
import CreateItineraryScreen from './screens/CreateItineraryScreen';
import ItineraryDetailScreen from './screens/ItineraryDetailScreen';
import CategoriesScreen from './screens/CategoriesScreen';

const Stack = createStackNavigator();
const navigationRef = createNavigationContainerRef();
const Tab = createBottomTabNavigator();

// Auth Stack
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { flex: 1, backgroundColor: Colors.white },
    }}
  >
    <Stack.Screen name="SignIn" component={SignInScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
  </Stack.Navigator>
);

// Home Stack
const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen name="Terminals" component={TerminalsScreen} />
    <Stack.Screen name="TerminalDetail" component={TerminalDetailScreen} />
    <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} />
    <Stack.Screen name="AboutEstablishment" component={AboutEstablishmentScreen} />
    <Stack.Screen name="Directions" component={DirectionsScreen} />
    <Stack.Screen name="FullRouteMap" component={FullRouteMapScreen} />
    <Stack.Screen name="Categories" component={CategoriesScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

// Itineraries Stack
const ItinerariesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ItinerariesMain" component={ItinerariesScreen} />
    <Stack.Screen name="History" component={HistoryScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} />
    <Stack.Screen name="AboutEstablishment" component={AboutEstablishmentScreen} />
    <Stack.Screen name="Directions" component={DirectionsScreen} />
    <Stack.Screen name="FullRouteMap" component={FullRouteMapScreen} />
    <Stack.Screen name="NewList" component={NewListScreen} />
    <Stack.Screen name="CreateItinerary" component={CreateItineraryScreen} />
    <Stack.Screen name="ItineraryDetail" component={ItineraryDetailScreen} />
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
    <Stack.Screen name="SavedListDetail" component={SavedListDetailScreen} />
    <Stack.Screen name="NewList" component={NewListScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

// Terminals Stack
const TerminalsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TerminalsMain" component={TerminalsScreen} />
    <Stack.Screen name="TerminalDetail" component={TerminalDetailScreen} />
    <Stack.Screen name="Directions" component={DirectionsScreen} />
    <Stack.Screen name="FullRouteMap" component={FullRouteMapScreen} />
  </Stack.Navigator>
);

// Map Stack
const MapStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MapMain" component={MapScreen} />
    <Stack.Screen name="MapCommuteDetail" component={MapCommuteDetailScreen} />
    <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} />
    <Stack.Screen name="AboutEstablishment" component={AboutEstablishmentScreen} />
    <Stack.Screen name="Directions" component={DirectionsScreen} />
    <Stack.Screen name="FullRouteMap" component={FullRouteMapScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

// Main Tabs Navigator (Figma: white pill bar, green active / teal inactive icons)
function MainTabs() {
  const insets = useSafeAreaInsets();
  const mainTabBarStyle = getMainFloatingTabBarStyle(insets.bottom);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const ionicon =
            route.name === 'Dashboard'
              ? 'home-outline'
              : route.name === 'Itineraries'
                ? 'document-text-outline'
                : route.name === 'Map'
                  ? 'map-outline'
                  : route.name === 'Terminals'
                    ? 'car-outline'
                    : 'person-outline';
          return <JamIcon ionicon={ionicon} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.primary,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: mainTabBarStyle,
        tabBarItemStyle: {
          height: 40,
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={({ route }) => {
          const focused = getFocusedRouteNameFromRoute(route) ?? 'HomeMain';
          const hideTab =
            focused === 'Notifications' ||
            focused === 'TerminalDetail' ||
            focused === 'PlaceDetail' ||
            focused === 'AboutEstablishment' ||
            focused === 'Directions' ||
            focused === 'FullRouteMap';
          return {
            tabBarStyle: hideTab ? { display: 'none' } : mainTabBarStyle,
          };
        }}
      />
      <Tab.Screen
        name="Itineraries"
        component={ItinerariesStack}
        options={({ route }) => {
          const focused = getFocusedRouteNameFromRoute(route) ?? 'ItinerariesMain';
          const hideTab =
            focused === 'Notifications' ||
            focused === 'PlaceDetail' ||
            focused === 'AboutEstablishment' ||
            focused === 'Directions' ||
            focused === 'NewList' ||
            focused === 'CreateItinerary' ||
            focused === 'ItineraryDetail' ||
            focused === 'History';
          return {
            tabBarStyle: hideTab ? { display: 'none' } : mainTabBarStyle,
          };
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapStack}
        options={({ route }) => {
          const focused = getFocusedRouteNameFromRoute(route) ?? 'MapMain';
          const hideTab =
            focused === 'Notifications' ||
            focused === 'PlaceDetail' ||
            focused === 'AboutEstablishment' ||
            focused === 'Directions' ||
            focused === 'FullRouteMap' ||
            focused === 'MapCommuteDetail';
          return {
            tabBarStyle: hideTab ? { display: 'none' } : mainTabBarStyle,
          };
        }}
      />
      <Tab.Screen
        name="Terminals"
        component={TerminalsStack}
        options={({ route }) => {
          const focused = getFocusedRouteNameFromRoute(route) ?? 'TerminalsMain';
          const hideTab =
            focused === 'TerminalDetail' ||
            focused === 'Directions' ||
            focused === 'FullRouteMap';
          return {
            tabBarStyle: hideTab ? { display: 'none' } : mainTabBarStyle,
          };
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={({ route }) => {
          const focused = getFocusedRouteNameFromRoute(route) ?? 'ProfileMain';
          const hideTab =
            focused === 'Notifications' ||
            focused === 'UserDetails' ||
            focused === 'History' ||
            focused === 'SavedList' ||
            focused === 'SavedListDetail' ||
            focused === 'NewList' ||
            focused === 'Preferences';
          return {
            tabBarStyle: hideTab ? { display: 'none' } : mainTabBarStyle,
          };
        }}
      />
    </Tab.Navigator>
  );
}

// Pre-navigation load: match landing (white + logo) until fonts and storage are ready
const bundlingPageStyle = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 220,
    height: 60,
  },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Pacifico_400Regular,
  });
  const [authHydrated, setAuthHydrated] = useState(false);
  const [navigationReady, setNavigationReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [unauthedStackKey, setUnauthedStackKey] = useState(0);
  const didClearAuthRef = useRef(false);
  /** After Welcome timer, allow auth listener to reset to Main (avoids skipping landing when session hydrates). */
  const landingGatePassedRef = useRef(false);
  /** Skip first post-ready effect so initial route stays Welcome; later auth flips reset Main / Auth. */
  const skipInitialAuthNavRef = useRef(true);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const init = async () => {
      await checkAuthStatus();
      setAuthHydrated(true);
      interval = setInterval(() => {
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
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session) {
          didClearAuthRef.current = false;
          await AsyncStorage.setItem('isAuthenticated', 'true');
          setIsAuthenticated(true);
          return;
        }
        if (error && isStoredSessionInvalidError(error) && !didClearAuthRef.current) {
          didClearAuthRef.current = true;
          try {
            await supabase.auth.signOut();
          } catch {
            // Best-effort; SDK may have already cleared storage.
          }
        }
        await AsyncStorage.setItem('isAuthenticated', 'false');
        setIsAuthenticated(false);
      } catch {
        if (!didClearAuthRef.current) {
          didClearAuthRef.current = true;
          try {
            await supabase.auth.signOut();
          } catch {
            // Ignore; we only want to clear local auth state best-effort.
          }
        }
        setIsAuthenticated(false);
      }
    };

    updateAuthFromSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isSignedIn = !!session;
      await AsyncStorage.setItem('isAuthenticated', isSignedIn ? 'true' : 'false');
      setIsAuthenticated(isSignedIn);
      if (event === 'SIGNED_OUT') {
        setUnauthedStackKey((k) => k + 1);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session) {
        didClearAuthRef.current = false;
        setIsAuthenticated(true);
        return;
      }
      if (error && isStoredSessionInvalidError(error)) {
        if (!didClearAuthRef.current) {
          didClearAuthRef.current = true;
          try {
            await supabase.auth.signOut();
          } catch {
            // Best-effort cleanup only.
          }
        }
        await AsyncStorage.setItem('isAuthenticated', 'false');
        setIsAuthenticated(false);
        return;
      }
      if (error) {
        // Transient refresh failure: keep optimistic flag until the next poll succeeds.
        const value = await AsyncStorage.getItem('isAuthenticated');
        setIsAuthenticated(value === 'true');
        return;
      }
      await AsyncStorage.setItem('isAuthenticated', 'false');
      setIsAuthenticated(false);
    } catch {
      if (!didClearAuthRef.current) {
        didClearAuthRef.current = true;
        try {
          await supabase.auth.signOut();
        } catch {
          // Best-effort cleanup only.
        }
      }
      setIsAuthenticated(false);
    }
  };

  // Hide native splash once fonts + first auth read are ready
  useEffect(() => {
    if (fontsLoaded && authHydrated) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authHydrated]);

  useEffect(() => {
    if (!fontsLoaded || !authHydrated || !navigationReady) return;
    if (!navigationRef.isReady()) return;
    if (skipInitialAuthNavRef.current) {
      skipInitialAuthNavRef.current = false;
      return;
    }
    if (!isAuthenticated) {
      navigationRef.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Auth' }] })
      );
      return;
    }
    if (!landingGatePassedRef.current) {
      return;
    }
    navigationRef.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Main' }] })
    );
  }, [isAuthenticated, fontsLoaded, authHydrated, navigationReady]);

  if (!fontsLoaded) {
    return null;
  }

  // Bundling page: always use our logo from assets/images/cavitour-logo.png
  if (!authHydrated) {
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

  return (
    <SafeAreaProvider>
      <LaunchAuthContext.Provider value={{ isAuthenticated }}>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => setNavigationReady(true)}
        >
          <Stack.Navigator
            initialRouteName="Welcome"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Welcome">
              {() => (
                <OnboardingScreen
                  onLandingTimerComplete={() => {
                    landingGatePassedRef.current = true;
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Auth" options={{ headerShown: false }}>
              {() => <AuthStack key={unauthedStackKey} />}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </LaunchAuthContext.Provider>
    </SafeAreaProvider>
  );
}
