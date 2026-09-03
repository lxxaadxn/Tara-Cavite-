import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useState, useCallback, useEffect } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  DeviceEventEmitter,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JamIcon } from '../components/JamIcon';
import { supabase } from '../lib/supabase';
import {
  DESTINATION_REACHED_UPDATED_EVENT,
  getAllDestinationReachedEntries,
} from '../lib/destinationReachedActivity';
import { fetchPlaceCountByListId } from '../lib/savedListItems';
import { fetchProfileActivity } from '../lib/profileActivity';
import {
  AVATAR_UPDATED_EVENT,
  deriveProfile,
  displayBirthday,
  emitAvatarUpdated,
  fetchProfileRow,
  removeUserAvatar,
  type TravelerProfileView,
  usernameForRow,
} from '../lib/travelerProfile';
import { getFloatingTabBarScrollPadding } from '../lib/mainTabBarStyle';

const PAGE_BG = '#F1F7F6';
const CARD_WHITE = '#ffffff';
const TITLE = '#171717';
const MUTED = '#737373';
const TEAL = '#1B8A70';
const OLIVE = '#10A37F';
const SIGN_OUT_RED = '#b91c1c';

const ACCENT = {
  pink: '#f4b0b0',
  teal: '#98d8d1',
  mint: '#b8e0d4',
  green: '#d4ed91',
};

function ProfileStatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statBar}>
      <Text style={styles.statBarLabel} numberOfLines={2}>
        {label}
      </Text>
      <Text style={styles.statBarValue}>{value}</Text>
      <View style={[styles.statBarLine, { backgroundColor: color }]} />
    </View>
  );
}

function AboutMeta({
  name,
  children,
}: {
  name: 'user' | 'document' | 'world' | 'map-marker' | 'calendar';
  children: string;
}) {
  return (
    <View style={styles.infoRow}>
      <JamIcon name={name} size={16} color={TEAL} />
      <Text style={styles.infoText} numberOfLines={2}>
        {children}
      </Text>
    </View>
  );
}

