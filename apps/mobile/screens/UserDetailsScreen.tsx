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
import * as FileSystem from 'expo-file-system';
import { JamIcon } from '../components/JamIcon';
import { Colors, Theme } from '../constants/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

const UserDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Dasmarñas, Cavite');
  const [street, setStreet] = useState('Washington Place');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingCity, setEditingCity] = useState(false);
  const [editingStreet, setEditingStreet] = useState(false);
  
  // Store original values for cancel functionality
  const [originalUsername, setOriginalUsername] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalCity, setOriginalCity] = useState('');
  const [originalStreet, setOriginalStreet] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      if (u) {
        // Load from user_profiles table first, fallback to user_metadata
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('username, city, street, avatar_url')
          .eq('id', u.id)
          .single();
        
        const usernameValue = profile?.username || (u.user_metadata?.username as string) || u.email?.split('@')[0] || '';
        const cityValue = profile?.city || (u.user_metadata?.city as string) || 'Dasmarñas, Cavite';
        const streetValue = profile?.street || (u.user_metadata?.street as string) || 'Washington Place';
        const avatarValue = profile?.avatar_url || (u.user_metadata?.avatar_url as string | null);
        
        setUsername(usernameValue);
        setEmail(u.email || '');
        setAvatarUrl(avatarValue);
        setCity(cityValue);
        setStreet(streetValue);
        
        // Store original values
        setOriginalUsername(usernameValue);
        setOriginalEmail(u.email || '');
        setOriginalCity(cityValue);
        setOriginalStreet(streetValue);
      }
    };
    load();
  }, []);

  const handleSaveUsername = async () => {
    if (!user || !username.trim()) {
      Alert.alert('Error', 'Username cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      const trimmedUsername = username.trim();
      
      // Update user_profiles table
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          username: trimmedUsername,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });
      
      if (profileError) {
        console.error('Profile update error:', profileError);
        // If table doesn't exist yet, fall back to user_metadata
        const { error: authError } = await supabase.auth.updateUser({
          data: { ...user.user_metadata, username: trimmedUsername },
        });
        if (authError) throw authError;
      } else {
        // Also update user_metadata for consistency
        await supabase.auth.updateUser({
          data: { ...user.user_metadata, username: trimmedUsername },
        });
      }
      
      setOriginalUsername(trimmedUsername);
      setEditingUsername(false);
      
      // Reload user data
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser) {
        setUser(updatedUser);
      }
      
      Alert.alert('Saved', 'Username updated successfully.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!user || !email.trim()) {
      Alert.alert('Error', 'Email cannot be empty.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw error;
      setEditingEmail(false);
      Alert.alert('Saved', 'Email update confirmation sent. Please check your email.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const trimmedCity = city.trim();
      const trimmedStreet = street.trim();
      
      // Update user_profiles table
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          city: trimmedCity,
          street: trimmedStreet,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });
      
      if (profileError) {
        console.error('Profile update error:', profileError);
        // If table doesn't exist yet, fall back to user_metadata
        const { error: authError } = await supabase.auth.updateUser({
          data: { ...user.user_metadata, city: trimmedCity, street: trimmedStreet },
        });
        if (authError) throw authError;
      } else {
        // Also update user_metadata for consistency
        await supabase.auth.updateUser({
          data: { ...user.user_metadata, city: trimmedCity, street: trimmedStreet },
        });
      }
      
      setOriginalCity(trimmedCity);
      setOriginalStreet(trimmedStreet);
      setEditingCity(false);
      setEditingStreet(false);
      
      // Reload user data
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser) {
        setUser(updatedUser);
      }
      
      Alert.alert('Saved', 'Address updated successfully.');
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
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    if (!user) return;
    setSaving(true);
    try {
      // Read file as base64 using expo-file-system (most reliable for React Native)
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      
      if (!base64 || base64.length === 0) {
        throw new Error('Failed to read image file or file is empty');
      }
      
      // Convert base64 to ArrayBuffer using a more reliable method
      // Create a binary string from base64
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Determine file extension and MIME type
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const fileName = `${Date.now()}.${ext}`;
      const path = `${user.id}/${fileName}`;
      
      console.log('File size before upload:', bytes.length, 'bytes');
      console.log('Base64 length:', base64.length);
      console.log('MIME type:', mimeType);
      console.log('File URI:', uri);
      
      // Upload to Supabase storage - use ArrayBuffer/Uint8Array
      // Supabase accepts ArrayBuffer, Uint8Array, Blob, File, or FormData
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, bytes.buffer, { 
          upsert: true,
          contentType: mimeType,
        });
        
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // Check if it's a policy/permission error
        if (uploadError.message?.includes('policy') || uploadError.message?.includes('permission')) {
          Alert.alert(
            'Upload failed',
            'Storage policies not configured. Go to Supabase Dashboard > Storage > avatars bucket > Policies tab and create upload policies. See STORAGE_FIX.md for details.'
          );
        } else if (uploadError.message?.includes('Bucket not found')) {
          Alert.alert(
            'Upload failed',
            'Storage bucket "avatars" not found. Create it in Supabase Dashboard > Storage, then run storage-policies.sql in SQL Editor.'
          );
        } else {
          Alert.alert(
            'Upload failed',
            uploadError.message || 'Failed to upload image. Please check your Supabase storage configuration.'
          );
        }
        setSaving(false);
        return;
      }
      
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      
      console.log('Uploaded image URL:', publicUrl);
      console.log('Upload successful, file size:', bytes.length, 'bytes');
      
      // Update user_profiles table
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });
      
      // Also update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, avatar_url: publicUrl },
      });
      
      if (updateError) {
        console.error('Error updating user:', updateError);
        if (!profileError) {
          // If profile update worked but auth update failed, that's okay
          console.log('Profile updated but auth update failed, continuing...');
        } else {
          throw updateError;
        }
      }
      
      // Update local state immediately with the new URL
      setAvatarUrl(publicUrl);
      
      // Reload user data to ensure sync
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser) {
        setUser(updatedUser);
        // Ensure avatarUrl is set from updated user data
        const newAvatarUrl = updatedUser.user_metadata?.avatar_url as string | null;
        if (newAvatarUrl) {
          setAvatarUrl(newAvatarUrl);
        }
      }
      
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (e) {
      console.error('Image upload error:', e);
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update picture. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Use current username state if available, otherwise fallback
  const displayName = username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Username';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="User Details"
        showBack
        showNotification
        darkBackground
        onNotificationPress={() => navigation.navigate('Notifications')}
      />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={pickImage}
            disabled={saving}
            accessibilityLabel="Change profile picture"
            accessibilityRole="button"
          >
            {avatarUrl ? (
              <Image 
                source={{ uri: avatarUrl }} 
                style={styles.avatar}
                onError={(error) => {
                  console.error('Image load error:', error);
                  setAvatarUrl(null);
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', avatarUrl);
                }}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <JamIcon ionicon="person" size={60} color={Colors.primary} />
              </View>
            )}
            <View style={styles.editAvatarButton}>
              {saving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <JamIcon ionicon="create-outline" size={18} color={Colors.white} />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.emailDisplay}>{user?.email ?? 'username@gmail.com'}</Text>
        </View>

        {/* Username Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Username</Text>
          <View style={[styles.inputRow, editingUsername && styles.inputRowEditing]}>
            <TextInput
              style={[styles.input, !editingUsername && styles.inputReadOnly]}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor={Colors.text.light}
              editable={editingUsername}
              autoFocus={editingUsername}
              accessibilityLabel="Username input"
            />
            {editingUsername ? (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setUsername(originalUsername);
                    setEditingUsername(false);
                  }}
                  disabled={saving}
                  accessibilityLabel="Cancel editing username"
                  accessibilityRole="button"
                >
                  <JamIcon ionicon="close-circle" size={24} color={Colors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveUsername}
                  disabled={saving}
                  accessibilityLabel="Save username"
                  accessibilityRole="button"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <JamIcon ionicon="checkmark-circle" size={24} color={Colors.accent} />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  setOriginalUsername(username);
                  setEditingUsername(true);
                }}
                disabled={saving}
                accessibilityLabel="Edit username"
                accessibilityRole="button"
              >
                <JamIcon ionicon="create-outline" size={24} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Email Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={[styles.inputRow, editingEmail && styles.inputRowEditing]}>
            <TextInput
              style={[styles.input, !editingEmail && styles.inputReadOnly]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email"
              placeholderTextColor={Colors.text.light}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={editingEmail}
              autoFocus={editingEmail}
              accessibilityLabel="Email input"
            />
            {editingEmail ? (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setEmail(originalEmail);
                    setEditingEmail(false);
                  }}
                  disabled={saving}
                  accessibilityLabel="Cancel editing email"
                  accessibilityRole="button"
                >
                  <JamIcon ionicon="close-circle" size={24} color={Colors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveEmail}
                  disabled={saving}
                  accessibilityLabel="Save email"
                  accessibilityRole="button"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <JamIcon ionicon="checkmark-circle" size={24} color={Colors.accent} />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  setOriginalEmail(email);
                  setEditingEmail(true);
                }}
                disabled={saving}
                accessibilityLabel="Edit email"
                accessibilityRole="button"
              >
                <JamIcon ionicon="create-outline" size={24} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Address Section */}
        <View style={styles.fieldContainer}>
          <Text style={styles.addressLabel}>Address</Text>
          <View style={styles.addressRow}>
            <JamIcon ionicon="location" size={24} color={Colors.primary} />
            <View style={styles.addressInputRow}>
              {editingCity ? (
                <TextInput
                  style={styles.addressInput}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor={Colors.text.light}
                  autoFocus={editingCity}
                  accessibilityLabel="City input"
                />
              ) : (
                <Text style={styles.addressText}>{city}</Text>
              )}
              {editingCity ? (
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setCity(originalCity);
                      setEditingCity(false);
                    }}
                    disabled={saving}
                    accessibilityLabel="Cancel editing city"
                    accessibilityRole="button"
                  >
                    <JamIcon ionicon="close-circle" size={24} color={Colors.text.secondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveAddress}
                    disabled={saving}
                    accessibilityLabel="Save city"
                    accessibilityRole="button"
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <JamIcon ionicon="checkmark-circle" size={24} color={Colors.accent} />
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    setOriginalCity(city);
                    setEditingCity(true);
                  }}
                  disabled={saving}
                  accessibilityLabel="Edit city"
                  accessibilityRole="button"
                >
                  <JamIcon ionicon="create-outline" size={24} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={styles.addressRow}>
            <JamIcon ionicon="home-outline" size={24} color={Colors.primary} />
            <View style={styles.addressInputRow}>
              {editingStreet ? (
                <TextInput
                  style={styles.addressInput}
                  value={street}
                  onChangeText={setStreet}
                  placeholder="Street address"
                  placeholderTextColor={Colors.text.light}
                  autoFocus={editingStreet}
                  accessibilityLabel="Street address input"
                />
              ) : (
                <Text style={styles.addressText}>{street}</Text>
              )}
              {editingStreet ? (
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setStreet(originalStreet);
                      setEditingStreet(false);
                    }}
                    disabled={saving}
                    accessibilityLabel="Cancel editing street"
                    accessibilityRole="button"
                  >
                    <JamIcon ionicon="close-circle" size={24} color={Colors.text.secondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveAddress}
                    disabled={saving}
                    accessibilityLabel="Save street"
                    accessibilityRole="button"
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <JamIcon ionicon="checkmark-circle" size={24} color={Colors.accent} />
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    setOriginalStreet(street);
                    setEditingStreet(true);
                  }}
                  disabled={saving}
                  accessibilityLabel="Edit street"
                  accessibilityRole="button"
                >
                  <JamIcon ionicon="create-outline" size={24} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
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
  avatarSection: {
    alignItems: 'center',
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  avatarContainer: {
    position: 'relative',
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
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  displayName: {
    fontSize: 24,
    fontFamily: 'Poppins',
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Theme.spacing.xs,
  },
  emailDisplay: {
    fontSize: 13,
    fontFamily: 'Poppins',
    fontWeight: '400',
    color: Colors.text.light,
  },
  fieldContainer: {
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  fieldLabel: {
    fontSize: 20,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.primary,
    marginBottom: Theme.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputRowEditing: {
    borderWidth: 2,
    borderColor: Colors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins',
    color: Colors.text.primary,
    paddingVertical: Theme.spacing.xs,
  },
  inputReadOnly: {
    color: Colors.text.primary,
  },
  editButton: {
    padding: Theme.spacing.xs,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  cancelButton: {
    padding: Theme.spacing.xs,
  },
  saveButton: {
    padding: Theme.spacing.xs,
  },
  addressLabel: {
    fontSize: 20,
    fontFamily: 'Poppins',
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Theme.spacing.md,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  addressInputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Theme.spacing.sm,
  },
  addressInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: '600',
    color: Colors.text.primary,
    paddingVertical: Theme.spacing.xs,
  },
  addressText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: '600',
    color: Colors.text.primary,
  },
});

export default UserDetailsScreen;
