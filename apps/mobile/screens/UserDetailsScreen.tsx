import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { BirthdayPickerModal } from '../components/BirthdayPickerModal';
import { JamIcon } from '../components/JamIcon';
import { Colors, Theme } from '../constants/theme';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

const HEADER_GREEN = Colors.accent;
const TEAL = '#1F4F59';
const DISPLAY_NAME_GREEN = '#213502';
const INPUT_BORDER = 'rgba(122, 120, 120, 0.45)';
const ROW_TEXT = '#241D13';
const PLACEHOLDER_MUTED = '#AFA7A7';

const DEFAULT_BIRTHDAY = new Date(2005, 1, 20);

function parseBirthdayToDate(display: string): Date {
  const parsed = Date.parse(display);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  return DEFAULT_BIRTHDAY;
}

function formatBirthdayDisplay(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const UserDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  /** Tab bar is hidden on this screen — pad scroll with safe area only */
  const scrollBottomPad = Math.max(insets.bottom, 12) + 32;
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Cavite');
  const [street, setStreet] = useState('Washington Place');
  const [birthday, setBirthday] = useState('February 20, 2005');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingCity, setEditingCity] = useState(false);
  const [editingStreet, setEditingStreet] = useState(false);
  const [birthdayModalVisible, setBirthdayModalVisible] = useState(false);
  const [keyboardPad, setKeyboardPad] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const [originalUsername, setOriginalUsername] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalCity, setOriginalCity] = useState('');
  const [originalStreet, setOriginalStreet] = useState('');

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvt, (e) => {
      setKeyboardPad(Math.max(0, e.endCoordinates.height - 24));
    });
    const onHide = Keyboard.addListener(hideEvt, () => setKeyboardPad(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      if (u) {
        // Load from user_profiles table first, fallback to user_metadata
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('username, city, street, avatar_url, birthday')
          .eq('id', u.id)
          .single();

        const usernameValue =
          profile?.username || (u.user_metadata?.username as string) || u.email?.split('@')[0] || '';
        const cityValue =
          profile?.city || (u.user_metadata?.city as string) || 'Cavite';
        const streetValue =
          profile?.street || (u.user_metadata?.street as string) || 'Washington Place';
        const birthdayValue =
          (profile as { birthday?: string } | null)?.birthday ||
          (u.user_metadata?.birthday as string) ||
          'February 20, 2005';
        const avatarValue = profile?.avatar_url || (u.user_metadata?.avatar_url as string | null);

        setUsername(usernameValue);
        setEmail(u.email || '');
        setAvatarUrl(avatarValue);
        setCity(cityValue);
        setStreet(streetValue);
        setBirthday(birthdayValue);

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

  const handleSaveBirthday = async (valueOverride?: string) => {
    if (!user) return;
    setSaving(true);
    try {
      const trimmed = (valueOverride ?? birthday).trim();
      const { error: profileError } = await supabase.from('user_profiles').upsert(
        {
          id: user.id,
          birthday: trimmed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (profileError) {
        const { error: authError } = await supabase.auth.updateUser({
          data: { ...user.user_metadata, birthday: trimmed },
        });
        if (authError) throw authError;
      } else {
        await supabase.auth.updateUser({
          data: { ...user.user_metadata, birthday: trimmed },
        });
      }

      setBirthday(trimmed);
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser) setUser(updatedUser);
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

  const scrollFormTowardBottom = useCallback(() => {
    requestAnimationFrame(() => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
  }, []);

  const openBirthdayPicker = useCallback(() => {
    setBirthdayModalVisible(true);
  }, []);

  const onBirthdayPicked = (d: Date) => {
    setBirthdayModalVisible(false);
    const formatted = formatBirthdayDisplay(d);
    setBirthday(formatted);
    void handleSaveBirthday(formatted);
  };

  const keyboardAvoidOffset = insets.top + 54;

  return (
    <View style={styles.container}>
      <View style={[styles.greenHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <JamIcon ionicon="chevron-left" size={26} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} pointerEvents="none">
            User Details
          </Text>
          <View style={styles.headerIconBtn} />
        </View>
      </View>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardAvoidOffset : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.content}
          contentContainerStyle={{
            paddingBottom: scrollBottomPad + keyboardPad,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
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
                onError={() => setAvatarUrl(null)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <JamIcon ionicon="person" size={60} color={TEAL} />
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

        <View style={styles.formBlock}>
          <Text style={[styles.formLabel, styles.formLabelFirst]}>Username</Text>
          <View style={[styles.inputPill, editingUsername && styles.inputPillFocused]}>
            <TextInput
              style={styles.inputPillText}
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor={PLACEHOLDER_MUTED}
              editable={editingUsername}
              autoFocus={editingUsername}
              accessibilityLabel="Username input"
            />
            {editingUsername ? (
              <View style={styles.pillActions}>
                <TouchableOpacity
                  onPress={() => {
                    setUsername(originalUsername);
                    setEditingUsername(false);
                  }}
                  disabled={saving}
                  hitSlop={8}
                  accessibilityLabel="Cancel username"
                  accessibilityRole="button"
                >
                  <JamIcon ionicon="close-circle" size={22} color={Colors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveUsername}
                  disabled={saving}
                  hitSlop={8}
                  accessibilityLabel="Save username"
                  accessibilityRole="button"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={TEAL} />
                  ) : (
                    <JamIcon ionicon="checkmark-circle" size={22} color={Colors.accent} />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setOriginalUsername(username);
                  setEditingUsername(true);
                }}
                disabled={saving}
                style={styles.pencilInPill}
                accessibilityLabel="Edit username"
                accessibilityRole="button"
              >
                <JamIcon ionicon="create-outline" size={22} color={TEAL} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.formLabel}>Email</Text>
          <View style={[styles.inputPill, editingEmail && styles.inputPillFocused]}>
            <TextInput
              style={styles.inputPillText}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={PLACEHOLDER_MUTED}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={editingEmail}
              autoFocus={editingEmail}
              accessibilityLabel="Email input"
            />
            {editingEmail ? (
              <View style={styles.pillActions}>
                <TouchableOpacity
                  onPress={() => {
                    setEmail(originalEmail);
                    setEditingEmail(false);
                  }}
                  disabled={saving}
                  hitSlop={8}
                  accessibilityLabel="Cancel email"
                  accessibilityRole="button"
                >
                  <JamIcon ionicon="close-circle" size={22} color={Colors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveEmail}
                  disabled={saving}
                  hitSlop={8}
                  accessibilityLabel="Save email"
                  accessibilityRole="button"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={TEAL} />
                  ) : (
                    <JamIcon ionicon="checkmark-circle" size={22} color={Colors.accent} />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setOriginalEmail(email);
                  setEditingEmail(true);
                }}
                disabled={saving}
                style={styles.pencilInPill}
                accessibilityLabel="Edit email"
                accessibilityRole="button"
              >
                <JamIcon ionicon="create-outline" size={22} color={TEAL} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.infoRow}>
            <JamIcon ionicon="location-outline" size={22} color={TEAL} />
            <View style={styles.infoRowMid}>
              {editingCity ? (
                <TextInput
                  style={styles.infoRowInput}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City, province"
                  placeholderTextColor={PLACEHOLDER_MUTED}
                  autoFocus={editingCity}
                  onFocus={scrollFormTowardBottom}
                  accessibilityLabel="City input"
                />
              ) : (
                <Text style={styles.infoRowText}>{city}</Text>
              )}
            </View>
            {editingCity ? (
              <View style={styles.pillActions}>
                <TouchableOpacity
                  onPress={() => {
                    setCity(originalCity);
                    setEditingCity(false);
                  }}
                  disabled={saving}
                  hitSlop={8}
                  accessibilityLabel="Cancel city"
                  accessibilityRole="button"
                >
                  <JamIcon ionicon="close-circle" size={22} color={Colors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveAddress}
                  disabled={saving}
                  hitSlop={8}
                  accessibilityLabel="Save city"
                  accessibilityRole="button"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={TEAL} />
                  ) : (
                    <JamIcon ionicon="checkmark-circle" size={22} color={Colors.accent} />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setOriginalCity(city);
                  setEditingCity(true);
                }}
                disabled={saving}
                style={styles.rowPencil}
                accessibilityLabel="Edit city"
                accessibilityRole="button"
              >
                <JamIcon ionicon="create-outline" size={22} color={TEAL} />
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <JamIcon ionicon="home-outline" size={22} color={TEAL} />
            <View style={styles.infoRowMid}>
              {editingStreet ? (
                <TextInput
                  style={styles.infoRowInput}
                  value={street}
                  onChangeText={setStreet}
                  placeholder="Street / subdivision"
                  placeholderTextColor={PLACEHOLDER_MUTED}
                  autoFocus={editingStreet}
                  onFocus={scrollFormTowardBottom}
                  accessibilityLabel="Street input"
                />
              ) : (
                <Text style={styles.infoRowText}>{street}</Text>
              )}
            </View>
            {editingStreet ? (
              <View style={styles.pillActions}>
                <TouchableOpacity
                  onPress={() => {
                    setStreet(originalStreet);
                    setEditingStreet(false);
                  }}
                  disabled={saving}
                  hitSlop={8}
                  accessibilityLabel="Cancel street"
                  accessibilityRole="button"
                >
                  <JamIcon ionicon="close-circle" size={22} color={Colors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveAddress}
                  disabled={saving}
                  hitSlop={8}
                  accessibilityLabel="Save street"
                  accessibilityRole="button"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={TEAL} />
                  ) : (
                    <JamIcon ionicon="checkmark-circle" size={22} color={Colors.accent} />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setOriginalStreet(street);
                  setEditingStreet(true);
                }}
                disabled={saving}
                style={styles.rowPencil}
                accessibilityLabel="Edit street"
                accessibilityRole="button"
              >
                <JamIcon ionicon="create-outline" size={22} color={TEAL} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.sectionTitle}>Birthday</Text>
          <View style={[styles.infoRow, styles.infoRowNoBorder]}>
            <JamIcon name="calendar" size={22} color={TEAL} />
            <View style={styles.infoRowMid}>
              <Text style={styles.infoRowText}>{birthday}</Text>
            </View>
            <TouchableOpacity
              onPress={openBirthdayPicker}
              disabled={saving}
              style={styles.rowPencil}
              accessibilityLabel="Change birthday"
              accessibilityRole="button"
            >
              {saving ? (
                <ActivityIndicator size="small" color={TEAL} />
              ) : (
                <JamIcon ionicon="create-outline" size={22} color={TEAL} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <BirthdayPickerModal
        visible={birthdayModalVisible}
        initialDate={parseBirthdayToDate(birthday)}
        onClose={() => setBirthdayModalVisible(false)}
        onConfirm={onBirthdayPicked}
        bottomInset={Math.max(insets.bottom, 16)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  greenHeader: {
    backgroundColor: HEADER_GREEN,
    paddingBottom: 14,
    paddingHorizontal: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins_500Medium',
    fontSize: 20,
    lineHeight: 24,
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: Colors.white,
  },
  avatarPlaceholder: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#F3F4F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  displayName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    lineHeight: 28,
    color: DISPLAY_NAME_GREEN,
    marginBottom: 6,
    textAlign: 'center',
  },
  emailDisplay: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: PLACEHOLDER_MUTED,
    textAlign: 'center',
  },
  formBlock: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  formLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 20,
    color: TEAL,
    marginBottom: 8,
    marginTop: 16,
  },
  formLabelFirst: {
    marginTop: 0,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: TEAL,
    marginTop: 22,
    marginBottom: 10,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 4,
    minHeight: 52,
    marginBottom: 18,
  },
  inputPillFocused: {
    borderColor: Colors.accent,
    borderWidth: 1.5,
  },
  inputPillText: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    lineHeight: 22,
    color: ROW_TEXT,
    paddingVertical: 10,
  },
  pencilInPill: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: INPUT_BORDER,
    gap: 12,
  },
  infoRowLast: {
    marginBottom: 4,
  },
  infoRowNoBorder: {
    borderBottomWidth: 0,
  },
  infoRowMid: {
    flex: 1,
    minWidth: 0,
  },
  infoRowText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    lineHeight: 22,
    color: ROW_TEXT,
  },
  infoRowInput: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    lineHeight: 22,
    color: ROW_TEXT,
    paddingVertical: 0,
    margin: 0,
  },
  rowPencil: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default UserDetailsScreen;
