import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { User } from '@supabase/supabase-js';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { JamIcon } from '../components/JamIcon';
import type { JamIconName } from '../lib/jamSvgMap';
import { Colors, Theme } from '../constants/theme';
import { supabase } from '../lib/supabase';

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

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('Username');

  const loadUser = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    
    if (u) {
      // Try to get from user_profiles table first
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', u.id)
        .single();
      
      const name = profile?.username || 
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
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              await AsyncStorage.removeItem('isAuthenticated');
              // App remounts unauthenticated flow → landing (Unauthed stack) then sign-in
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Profile Settings"
        showBack={false}
        showNotification
        darkBackground
        onNotificationPress={() => navigation.navigate('Notifications')}
      />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Info Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {user?.user_metadata?.avatar_url ? (
              <Image
                source={{ uri: user.user_metadata.avatar_url }}
                style={styles.avatar}
                accessibilityLabel="Profile picture"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <JamIcon name="user" size={60} color={Colors.primary} />
              </View>
            )}
          </View>
          <Text style={styles.username}>{displayName}</Text>
          <Text style={styles.email}>{user?.email ?? 'username@gmail.com'}</Text>
        </View>

        {/* Menu Items */}
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}
            accessibilityLabel={`Navigate to ${item.title}`}
            accessibilityRole="button"
          >
            <Card style={styles.menuItem}>
              <View style={styles.menuItemContent}>
                <JamIcon name={item.icon} size={24} color={Colors.primary} />
                <Text style={styles.menuItemText}>{item.title}</Text>
                <JamIcon ionicon="chevron-forward" size={24} color={Colors.text.light} />
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {/* Log Out Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityLabel="Log out"
          accessibilityRole="button"
        >
          <JamIcon ionicon="log-out-outline" size={24} color={Colors.primary} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  avatarContainer: {
    marginBottom: Theme.spacing.md,
  },
  avatar: {
    width: 132,
    height: 130,
    borderRadius: 66,
    backgroundColor: Colors.background,
  },
  avatarPlaceholder: {
    width: 132,
    height: 130,
    borderRadius: 66,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 24,
    fontFamily: 'Poppins',
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Theme.spacing.xs,
  },
  email: {
    fontSize: 13,
    fontFamily: 'Poppins',
    fontWeight: '400',
    color: Colors.text.light,
  },
  menuItem: {
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: Theme.spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
  },
  logoutText: {
    marginLeft: Theme.spacing.sm,
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: '600',
    color: Colors.primary,
  },
});

export default ProfileScreen;
