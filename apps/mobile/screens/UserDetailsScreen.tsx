import React, { useCallback, useEffect, useState } from 'react';
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
import * as Linking from 'expo-linking';
import { JamIcon } from '../components/JamIcon';
import { Header } from '../components/Header';
import { getDevOAuthBridgeBaseUrl } from '../lib/authOAuth';
import { deleteUserAvatarFiles } from '../lib/avatarStorage';
import {
  hasCustomAvatarFromSources,
  resolveAvatarFromSources,
} from 'cavitour-shared/defaultAvatar';
import {
  CHANGE_PASSWORD_MIN_LENGTH,
  CHANGE_PASSWORD_SUCCESS_MESSAGE,
  CHANGE_PASSWORD_SUCCESS_TITLE,
  changePasswordWithSupabase,
} from 'cavitour-shared/changePassword';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

const TEAL = '#1f4f59';
const MUTED = '#737373';
const TITLE = '#171717';
const BORDER = '#e5e5e5';
const PAGE_BG = '#f4f7f9';

function getEmailChangeRedirectUrl(): string {
  const bridge = getDevOAuthBridgeBaseUrl();
  if (bridge) return `${bridge}/profile`;
  return Linking.createURL('auth/callback');
}

function userHasRemovableAvatar(user: User | null, profileRow: { avatar_url?: string | null } | null): boolean {
  return hasCustomAvatarFromSources(profileRow, user?.user_metadata ?? {});
}

const UserDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUri, setAvatarUri] = useState('');
  const [hasCustomPhoto, setHasCustomPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const loadProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    if (!u) {
      setLoading(false);
      return;
    }
    const { data: row } = await supabase
      .from('user_profiles')
      .select('username, avatar_url')
      .eq('id', u.id)
      .maybeSingle();
    const meta = u.user_metadata ?? {};
    const nick =
      row?.username ||
      (meta.nickname as string) ||
      (meta.username as string) ||
      (u.email ? u.email.split('@')[0] : '');
    setNickname(nick);
    setEmail(u.email || '');
    setAvatarUri(resolveAvatarFromSources(row, meta));
    setHasCustomPhoto(hasCustomAvatarFromSources(row, meta));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const usernameForRow = (u: User) => {
    const trimmed = nickname.trim();
    if (trimmed) return trimmed;
    const meta = u.user_metadata ?? {};
    return (
      (meta.nickname as string) ||
      (meta.username as string) ||
      (u.email ? u.email.split('@')[0] : 'User')
    );
  };

  const saveEdits = async () => {
    if (!user) return;
    const nick = nickname.trim();
    const emailTrim = email.trim().toLowerCase();
    const currentEmail = String(user.email ?? '')
      .trim()
      .toLowerCase();

    if (!nick) {
      Alert.alert('Edit profile', 'Please enter a nickname.');
      return;
    }
    if (!emailTrim) {
      Alert.alert('Edit profile', 'Please enter an email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      Alert.alert('Edit profile', 'Please enter a valid email address.');
      return;
    }

    setSaving(true);
    try {
      let emailChangePending = false;
      if (emailTrim !== currentEmail) {
        const { error: emailErr } = await supabase.auth.updateUser(
          { email: emailTrim },
          { emailRedirectTo: getEmailChangeRedirectUrl() }
        );
        if (emailErr) {
          const msg = emailErr.message || '';
          if (/already registered|already been registered|user already registered/i.test(msg)) {
            throw new Error('That email is already used by another account. Try a different address.');
          }
          if (/reauthentication|re-auth|same as the old/i.test(msg)) {
            throw new Error(
              'Email could not be changed right now. Sign out, sign in again, then try updating your email.'
            );
          }
          throw emailErr;
        }
        emailChangePending = true;
      }

      await supabase.from('user_profiles').upsert(
        {
          id: user.id,
          username: nick,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      await supabase.auth.updateUser({
        data: { ...user.user_metadata, username: nick, nickname: nick },
      });

      if (emailChangePending) {
        Alert.alert(
          'Profile saved',
          'We sent a confirmation link to your new email — open it to finish changing your address. This works for Google and email sign-in accounts.'
        );
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Edit profile', e instanceof Error ? e.message : 'Could not save profile.');
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
    if (result.canceled || !result.assets[0] || !user) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    setUploading(true);
    try {
      const fileResponse = await fetch(uri);
      if (!fileResponse.ok) throw new Error('Failed to read selected image file.');
      const fileBuffer = await fileResponse.arrayBuffer();
      if (!fileBuffer?.byteLength) throw new Error('Selected image is empty.');

      const guessedExt = uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
      const ext = ['jpeg', 'jpg', 'png', 'webp'].includes(guessedExt) ? guessedExt : 'jpg';
      const mimeType =
        asset.mimeType ||
        (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
      const normalizedExt = ext === 'jpeg' ? 'jpg' : ext;
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${normalizedExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, fileBuffer, {
        upsert: true,
        contentType: mimeType,
        cacheControl: '3600',
      });
      if (uploadError) {
        const msg = uploadError.message || '';
        if (/policy|permission|row-level security|not authorized|denied/i.test(msg)) {
          throw new Error(
            'Upload blocked by storage rules. In Supabase: create a public "avatars" bucket, then run storage-policies.sql from the project repo (SQL Editor).'
          );
        }
        if (/bucket|not found|does not exist/i.test(msg)) {
          throw new Error(
            'Storage bucket "avatars" is missing. Create it under Storage in the Supabase Dashboard, then apply storage-policies.sql.'
          );
        }
        throw uploadError;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const nick = usernameForRow(user);

      const { error: profileErr } = await supabase.from('user_profiles').upsert(
        {
          id: user.id,
          username: nick,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (profileErr) throw profileErr;

      const { error: metaErr } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          avatar_url: publicUrl,
          picture: publicUrl,
          cavitour_use_default_avatar: false,
        },
      });
      if (metaErr) throw metaErr;

      await supabase.auth.refreshSession();
      await loadProfile();
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not update profile picture.');
    } finally {
      setUploading(false);
    }
  };

  const confirmRemoveAvatar = () => {
    Alert.alert(
      'Remove profile photo?',
      'Your uploaded picture will be deleted and the default avatar will be used. You can upload a new photo anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove photo', style: 'destructive', onPress: () => void removeAvatar() },
      ]
    );
  };

  const removeAvatar = async () => {
    if (!user) return;
    setUploading(true);
    try {
      const { data: profileBefore } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (!userHasRemovableAvatar(user, profileBefore)) {
        Alert.alert('Edit profile', 'No profile photo to remove.');
        return;
      }

      const currentUrl =
        profileBefore?.avatar_url ||
        (user.user_metadata?.avatar_url as string | undefined) ||
        (user.user_metadata?.picture as string | undefined) ||
        null;

      try {
        await deleteUserAvatarFiles(supabase, user.id, currentUrl);
      } catch (storageErr) {
        const msg = storageErr instanceof Error ? storageErr.message : '';
        if (/policy|permission|row-level security|not authorized|denied/i.test(msg)) {
          throw new Error(
            'Could not delete the file from storage. In Supabase, run storage-policies.sql so your account can delete files in the avatars bucket.'
          );
        }
        throw storageErr;
      }

      const { error: profileErr } = await supabase.from('user_profiles').upsert(
        {
          id: user.id,
          username: usernameForRow(user),
          avatar_url: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (profileErr) throw profileErr;

      const { error: metaErr } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          avatar_url: null,
          picture: null,
          cavitour_use_default_avatar: true,
        },
      });
      if (metaErr) throw metaErr;

      await supabase.auth.refreshSession();
      await loadProfile();
    } catch (e) {
      Alert.alert('Edit profile', e instanceof Error ? e.message : 'Could not remove profile photo.');
    } finally {
      setUploading(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'This cannot be undone. Your account, profile, reviews, and cloud saved lists will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => void deleteAccount(),
        },
      ]
    );
  };

  const deleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const { data: authData, error: authReadErr } = await supabase.auth.getUser();
      if (authReadErr) throw authReadErr;
      if (!authData?.user) {
        Alert.alert('Edit profile', 'Sign in to delete your account.');
        return;
      }

      const { error: rpcErr } = await supabase.rpc('delete_own_account');
      if (rpcErr) {
        const msg = rpcErr.message || '';
        if (/function.*does not exist|could not find/i.test(msg)) {
          throw new Error(
            'Account deletion is not enabled yet. Run the migration supabase/migrations/20260520140000_delete_own_account.sql in the Supabase SQL Editor.'
          );
        }
        throw rpcErr;
      }

      try {
        await deleteUserAvatarFiles(supabase, authData.user.id, null);
      } catch {
      }

      await supabase.auth.signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'SignIn' as never }],
      });
    } catch (e) {
      Alert.alert('Edit profile', e instanceof Error ? e.message : 'Could not delete account.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const changePassword = async () => {
    if (!user?.email) {
      Alert.alert('Change password', 'Sign in with an email account to change your password.');
      return;
    }
    setChangingPassword(true);
    try {
      await changePasswordWithSupabase(supabase, {
        email: user.email,
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(CHANGE_PASSWORD_SUCCESS_TITLE, CHANGE_PASSWORD_SUCCESS_MESSAGE);
    } catch (e) {
      Alert.alert('Change password', e instanceof Error ? e.message : 'Could not change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const busy = saving || uploading || deletingAccount || changingPassword;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Edit profile"
        showBack
        showNotification={false}
        darkBackground
      />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarWrap}>
            <View style={styles.avatarRing}>
              <Image source={{ uri: avatarUri }} style={styles.avatar} resizeMode="cover" />
            </View>
            <TouchableOpacity
              style={styles.avatarEditBtn}
              onPress={() => void pickImage()}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Upload profile photo"
            >
              {uploading ? (
                <ActivityIndicator size="small" color={MUTED} />
              ) : (
                <JamIcon name="pencil" size={14} color={MUTED} />
              )}
            </TouchableOpacity>
            {hasCustomPhoto ? (
              <TouchableOpacity
                style={styles.avatarRemoveBtn}
                onPress={confirmRemoveAvatar}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Remove profile photo"
              >
                <JamIcon ionicon="trash-outline" size={14} color="#b91c1c" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Nickname</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="Nickname"
              placeholderTextColor={MUTED}
              autoCapitalize="words"
              editable={!busy}
              accessibilityLabel="Nickname"
            />

            <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={MUTED}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              accessibilityLabel="Email"
            />
            <Text style={styles.hint}>
              Google and email accounts can change address here. If you change email, confirm the link we send to the
              new inbox.
            </Text>

            <View style={styles.passwordSection}>
              <Text style={styles.sectionTitle}>Change password</Text>
              <Text style={styles.hint}>
                Enter your current password, then choose a new one (at least {CHANGE_PASSWORD_MIN_LENGTH} characters).
              </Text>

              <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Current password</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Current password"
                placeholderTextColor={MUTED}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                editable={!busy}
                accessibilityLabel="Current password"
              />

              <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>New password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
                placeholderTextColor={MUTED}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                editable={!busy}
                accessibilityLabel="New password"
              />

              <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Confirm password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor={MUTED}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                editable={!busy}
                accessibilityLabel="Confirm password"
              />

              <TouchableOpacity
                style={styles.changePasswordBtn}
                onPress={() => void changePassword()}
                disabled={busy}
                accessibilityRole="button"
              >
                {changingPassword ? (
                  <ActivityIndicator size="small" color={TEAL} />
                ) : (
                  <Text style={styles.changePasswordBtnText}>Update password</Text>
                )}
              </TouchableOpacity>
            </View>

            {hasCustomPhoto ? (
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={confirmRemoveAvatar}
                disabled={busy}
                accessibilityRole="button"
              >
                <Text style={styles.removePhotoBtnText}>{uploading ? 'Removing…' : 'Remove profile photo'}</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.dangerSection}>
              <TouchableOpacity
                style={styles.deleteAccountBtn}
                onPress={confirmDeleteAccount}
                disabled={busy}
                accessibilityRole="button"
              >
                <Text style={styles.deleteAccountBtnText}>Delete account</Text>
              </TouchableOpacity>
              <Text style={styles.hint}>
                Permanently removes your profile, cloud data, and sign-in access.
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              disabled={busy}
              accessibilityRole="button"
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, busy && styles.saveBtnDisabled]}
              onPress={() => void saveEdits()}
              disabled={busy}
              accessibilityRole="button"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 20,
    width: 112,
    height: 112,
  },
  avatarRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    overflow: 'hidden',
    backgroundColor: '#e8ecef',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarEditBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRemoveBtn: {
    position: 'absolute',
    left: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
  },
  fieldLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#525252',
  },
  fieldLabelSpaced: {
    marginTop: 12,
  },
  input: {
    marginTop: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: TITLE,
  },
  hint: {
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
    color: MUTED,
  },
  passwordSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0f0f0',
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: TITLE,
  },
  changePasswordBtn: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#f8fafb',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  changePasswordBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: TEAL,
  },
  removePhotoBtn: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    paddingVertical: 10,
    alignItems: 'center',
  },
  removePhotoBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#b91c1c',
  },
  dangerSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0f0f0',
  },
  deleteAccountBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff',
    paddingVertical: 10,
    alignItems: 'center',
  },
  deleteAccountBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#b91c1c',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 20,
  },
  cancelBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 88,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#404040',
  },
  saveBtn: {
    borderRadius: 12,
    backgroundColor: TEAL,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#fff',
  },
});

export default UserDetailsScreen;
