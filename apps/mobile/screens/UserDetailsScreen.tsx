import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BirthdayPickerModal } from '../components/BirthdayPickerModal';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { JamIcon } from '../components/JamIcon';
import { Header } from '../components/Header';
import { deleteUserAvatarFiles } from '../lib/avatarStorage';
import {
  imageExtensionFromUri,
  imageMimeType,
  readLocalImageBytes,
} from '../lib/readImageBytes';
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
import {
  BIO_MAX_LENGTH,
  TRAVELER_INTEREST_TAGS,
  normalizeInterestTags,
} from '../lib/travelerInterests';
import {
  fetchLocationOptions,
  type LguFilterOption,
} from '../lib/lguFilterOptions';
import {
  dateOnly,
  displayBirthday,
  emitAvatarUpdated,
  fetchProfileRow,
  removeUserAvatar,
  removeUserCover,
  saveProfileIdentity,
  uploadUserCover,
} from '../lib/travelerProfile';

const TEAL = '#1B8A70';
const MUTED = '#737373';
const TITLE = '#171717';
const BORDER = '#e5e5e5';
const PAGE_BG = '#f4f7f9';

function userHasRemovableAvatar(user: User | null, profileRow: { avatar_url?: string | null } | null): boolean {
  return hasCustomAvatarFromSources(profileRow, user?.user_metadata ?? {});
}

const UserDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const scrollRef = React.useRef<ScrollView>(null);
  const focusPassword = Boolean((route.params as { focusPassword?: boolean } | undefined)?.focusPassword);
  const [user, setUser] = useState<User | null>(null);
  const insets = useSafeAreaInsets();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [birthday, setBirthday] = useState('');
  const [birthdayPickerOpen, setBirthdayPickerOpen] = useState(false);
  const [bio, setBio] = useState('');
  const [interestTags, setInterestTags] = useState<string[]>([]);
  const [coverUri, setCoverUri] = useState('');
  const [hasCustomCover, setHasCustomCover] = useState(false);
  /**
   * This screen has no social inputs, but `saveProfileIdentity` writes all three
   * columns on every upsert. Round-tripping the stored values keeps them intact.
   */
  const [socialLinks, setSocialLinks] = useState({ instagram: '', facebook: '', tiktok: '' });
  const [locationOptions, setLocationOptions] = useState<LguFilterOption[]>([]);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [avatarUri, setAvatarUri] = useState('');
  const [hasCustomPhoto, setHasCustomPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const [coverRemoving, setCoverRemoving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    void fetchLocationOptions().then((opts) => setLocationOptions(opts));
  }, []);

  const filteredLocations = useMemo(() => {
    const q = locationSearch.trim().toLowerCase();
    if (!q) return locationOptions;
    return locationOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [locationOptions, locationSearch]);

  const closeLocationPicker = () => {
    setLocationPickerOpen(false);
    setLocationSearch('');
  };

  const loadProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    if (!u) {
      setLoading(false);
      return;
    }
    const profileRow = await fetchProfileRow(supabase, u.id);
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    const nick =
      String(profileRow?.username ?? '') ||
      (meta.nickname as string) ||
      (meta.username as string) ||
      (u.email ? u.email.split('@')[0] : '');
    setNickname(nick);
    setEmail(u.email || '');
    setPhone(String(profileRow?.phone || meta.phone || '').trim());
    setCity(String(profileRow?.city || meta.city || '').trim());
    setBirthday(dateOnly(profileRow?.birthday));
    setBio(String(profileRow?.bio ?? '').trim());
    setInterestTags(normalizeInterestTags(profileRow?.interest_tags));
    setSocialLinks({
      instagram: String(profileRow?.social_instagram ?? '').trim(),
      facebook: String(profileRow?.social_facebook ?? '').trim(),
      tiktok: String(profileRow?.social_tiktok ?? '').trim(),
    });
    const cover = String(profileRow?.cover_url ?? '').trim();
    setCoverUri(cover);
    setHasCustomCover(Boolean(cover));
    setAvatarUri(resolveAvatarFromSources(profileRow as { avatar_url?: string | null }, meta));
    setHasCustomPhoto(hasCustomAvatarFromSources(profileRow as { avatar_url?: string | null }, meta));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (loading || !focusPassword) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [loading, focusPassword]);

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

    setSaving(true);
    try {
      const identity = await saveProfileIdentity(supabase, {
        nickname: nick,
        email: emailTrim,
        phone,
        city,
        birthday,
        bio,
        interestTags,
        socialInstagram: socialLinks.instagram,
        socialFacebook: socialLinks.facebook,
        socialTiktok: socialLinks.tiktok,
      });

      if (identity.birthdaySkipped) {
        Alert.alert(
          'Profile saved',
          'Saved nickname, city, phone, and bio. Birthday could not be stored until the profile table is updated.'
        );
      } else if (identity.emailChangePending) {
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

  const pickCover = async () => {
    if (!user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to change your cover banner.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setCoverUploading(true);
    try {
      const res = await uploadUserCover(
        supabase,
        { uri: asset.uri, mimeType: asset.mimeType ?? undefined },
        nickname || usernameForRow(user)
      );
      setCoverUri(res.publicUrl);
      setHasCustomCover(true);
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not update cover banner.');
    } finally {
      setCoverUploading(false);
    }
  };

  const confirmRemoveCover = () => {
    Alert.alert(
      'Remove cover photo?',
      'Your uploaded cover picture will be deleted and the default gradient will be used.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove cover',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setCoverRemoving(true);
              try {
                await removeUserCover(supabase, nickname || (user ? usernameForRow(user) : undefined));
                setCoverUri('');
                setHasCustomCover(false);
              } catch (e) {
                Alert.alert('Edit profile', e instanceof Error ? e.message : 'Could not remove cover photo.');
              } finally {
                setCoverRemoving(false);
              }
            })();
          },
        },
      ]
    );
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
    setAvatarUploading(true);
    try {
      const fileBuffer = await readLocalImageBytes(uri);
      const ext = imageExtensionFromUri(uri);
      const mimeType = imageMimeType(ext, asset.mimeType);
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

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
      emitAvatarUpdated();
      await loadProfile();
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not update profile picture.');
    } finally {
      setAvatarUploading(false);
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
    setAvatarRemoving(true);
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
      emitAvatarUpdated();
      await loadProfile();
    } catch (e) {
      Alert.alert('Edit profile', e instanceof Error ? e.message : 'Could not remove profile photo.');
    } finally {
      setAvatarRemoving(false);
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

  const uploading = avatarUploading || coverUploading || avatarRemoving || coverRemoving;
  const busy = saving || uploading || deletingAccount || changingPassword;

  return (
    <View style={styles.container}>
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
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.coverSection}>
            <View style={styles.coverBanner}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
              ) : (
                <LinearGradient
                  colors={['#1B8A70', '#2A9B7F', '#D4EFE8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.coverGradient}
                />
              )}
            </View>
            {/* Avatar overlaps the banner's bottom edge; action buttons sit below it */}
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
                {avatarUploading ? (
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
                  {avatarRemoving ? (
                    <ActivityIndicator size="small" color="#b91c1c" />
                  ) : (
                    <JamIcon ionicon="trash-outline" size={14} color="#b91c1c" />
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={styles.coverBtnRow}>
              <TouchableOpacity
                style={styles.coverBtn}
                onPress={() => void pickCover()}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Upload cover photo"
              >
                {coverUploading ? (
                  <ActivityIndicator size="small" color={TEAL} />
                ) : (
                  <>
                    <JamIcon ionicon="camera-outline" size={14} color={TEAL} />
                    <Text style={styles.coverBtnText}>{hasCustomCover ? 'Change cover' : 'Upload cover'}</Text>
                  </>
                )}
              </TouchableOpacity>
              {hasCustomCover ? (
                <TouchableOpacity
                  style={styles.coverRemoveBtn}
                  onPress={confirmRemoveCover}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Remove cover photo"
                >
                  {coverRemoving ? (
                    <ActivityIndicator size="small" color="#b91c1c" />
                  ) : (
                    <>
                      <JamIcon ionicon="trash-outline" size={14} color="#b91c1c" />
                      <Text style={styles.coverRemoveBtnText}>Remove cover</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
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

            <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Mobile number"
              placeholderTextColor={MUTED}
              keyboardType="phone-pad"
              editable={!busy}
              accessibilityLabel="Phone"
            />

            <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>City / Municipality</Text>
            <TouchableOpacity
              style={styles.inputTouchable}
              onPress={() => setLocationPickerOpen(true)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="City or municipality"
            >
              <Text
                style={{ fontFamily: 'Inter_400Regular', fontSize: 14, flex: 1, marginRight: 8, color: city ? TITLE : MUTED }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {city || 'Select city or municipality'}
              </Text>
              <JamIcon ionicon="chevron-down" size={16} color={MUTED} />
            </TouchableOpacity>

            <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Birthday</Text>
            <TouchableOpacity
              style={styles.inputTouchable}
              onPress={() => setBirthdayPickerOpen(true)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Birthday"
            >
              <Text
                style={{ fontFamily: 'Inter_400Regular', fontSize: 14, flex: 1, marginRight: 8, color: birthday ? TITLE : MUTED }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {displayBirthday(birthday) || 'Select date'}
              </Text>
              <JamIcon ionicon="calendar-outline" size={16} color={MUTED} />
            </TouchableOpacity>

            <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Bio</Text>
            <TextInput
              style={styles.notesInput}
              value={bio}
              onChangeText={(v) => setBio(v.slice(0, BIO_MAX_LENGTH))}
              placeholder="Tell other travelers about yourself..."
              placeholderTextColor={MUTED}
              multiline
              maxLength={BIO_MAX_LENGTH}
              editable={!busy}
              accessibilityLabel="Bio"
            />
            <Text style={styles.hint}>
              {bio.length}/{BIO_MAX_LENGTH}
            </Text>

            <Text style={[styles.sectionTitle, styles.interestsTitle]}>Travel interests</Text>
            <Text style={styles.hint}>Pick activities and travel styles you enjoy.</Text>
            <View style={styles.chipWrap}>
              {TRAVELER_INTEREST_TAGS.map((tag) => {
                const selected = interestTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.choiceChip, selected && styles.choiceChipOn]}
                    onPress={() =>
                      setInterestTags((prev) =>
                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                      )
                    }
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextOn]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

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
      <BirthdayPickerModal
        visible={birthdayPickerOpen}
        initialDate={birthday ? new Date(`${birthday}T12:00:00`) : new Date(2000, 0, 1)}
        onClose={() => setBirthdayPickerOpen(false)}
        onConfirm={(date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          setBirthday(`${y}-${m}-${d}`);
          setBirthdayPickerOpen(false);
        }}
        bottomInset={insets.bottom}
      />
      <Modal
        visible={locationPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={closeLocationPicker}
      >
        <View style={styles.locModalOverlay}>
          <View style={[styles.locModalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.locModalHeader}>
              <Text style={styles.locModalTitle}>Select City / Municipality</Text>
              <TouchableOpacity
                onPress={closeLocationPicker}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Close location picker"
              >
                <JamIcon ionicon="close" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.locSearchInput}
              value={locationSearch}
              onChangeText={setLocationSearch}
              placeholder="Search Cavite cities & towns…"
              placeholderTextColor={MUTED}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            <ScrollView style={styles.locList} keyboardShouldPersistTaps="handled">
              {city ? (
                <TouchableOpacity
                  style={[styles.locItem, styles.locItemClear]}
                  onPress={() => {
                    setCity('');
                    closeLocationPicker();
                  }}
                >
                  <Text style={styles.locItemClearText}>Clear location</Text>
                </TouchableOpacity>
              ) : null}
              {filteredLocations.map((opt) => {
                const selected = city.toLowerCase() === opt.label.toLowerCase();
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.locItem, selected && styles.locItemSelected]}
                    onPress={() => {
                      setCity(opt.label);
                      closeLocationPicker();
                    }}
                  >
                    <Text style={[styles.locItemText, selected && styles.locItemTextSelected]}>
                      {opt.label}
                    </Text>
                    {selected ? <JamIcon ionicon="checkmark" size={18} color={TEAL} /> : null}
                  </TouchableOpacity>
                );
              })}
              {filteredLocations.length === 0 ? (
                <View style={styles.locEmpty}>
                  <Text style={styles.locEmptyText}>No locations match "{locationSearch}"</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
  coverSection: {
    marginTop: 8,
    marginBottom: 0,
  },
  coverBanner: {
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    width: '100%',
    height: '100%',
  },
  coverBtnRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 0,
  },
  coverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
  },
  coverBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: TEAL,
  },
  coverRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  coverRemoveBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#b91c1c',
  },
  avatarWrap: {
    alignSelf: 'center',
    marginTop: -56,
    marginBottom: 12,
    width: 112,
    height: 112,
  },
  avatarRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    overflow: 'hidden',
    backgroundColor: '#e8ecef',
    borderWidth: 3,
    borderColor: '#fff',
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
  inputTouchable: {
    marginTop: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
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
    borderTopColor: BORDER,
  },
  interestsTitle: {
    marginTop: 20,
  },
  chipGroupLabel: {
    marginTop: 12,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#525252',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  choiceChip: {
    borderRadius: 20,
    backgroundColor: '#F1F7F6',
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  choiceChipOn: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  choiceChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#404040',
    textAlign: 'center',
  },
  choiceChipTextOn: {
    color: '#fff',
  },
  notesInput: {
    marginTop: 6,
    minHeight: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: TITLE,
    textAlignVertical: 'top',
  },
  locModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  locModalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  locModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  locModalTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: TITLE,
  },
  locSearchInput: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: TITLE,
    backgroundColor: '#f9fafb',
    marginBottom: 12,
  },
  locList: {
    maxHeight: 320,
  },
  locItem: {
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locItemSelected: {
    backgroundColor: '#f0fdf4',
  },
  locItemText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: TITLE,
  },
  locItemTextSelected: {
    fontFamily: 'Inter_600SemiBold',
    color: TEAL,
  },
  locItemClear: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    marginBottom: 6,
  },
  locItemClearText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#b91c1c',
  },
  locEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  locEmptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: MUTED,
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
