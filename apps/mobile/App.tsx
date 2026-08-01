import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute, NavigationContainer } from '@react-navigation/native';
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
import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNavigationContainerRef } from '@react-navigation/native';

import { JamIcon } from './components/JamIcon';
import { AuthRecoveryProvider } from './context/AuthRecoveryContext';
import { Colors } from './constants/Colors';
import { applyOAuthCallbackFromUrl, isOAuthCallbackUrl } from './lib/authOAuth';
import { applyPasswordRecoveryFromUrl, isPasswordRecoveryUrl } from './lib/authRecoveryDeepLink';
import { isStoredSessionInvalidError } from './lib/authHelpers';
import { isSupabaseConfigured, supabase } from './lib/supabase';

// Keep native splash (Tara, Cavite! logo) visible until app is ready
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
import EstablishmentsBrowseScreen from './screens/EstablishmentsBrowseScreen';
import PreferencesScreen from './screens/PreferencesScreen';
import ProfileScreen from './screens/ProfileScreen';
import SavedListScreen from './screens/SavedListScreen';
import SavedListDetailScreen from './screens/SavedListDetailScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import TerminalDetailScreen from './screens/TerminalDetailScreen';
import TerminalsScreen from './screens/TerminalsScreen';
import UserDetailsScreen from './screens/UserDetailsScreen';
import NewListScreen from './screens/NewListScreen';
import CreateItineraryScreen from './screens/CreateItineraryScreen';
import CategoriesScreen from './screens/CategoriesScreen';
import ItineraryDetailScreen from './screens/ItineraryDetailScreen';
import FullRouteMapScreen from './screens/FullRouteMapScreen';
import { LocationPermissionModal, markMobileLocationPromptPending, clearMobileLocationPromptDismissed } from './components/LocationPermissionModal';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
/** Keep false so Google/email sessions persist and OAuth callbacks are not cleared on launch. */
const REQUIRE_SIGN_IN_ON_EACH_LAUNCH = false;

const navigationRef = createNavigationContainerRef();

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
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </Stack.Navigator>
);

/**
 * Post-bundle startup (landing) → then sign-in. `stackKey` remounts this navigator so we never
 * resume straight on Auth after sign-out or a stale navigation state.
 */
function UnauthedFlow({ stackKey }: { stackKey: number }) {
  return (
    <Stack.Navigator
      key={stackKey}
      screenOptions={{ headerShown: false }}
      initialRouteName="Landing"
    >
      <Stack.Screen name="Landing" component={OnboardingScreen} />
      <Stack.Screen name="Auth" component={AuthStack} />
    </Stack.Navigator>
  );
}