function SettingsRow({
  label,
  hint,
  onPress,
}: {
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.settingsRow}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.settingsCopy}>
        <Text style={styles.settingsRowLabel}>{label}</Text>
        <Text style={styles.settingsHint}>{hint}</Text>
      </View>
      <JamIcon ionicon="chevron-forward" size={16} color="#a3a3a3" />
    </TouchableOpacity>
  );
}

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<TravelerProfileView>(() => deriveProfile(null, null));
  const [allTimeVisitCount, setAllTimeVisitCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [checkinCount, setCheckinCount] = useState(0);
  const [savedPlaceCount, setSavedPlaceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadProfileData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const {
        data: { user: u },
      } = await supabase.auth.getUser();

      if (!u) {
        setProfile(deriveProfile(null, null));
        setAllTimeVisitCount(0);
        setReviewCount(0);
        setCheckinCount(0);
        setSavedPlaceCount(0);
        return;
      }

      const profileRow = await fetchProfileRow(supabase, u.id);
      setProfile(deriveProfile(u, profileRow));

      const [allEntries, activity, listResult] = await Promise.all([
        getAllDestinationReachedEntries(u.id),
        fetchProfileActivity(supabase, u.id),
        supabase.from('saved_lists').select('id').eq('user_id', u.id),
      ]);
      setAllTimeVisitCount(allEntries.length);
      setReviewCount(activity.reviewCount);
      setCheckinCount(activity.checkinCount);

      const listIds = (listResult.data ?? []).map((l) => String(l.id));
      if (!listIds.length || listResult.error) {
        setSavedPlaceCount(0);
        return;
      }
      try {
        const placeCounts = await fetchPlaceCountByListId(supabase, listIds);
        setSavedPlaceCount(Object.values(placeCounts).reduce((sum, n) => sum + n, 0));
      } catch {
        setSavedPlaceCount(0);
      }
    } catch (e) {
      console.error('Profile load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfileData(false);
    }, [loadProfileData])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DESTINATION_REACHED_UPDATED_EVENT, () => {
      void loadProfileData(true);
    });
    const avatarSub = DeviceEventEmitter.addListener(AVATAR_UPDATED_EVENT, () => {
      void loadProfileData(true);
    });
    return () => {
      sub.remove();
      avatarSub.remove();
    };
  }, [loadProfileData]);

  const openEdit = (focusPassword = false) => {
    (navigation as { navigate: (name: string, params?: object) => void }).navigate('UserDetails', {
      focusPassword,
    });
  };

  const pickImage = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
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
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const nick = usernameForRow({ nickname: profile.nickname, name: profile.name }, user);

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
      await loadProfileData(true);
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
        {
          text: 'Remove photo',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setUploading(true);
              try {
                await removeUserAvatar(supabase, profile.nickname);
                await loadProfileData(true);
              } catch (e) {
                Alert.alert('Edit profile', e instanceof Error ? e.message : 'Could not remove photo.');
              } finally {
                setUploading(false);
              }
            })();
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Sign out?', 'You will need to sign in again to access your profile and saved lists.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.auth.signOut();
            await AsyncStorage.removeItem('isAuthenticated');
          } catch {
            Alert.alert('Error', 'Could not sign out. Please try again.');
          }
        },
      },
    ]);
  };

  const scrollBottom = getFloatingTabBarScrollPadding(insets.bottom);
  const showAvatarImage = profile.hasCustomPhoto && profile.avatarUrl.startsWith('http');

  if (loading && !refreshing) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={OLIVE} />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: scrollBottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadProfileData(true)}
            tintColor={OLIVE}
            colors={[OLIVE]}
          />
        }
      >
        <Text style={styles.screenTitle}>Profile</Text>

        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.avatarBlock}>
              {showAvatarImage ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={styles.avatar}
                  resizeMode="cover"
                  accessibilityLabel="Profile picture"
                />
              ) : (
                <View style={styles.avatarPlaceholder} accessibilityLabel="Default profile picture">
                  <JamIcon ionicon="person" size={40} color="#b8c4ce" />
                </View>
              )}
              <TouchableOpacity
                style={styles.avatarEditBtn}
                onPress={() => void pickImage()}
                disabled={uploading}
                accessibilityRole="button"
                accessibilityLabel="Upload profile photo"
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={MUTED} />
                ) : (
                  <JamIcon name="pencil" size={14} color={MUTED} />
                )}
              </TouchableOpacity>
              {profile.hasCustomPhoto ? (
                <TouchableOpacity
                  style={styles.avatarRemoveBtn}
                  onPress={confirmRemoveAvatar}
                  disabled={uploading}
                  accessibilityRole="button"
                  accessibilityLabel="Remove profile photo"
                >
                  <JamIcon ionicon="trash-outline" size={14} color={SIGN_OUT_RED} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.headerTextCol}>
              <Text style={styles.nickname} numberOfLines={2}>
                {profile.nickname || 'Add nickname in Edit profile'}
              </Text>
              <Text style={styles.roleLabel}>{profile.roleLabel}</Text>
              {profile.city ? <Text style={styles.cityLine}>{profile.city}</Text> : null}
              <View style={styles.identityActions}>
                <TouchableOpacity
                  style={styles.editProfileBtn}
                  onPress={() => openEdit(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile"
                >
                  <Text style={styles.editProfileBtnText}>Edit profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.signOutBtn}
                  onPress={handleLogout}
                  accessibilityRole="button"
                  accessibilityLabel="Sign out"
                >
                  <Text style={styles.signOutBtnText}>Sign out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.statsRow}>
            <ProfileStatBar label="Destinations" value={allTimeVisitCount} color={ACCENT.teal} />
            <ProfileStatBar label="Reviews" value={reviewCount} color={ACCENT.mint} />
            <ProfileStatBar label="Check-ins" value={checkinCount} color={ACCENT.green} />
            <ProfileStatBar label="Saved places" value={savedPlaceCount} color={ACCENT.pink} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, styles.sectionTitleSolo]}>About</Text>
          <View style={styles.infoGrid}>
            <AboutMeta name="user">{profile.name}</AboutMeta>
            <AboutMeta name="document">{profile.email}</AboutMeta>
            <AboutMeta name="world">{profile.phone || 'Add phone in Edit profile'}</AboutMeta>
            <AboutMeta name="map-marker">{profile.city || 'Add city in Edit profile'}</AboutMeta>
            <AboutMeta name="calendar">
              {displayBirthday(profile.birthday) || 'Add birthday in Edit profile'}
            </AboutMeta>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, styles.sectionTitleSolo]}>Account settings</Text>
          <SettingsRow
            label="Notifications"
            hint="Alerts from LGUs and your trips"
            onPress={() => (navigation as { navigate: (name: string) => void }).navigate('Notifications')}
          />
          <SettingsRow
            label="Privacy"
            hint="How your account and lists are shown"
            onPress={() => (navigation as { navigate: (name: string) => void }).navigate('Privacy')}
          />
          <SettingsRow
            label="Change password"
            hint="Update the password for this email"
            onPress={() => openEdit(true)}
          />
        </View>

        <TouchableOpacity
          style={styles.historyCard}
          onPress={() => (navigation as { navigate: (name: string) => void }).navigate('SavedList')}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Saved lists"
        >
          <View style={styles.historyIcon}>
            <JamIcon name="heart" size={18} color={TEAL} />
          </View>
          <View style={styles.settingsCopy}>
            <Text style={styles.settingsRowLabel}>Saved</Text>
            <Text style={styles.settingsHint}>Places and itineraries you kept for later.</Text>
          </View>
          <JamIcon ionicon="chevron-forward" size={16} color="#a3a3a3" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.historyCard}
          onPress={() => (navigation as { navigate: (name: string) => void }).navigate('TravelHistory')}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Travel history"
        >
          <View style={styles.historyIcon}>
            <JamIcon name="clock" size={18} color={TEAL} />
          </View>
          <View style={styles.settingsCopy}>
            <Text style={styles.settingsRowLabel}>Travel history</Text>
            <Text style={styles.settingsHint}>Places you have reached and checked in.</Text>
          </View>
          <JamIcon ionicon="chevron-forward" size={16} color="#a3a3a3" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  android: { elevation: 3 },
  default: {},
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: MUTED,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  screenTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: TITLE,
    marginBottom: 14,
  },
  card: {
    backgroundColor: CARD_WHITE,
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
    ...cardShadow,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  avatarBlock: {
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e8ecef',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e8ecef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBtn: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CARD_WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  avatarRemoveBtn: {
    position: 'absolute',
    left: -4,
    bottom: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
    paddingTop: 4,
  },
  nickname: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    lineHeight: 28,
    color: TITLE,
  },
  roleLabel: {
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: MUTED,
  },
  cityLine: {
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#404040',
  },
  identityActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  editProfileBtn: {
    borderRadius: 999,
    backgroundColor: '#F1F7F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editProfileBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#404040',
  },
  infoGrid: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 24,
  },
  infoText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#525252',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBar: {
    width: '47%',
    flexGrow: 1,
    minWidth: 0,
  },
  statBarLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 14,
    color: MUTED,
    minHeight: 28,
  },
  statBarValue: {
    marginTop: 6,
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    lineHeight: 30,
    color: TITLE,
  },
  statBarLine: {
    marginTop: 8,
    height: 4,
    borderRadius: 2,
    alignSelf: 'stretch',
  },
  sectionTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: TITLE,
    flexShrink: 1,
  },
  sectionTitleSolo: {
    marginBottom: 14,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  settingsCopy: {
    flex: 1,
    minWidth: 0,
  },
  settingsRowLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: TITLE,
  },
  settingsHint: {
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: MUTED,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD_WHITE,
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
    ...cardShadow,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PAGE_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  signOutBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: SIGN_OUT_RED,
  },
});

export default ProfileScreen;
