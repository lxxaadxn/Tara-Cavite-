import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { User } from '@supabase/supabase-js';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { Colors, Theme } from '../constants/Theme';
import { supabase } from '../lib/supabase';

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  screen: string;
}

const menuItems: MenuItem[] = [
  { id: '1', title: 'User Details', icon: 'person', screen: 'UserDetails' },
  { id: '2', title: 'History', icon: 'time', screen: 'History' },
  { id: '3', title: 'Fare Guide', icon: 'car', screen: 'Preferences' },
  { id: '4', title: 'Saved list', icon: 'bookmark', screen: 'SavedList' },
  { id: '5', title: 'Preferences', icon: 'settings', screen: 'Preferences' },
];

const displayName = (user: User | null) =>
  (user?.user_metadata?.username as string) || user?.email?.split('@')[0] || 'User';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);

  const loadUser = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
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
              await AsyncStorage.setItem('onboardingComplete', 'false');
              // App.tsx polling will show Onboarding, then Auth after GET STARTED
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
        onNotificationPress={() => navigation.navigate('Notifications' as never)}
      />
      <ScrollView style={styles.content}>
        {/* Profile Info */}
        <TouchableOpacity
          style={styles.profileSection}
          onPress={() => navigation.navigate('UserDetails' as never)}
          activeOpacity={0.8}
        >
          <View style={styles.avatarContainer}>
            {user?.user_metadata?.avatar_url ? (
              <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={48} color={Colors.primary} />
              </View>
            )}
          </View>
          <Text style={styles.username}>{displayName(user)}</Text>
          <Text style={styles.email}>{user?.email ?? '—'}</Text>
        </TouchableOpacity>

        {/* Menu Items */}
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => navigation.navigate(item.screen as never)}
          >
            <Card style={styles.menuItem}>
              <View style={styles.menuItemContent}>
                <Ionicons name={item.icon as any} size={24} color={Colors.primary} />
                <Text style={styles.menuItemText}>{item.title}</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.text.light} />
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {/* Log Out Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.text.primary} />
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
    paddingVertical: Theme.spacing.xl,
    backgroundColor: Colors.white,
    marginBottom: Theme.spacing.md,
  },
  avatarContainer: {
    marginBottom: Theme.spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  email: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  menuItem: {
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
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
    color: Colors.text.primary,
  },
});

export default ProfileScreen;