// Home Stack
const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen name="Terminals" component={TerminalsScreen} />
    <Stack.Screen name="TerminalDetail" component={TerminalDetailScreen} />
    <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} />
    <Stack.Screen name="AboutEstablishment" component={AboutEstablishmentScreen} />
    <Stack.Screen name="EstablishmentsBrowse" component={EstablishmentsBrowseScreen} />
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
    <Stack.Screen name="ItineraryDetail" component={ItineraryDetailScreen} />
    <Stack.Screen name="History" component={HistoryScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} />
    <Stack.Screen name="AboutEstablishment" component={AboutEstablishmentScreen} />
    <Stack.Screen name="EstablishmentsBrowse" component={EstablishmentsBrowseScreen} />
    <Stack.Screen name="Directions" component={DirectionsScreen} />
    <Stack.Screen name="FullRouteMap" component={FullRouteMapScreen} />
    <Stack.Screen name="NewList" component={NewListScreen} />
    <Stack.Screen name="CreateItinerary" component={CreateItineraryScreen} />
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
    <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} />
    <Stack.Screen name="AboutEstablishment" component={AboutEstablishmentScreen} />
    <Stack.Screen name="EstablishmentsBrowse" component={EstablishmentsBrowseScreen} />
    <Stack.Screen name="Directions" component={DirectionsScreen} />
    <Stack.Screen name="FullRouteMap" component={FullRouteMapScreen} />
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
    <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} />
    <Stack.Screen name="AboutEstablishment" component={AboutEstablishmentScreen} />
    <Stack.Screen name="EstablishmentsBrowse" component={EstablishmentsBrowseScreen} />
    <Stack.Screen name="TerminalDetail" component={TerminalDetailScreen} />
    <Stack.Screen name="Directions" component={DirectionsScreen} />
    <Stack.Screen name="MapCommuteDetail" component={MapCommuteDetailScreen} />
    <Stack.Screen name="FullRouteMap" component={FullRouteMapScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

// Main Tabs Navigator (Figma: white pill bar, green active / teal inactive icons)
function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);
  const mainTabBarStyle = {
    position: 'absolute' as const,
    left: 16,
    right: 16,
    bottom: bottomPad,
    height: 64 + Math.min(insets.bottom, 8),
    paddingTop: 8,
    paddingBottom: Math.min(insets.bottom, 12) || 8,
    borderRadius: 30,
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(122, 120, 120, 0.5)',
    elevation: 0,
    shadowOpacity: 0,
  };

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
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Poppins_500Medium',
          marginBottom: 2,
        },
        tabBarStyle: mainTabBarStyle,
        tabBarItemStyle: {
          height: 44,
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
            focused === 'Directions' ||
            focused === 'FullRouteMap' ||
            focused === 'AboutEstablishment' ||
            focused === 'PlaceDetail';
          return {
            tabBarLabel: 'Home',
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
            focused === 'FullRouteMap' ||
            focused === 'NewList' ||
            focused === 'CreateItinerary';
          return {
            tabBarLabel: 'Itineraries',
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
            focused === 'TerminalDetail';
          return {
            tabBarLabel: 'Map',
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
            focused === 'TerminalDetail' || focused === 'Directions' || focused === 'FullRouteMap';
          return {
            tabBarLabel: 'Terminals',
            tabBarStyle: hideTab ? { display: 'none' } : mainTabBarStyle,
          };
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarStyle: { display: 'none' },
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [unauthedStackKey, setUnauthedStackKey] = useState(0);
  const [blockMainForRecovery, setBlockMainForRecovery] = useState(false);
  const didClearAuthRef = useRef(false);
  const pendingRecoveryNavRef = useRef(false);

  const navigateToRecoveryScreen = useCallback(() => {
    requestAnimationFrame(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Unauthed' as never, {
          screen: 'Auth',
          params: { screen: 'ResetPassword' },
        } as never);
      }
    });
  }, []);

  const endPasswordRecoveryFlow = useCallback(() => {
    setBlockMainForRecovery(false);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    const init = async () => {
      let skipStartupSignOut = false;
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && isPasswordRecoveryUrl(initialUrl)) {
          setBlockMainForRecovery(true);
          const ok = await applyPasswordRecoveryFromUrl(supabase, initialUrl);
          if (ok) {
            skipStartupSignOut = true;
            pendingRecoveryNavRef.current = true;
          }
        } else if (initialUrl && isOAuthCallbackUrl(initialUrl)) {
          const ok = await applyOAuthCallbackFromUrl(supabase, initialUrl);
          if (ok) {
            skipStartupSignOut = true;
            await AsyncStorage.setItem('isAuthenticated', 'true');
            setIsAuthenticated(true);
          }
        } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const webUrl = window.location.href;
          if (isOAuthCallbackUrl(webUrl)) {
            const ok = await applyOAuthCallbackFromUrl(supabase, webUrl);
            if (ok) {
              skipStartupSignOut = true;
              await AsyncStorage.setItem('isAuthenticated', 'true');
              setIsAuthenticated(true);
              window.history.replaceState({}, '', window.location.pathname || '/');
            }
          }
        }
      } catch {
        // Ignore invalid recovery URLs on cold start.
      }

      if (REQUIRE_SIGN_IN_ON_EACH_LAUNCH && isSupabaseConfigured && !skipStartupSignOut) {
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore startup cleanup errors; app will still route to auth flow.
        }
        await AsyncStorage.setItem('isAuthenticated', 'false');
        setIsAuthenticated(false);
        setUnauthedStackKey((k) => k + 1);
      }
      await checkAuthStatus();
      setAuthHydrated(true);
      if (isSupabaseConfigured) {
        interval = setInterval(() => {
          checkAuthStatus();
        }, 500);
      }
    };

    void init();

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (isOAuthCallbackUrl(url)) {
        void (async () => {
          const ok = await applyOAuthCallbackFromUrl(supabase, url);
          if (ok) {
            await AsyncStorage.setItem('isAuthenticated', 'true');
            setIsAuthenticated(true);
            await markMobileLocationPromptPending();
            try {
              const { data } = await supabase.auth.getSession();
              setSessionUserId(data.session?.user?.id ?? null);
            } catch {
              /* ignore */
            }
          }
        })();
        return;
      }
      if (!isPasswordRecoveryUrl(url)) {
        return;
      }
      void (async () => {
        setBlockMainForRecovery(true);
        const ok = await applyPasswordRecoveryFromUrl(supabase, url);
        if (ok) {
          navigateToRecoveryScreen();
        }
      })();
    });
    return () => sub.remove();
  }, [navigateToRecoveryScreen]);

  // Sync auth state with Supabase session (persisted across app restarts)
  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const updateAuthFromSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session) {
          didClearAuthRef.current = false;
          await AsyncStorage.setItem('isAuthenticated', 'true');
          setIsAuthenticated(true);
          setSessionUserId(session.user?.id ?? null);
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
        setSessionUserId(null);
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
        setSessionUserId(null);
      }
    };

    updateAuthFromSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setBlockMainForRecovery(true);
        navigateToRecoveryScreen();
      }
      const isSignedIn = !!session;
      await AsyncStorage.setItem('isAuthenticated', isSignedIn ? 'true' : 'false');
      setIsAuthenticated(isSignedIn);
      setSessionUserId(session?.user?.id ?? null);
      if (event === 'SIGNED_IN' && session?.user?.id) {
        await markMobileLocationPromptPending();
      }
      if (event === 'SIGNED_OUT') {
        await clearMobileLocationPromptDismissed();
        setUnauthedStackKey((k) => k + 1);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigateToRecoveryScreen]);

  const checkAuthStatus = async () => {
    if (!isSupabaseConfigured) {
      await AsyncStorage.setItem('isAuthenticated', 'false');
      setIsAuthenticated(false);
      return;
    }
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session) {
        didClearAuthRef.current = false;
        setIsAuthenticated(true);
        setSessionUserId(session.user?.id ?? null);
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
        setSessionUserId(null);
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

  const showMainTabs = isAuthenticated && !blockMainForRecovery;

  // Logged out: Unauthed stack always starts on Landing, then Sign In. Logged in: main tabs.
  return (
    <SafeAreaProvider>
      <AuthRecoveryProvider endPasswordRecoveryFlow={endPasswordRecoveryFlow}>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => {
            if (pendingRecoveryNavRef.current) {
              navigateToRecoveryScreen();
              pendingRecoveryNavRef.current = false;
            }
          }}
        >
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!showMainTabs ? (
              <Stack.Screen name="Unauthed" options={{ headerShown: false }}>
                {() => <UnauthedFlow stackKey={unauthedStackKey} />}
              </Stack.Screen>
            ) : (
              <Stack.Screen name="Main" component={MainTabs} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
        <LocationPermissionModal
          isAuthenticated={showMainTabs}
          userId={sessionUserId}
        />
      </AuthRecoveryProvider>
    </SafeAreaProvider>
  );
}
