import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { User } from '@supabase/supabase-js';
import React, { useContext, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JamIcon } from '../components/JamIcon';
import type { JamIconName } from '../lib/jamSvgMap';
import { Colors } from '../constants/theme';
import { supabase } from '../lib/supabase';

const HEADER_GREEN = '#7EA00E';
const MENU_TEXT = '#241D13';
const LOGOUT_TEXT = '#213502';
const EMAIL_MUTED = '#AFA7A7';
const ICON_TEAL = '#1F4F59';
const AVATAR_SIZE = 136;
const AVATAR_HALF = AVATAR_SIZE / 2;
/** Extra green below title before the curved bottom / avatar overlap */
const HEADER_SPACE_BELOW_TITLE = 40;
/** Extends the green block further down (beyond half-avatar overlap) */
const HEADER_EXTEND_PAST_AVATAR = 40;
/** Extra overlap into the green (larger = avatar sits higher on screen) */
const AVATAR_PULLUP = 45;

const defaultAvatar = require('../assets/images/profile-settings-avatar.png');

interface MenuItem {
  id: string;
  title: string;
  icon: JamIconName;
  screen: string;
}

const menuItems: MenuItem[] = [
  { id: '1', title: 'User Details', icon: 'user', screen: 'UserDetails' },
  { id: '2', title: 'History', icon: 'clock', screen: 'History' },
  { id: '3', title: 'Saved list', icon: 'bookmark', screen: 'SavedList' },
  { id: '4', title: 'Preferences', icon: 'cog', screen: 'Preferences' },
];

const menuCardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  android: { elevation: 3 },
  default: {},
});

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('Username');

  const loadUser = async () => {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    setUser(u);

    if (u) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', u.id)
        .single();

      const name =
        profile?.username ||
        (u.user_metadata?.username as string) ||
        u.email?.split('@')[0] ||
        'Username';
      setDisplayName(name);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUser();
    }, [])
  );

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.auth.signOut();
            await AsyncStorage.removeItem('isAuthenticated');
          } catch (error) {
            console.error('Error during logout:', error);
            Alert.alert('Error', 'Failed to log out. Please try again.');
          }
        },
      },
    ]);
  };

  const scrollBottom = tabBarHeight + Math.max(insets.bottom, 12) + 24;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.headerGreen,
            {
              paddingTop: insets.top + 20,
              paddingBottom: AVATAR_HALF + HEADER_EXTEND_PAST_AVATAR,
            },
          ]}
        >
          <Text style={styles.headerTitle} pointerEvents="none">
            Profile Settings
          </Text>
          <View style={styles.headerSpacerBelowTitle} />
        </View>

        <View style={[styles.avatarOverlap, { marginTop: -(AVATAR_HALF + AVATAR_PULLUP) }]}>
          {user?.user_metadata?.avatar_url ? (
            <Image
              source={{ uri: user.user_metadata.avatar_url as string }}
              style={styles.avatar}
              resizeMode="cover"
              accessibilityLabel="Profile picture"
            />
          ) : (
            <Image
              source={defaultAvatar}
              style={styles.avatar}
              resizeMode="contain"
              accessibilityLabel="Profile picture"
            />
          )}
        </View>

        <View style={styles.identityBlock}>
          <Text style={styles.username}>{displayName}</Text>
          <Text style={styles.email}>{user?.email ?? 'username@gmail.com'}</Text>
        </View>

        <View style={styles.menuList}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuCard}
              onPress={() => navigation.navigate(item.screen as never)}
              activeOpacity={0.75}
              accessibilityLabel={`Navigate to ${item.title}`}
              accessibilityRole="button"
            >
              <JamIcon name={item.icon} size={24} color={ICON_TEAL} />
              <Text style={styles.menuItemText}>{item.title}</Text>
              <JamIcon ionicon="chevron-forward" size={22} color={MENU_TEXT} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutRow}
          onPress={handleLogout}
          accessibilityLabel="Log out"
          accessibilityRole="button"
        >
          <JamIcon name="log-out" size={24} color={LOGOUT_TEXT} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerGreen: {
    backgroundColor: HEADER_GREEN,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 20,
    lineHeight: 24,
    color: Colors.white,
    textAlign: 'center',
  },
  headerSpacerBelowTitle: {
    height: HEADER_SPACE_BELOW_TITLE,
    width: '100%',
  },
  avatarOverlap: {
    alignSelf: 'center',
    zIndex: 2,
    borderRadius: AVATAR_HALF,
    backgroundColor: Colors.white,
    padding: 3,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_HALF,
    backgroundColor: Colors.white,
  },
  identityBlock: {
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
    marginBottom: 22,
    gap: 8,
  },
  username: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    lineHeight: 28,
    color: LOGOUT_TEXT,
    textAlign: 'center',
  },
  email: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 24,
    color: EMAIL_MUTED,
    textAlign: 'center',
  },
  menuList: {
    paddingHorizontal: 16,
    gap: 11,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 30,
    ...menuCardShadow,
  },
  menuItemText: {
    flex: 1,
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: MENU_TEXT,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    alignSelf: 'center',
    width: '100%',
    paddingTop: 28,
    paddingBottom: 12,
  },
  logoutText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: LOGOUT_TEXT,
  },
});

export default ProfileScreen;
