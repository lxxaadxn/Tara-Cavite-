import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../constants/Theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

const UserDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [address1, setAddress1] = useState('Dasmarñas, Cavite');
  const [address2, setAddress2] = useState('Washington Place');

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      if (u) {
        setUsername((u.user_metadata?.username as string) || u.email?.split('@')[0] || '');
        setAvatarUrl(u.user_metadata?.avatar_url as string | null);
      }
    };
    load();
  }, []);

  const handleSaveUsername = async () => {
    if (!user || !username.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, username: username.trim() },
      });
      if (error) throw error;
      Alert.alert('Saved', 'Username updated.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to change your picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    if (!user) return;
    setSaving(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const ext = uri.split('.').pop() || 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true });
      if (uploadError) {
        Alert.alert(
          'Upload failed',
          'Create a storage bucket named "avatars" (public) in Supabase Dashboard > Storage, then try again.'
        );
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: updateError } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, avatar_url: urlData.publicUrl },
      });
      if (updateError) throw updateError;
      setAvatarUrl(urlData.publicUrl);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update picture.');
    } finally {
      setSaving(false);
    }
  };

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="User Details"
        showBack
        showNotification
        onNotificationPress={() => navigation.navigate('Notifications' as never)}
      />
      <ScrollView style={styles.content}>
        <Card style={styles.profileCard}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} disabled={saving}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={48} color={Colors.primary} />
              </View>
            )}
            <View style={styles.editAvatarButton}>
              {saving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="camera" size={18} color={Colors.white} />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.email}>{user?.email ?? '—'}</Text>
        </Card>

        <Card style={styles.fieldsCard}>
          <Text style={styles.fieldLabel}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            placeholderTextColor={Colors.text.light}
          />
          <View style={styles.saveRow}>
            <Button
              title={saving ? 'Saving...' : 'Save username'}
              onPress={handleSaveUsername}
              disabled={saving}
            />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: Theme.spacing.lg }]}>Email</Text>
          <Text style={styles.readOnlyValue}>{user?.email ?? '—'}</Text>
          <Text style={styles.hint}>Email cannot be changed here.</Text>

          <Text style={[styles.fieldLabel, { marginTop: Theme.spacing.lg }]}>Address</Text>
          <View style={styles.addressItem}>
            <Ionicons name="location" size={20} color={Colors.primary} />
            <Text style={styles.addressText}>{address1}</Text>
          </View>
          <View style={styles.addressItem}>
            <Ionicons name="home" size={20} color={Colors.primary} />
            <Text style={styles.addressText}>{address2}</Text>
          </View>
        </Card>
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
  profileCard: {
    margin: Theme.spacing.md,
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
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
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Theme.spacing.xs,
  },
  email: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  fieldsCard: {
    margin: Theme.spacing.md,
    padding: Theme.spacing.lg,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Theme.spacing.sm,
  },
  input: {
    backgroundColor: Colors.background,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.sm,
    fontSize: 16,
    color: Colors.text.primary,
  },
  saveRow: {
    marginTop: Theme.spacing.sm,
  },
  readOnlyValue: {
    fontSize: 16,
    color: Colors.text.secondary,
    paddingVertical: Theme.spacing.sm,
  },
  hint: {
    fontSize: 12,
    color: Colors.text.light,
    marginTop: Theme.spacing.xs,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.sm,
    marginBottom: Theme.spacing.sm,
  },
  addressText: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    fontSize: 16,
    color: Colors.text.primary,
  },
});

export default UserDetailsScreen;
