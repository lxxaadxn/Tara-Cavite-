import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { User } from '@supabase/supabase-js';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JamIcon } from '../components/JamIcon';
import { supabase } from '../lib/supabase';
import {
  DESTINATION_REACHED_UPDATED_EVENT,
  getAllDestinationReachedEntries,
  getThisMonthDestinationReachedEntries,
  type DestinationReachedEntry,
} from '../lib/destinationReachedActivity';
import { fetchSavedItemCountsByListId } from '../lib/savedListItems';
import {
  hasCustomAvatarFromSources,
  resolveAvatarFromSources,
} from 'cavitour-shared/defaultAvatar';

const PAGE_BG = '#f4f7f9';
const CARD_WHITE = '#ffffff';
const TITLE = '#171717';
const MUTED = '#737373';
const TEAL = '#1f4f59';
const OLIVE = '#7ea00e';
const SIGN_OUT_RED = '#b91c1c';

const ACCENT = {
  pink: '#f4b0b0',
  teal: '#98d8d1',
  green: '#d4ed91',
};

const PLACEHOLDER_VISIT_IMG =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80';

type ProfileView = {
  name: string;
  nickname: string;
  roleLabel: string;
  city: string;
  email: string;
  avatarUri: string;
  hasCustomPhoto: boolean;
};

type SavedListRow = {
  id: string;
  name: string;
  place_count: number;
  updated_at?: string;
  type: 'private' | 'shared';
};

function deriveProfile(user: User | null, profileRow: Record<string, unknown> | null): ProfileView {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const nickname =
    (profileRow?.username as string) ||
    (meta.nickname as string) ||
    (meta.username as string) ||
    (user?.email ? user.email.split('@')[0] : '') ||
    'Tara, Cavite! User';
  const fullName =
    (meta.full_name as string) ||
    (meta.name as string) ||
    [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
    nickname;
  const created = user?.created_at ? new Date(user.created_at) : null;
  const daysOnPlatform = created
    ? Math.max(1, Math.floor((Date.now() - created.getTime()) / 86400000))
    : 0;
  return {
    name: fullName,
    nickname,
    roleLabel: daysOnPlatform
      ? `Traveler · ${daysOnPlatform} days on the platform`
      : 'Traveler',
    city: (profileRow?.city as string) || (meta.city as string) || '',
    email: user?.email || 'No email on account',
    avatarUri: resolveAvatarFromSources(
      profileRow as { avatar_url?: string | null },
      meta
    ),
    hasCustomPhoto: hasCustomAvatarFromSources(
      profileRow as { avatar_url?: string | null },
      meta
    ),
  };
}

function formatUpdatedLabel(iso?: string | null): string {
  if (!iso) return 'No recent activity';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'No recent activity';
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const time = d
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
    .toLowerCase();
  return `Update: ${date}, ${time}`;
}

function latestIsoFromEntries(entries: DestinationReachedEntry[]): string | null {
  let latest: string | null = null;
  for (const e of entries) {
    if (!e.savedAt) continue;
    if (!latest || e.savedAt > latest) latest = e.savedAt;
  }
  return latest;
}

function latestIsoFromLists(lists: SavedListRow[]): string | null {
  let latest: string | null = null;
  for (const list of lists) {
    if (list.updated_at && (!latest || list.updated_at > latest)) latest = list.updated_at;
  }
  return latest;
}

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

function SummaryCard({
  title,
  count,
  bg,
  updatedLabel,
  onPress,
}: {
  title: string;
  count: number;
  bg: string;
  updatedLabel: string;
  onPress?: () => void;
}) {
  const inner = (
    <View style={[styles.summaryCard, { backgroundColor: bg }]}>
      <Text style={styles.summaryCardTitle}>{title}</Text>
      <View style={styles.summaryCardFooter}>
        <Text style={styles.summaryCardUpdated} numberOfLines={2}>
          {updatedLabel}
        </Text>
        <View style={styles.summaryCardBadge}>
          <Text style={styles.summaryCardBadgeText}>{count}</Text>
        </View>
      </View>
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.88} accessibilityRole="button">
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

function RecentVisitCard({
  card,
  onPress,
}: {
  card: DestinationReachedEntry;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.visitCard}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={card.name}
    >
      <View style={styles.visitCardImageWrap}>
        <Image
          source={{ uri: card.image || PLACEHOLDER_VISIT_IMG }}
          style={styles.visitCardImage}
          resizeMode="cover"
        />
        <View style={styles.visitCardBadge}>
          <Text style={styles.visitCardBadgeText}>Visited</Text>
        </View>
      </View>
      <View style={styles.visitCardBody}>
        <Text style={styles.visitCardName} numberOfLines={1}>
          {card.name}
        </Text>
        <Text style={styles.visitCardSub} numberOfLines={2}>
          Destination reached this month
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function PublicListCard({
  list,
  onPress,
}: {
  list: SavedListRow;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.visitCard}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={list.name}
    >
      <View style={[styles.visitCardImageWrap, styles.publicListCover]}>
        <JamIcon ionicon="bookmark" size={32} color={TEAL} />
        <View style={[styles.visitCardBadge, styles.publicListBadge]}>
          <Text style={[styles.visitCardBadgeText, styles.publicListBadgeText]}>Public</Text>
        </View>
      </View>
      <View style={styles.visitCardBody}>
        <Text style={styles.visitCardName} numberOfLines={1}>
          {list.name}
        </Text>
        <Text style={styles.visitCardSub}>
          {list.place_count} {list.place_count === 1 ? 'place' : 'places'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileView>(() => deriveProfile(null, null));
  const [lists, setLists] = useState<SavedListRow[]>([]);
  const [monthVisits, setMonthVisits] = useState<DestinationReachedEntry[]>([]);
  const [allTimeVisitCount, setAllTimeVisitCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfileData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);

      if (!u) {
        setProfile(deriveProfile(null, null));
        setLists([]);
        setMonthVisits([]);
        setAllTimeVisitCount(0);
        return;
      }

      const { data: profileRow } = await supabase
        .from('user_profiles')
        .select('username, avatar_url, city, phone')
        .eq('id', u.id)
        .maybeSingle();

      setProfile(deriveProfile(u, profileRow ?? null));

      const [monthEntries, allEntries] = await Promise.all([
        getThisMonthDestinationReachedEntries(u.id),
        getAllDestinationReachedEntries(u.id),
      ]);
      setMonthVisits(monthEntries);
      setAllTimeVisitCount(allEntries.length);

      const { data: listRows, error } = await supabase
        .from('saved_lists')
        .select('id, name, type, updated_at, created_at')
        .eq('user_id', u.id)
        .order('updated_at', { ascending: false });

      if (error || !listRows?.length) {
        setLists([]);
        return;
      }

      const listIds = listRows.map((l) => l.id);
      let counts: Record<string, number> = {};
      try {
        counts = await fetchSavedItemCountsByListId(supabase, listIds);
      } catch {
        counts = {};
      }

      setLists(
        listRows.map((l) => ({
          id: l.id,
          name: l.name,
          type: l.type as 'private' | 'shared',
          place_count: counts[l.id] ?? 0,
          updated_at: l.updated_at ?? l.created_at,
        }))
      );
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
    return () => sub.remove();
  }, [loadProfileData]);

  const savedPlaceCount = useMemo(
    () => lists.reduce((sum, l) => sum + l.place_count, 0),
    [lists]
  );
  const publicLists = useMemo(() => lists.filter((l) => l.type === 'shared'), [lists]);
  const recentVisits = useMemo(() => monthVisits.slice(0, 6), [monthVisits]);

  const summaryMeta = useMemo(
    () => ({
      monthUpdated: formatUpdatedLabel(latestIsoFromEntries(monthVisits)),
      savedUpdated: formatUpdatedLabel(latestIsoFromLists(lists)),
      publicUpdated: formatUpdatedLabel(latestIsoFromLists(publicLists)),
    }),
    [monthVisits, lists, publicLists]
  );

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

  const openPlace = (placeId: string) => {
    (navigation as { navigate: (name: string, params: object) => void }).navigate('AboutEstablishment', {
      placeId,
    });
  };

  const openList = (list: SavedListRow) => {
    (navigation as { navigate: (name: string, params: object) => void }).navigate('SavedListDetail', {
      listId: list.id,
      list: {
        id: list.id,
        name: list.name,
        icon_name: 'bookmark',
        type: list.type,
      },
    });
  };

  const scrollBottom = Math.max(insets.bottom, 12) + 24;
  const showAvatarImage = profile.hasCustomPhoto && profile.avatarUri.startsWith('http');

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

        {/* Header card — matches web mobile profile */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.avatarBlock}>
              {showAvatarImage ? (
                <Image
                  source={{ uri: profile.avatarUri }}
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
                onPress={() => navigation.navigate('UserDetails' as never)}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
              >
                <JamIcon name="pencil" size={14} color={MUTED} />
              </TouchableOpacity>
            </View>

            <View style={styles.headerTextCol}>
              <View style={styles.headerTitleRow}>
                <View style={styles.headerTitleWrap}>
                  <Text style={styles.nickname} numberOfLines={2}>
                    {profile.nickname || 'Add nickname in Edit profile'}
                  </Text>
                  <Text style={styles.roleLabel}>{profile.roleLabel}</Text>
                </View>
                <TouchableOpacity
                  style={styles.headerEditIcon}
                  onPress={() => navigation.navigate('UserDetails' as never)}
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile"
                >
                  <JamIcon name="pencil" size={16} color={TITLE} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <JamIcon ionicon="person-outline" size={16} color="#a3a3a3" />
              <Text style={styles.infoText} numberOfLines={2}>
                {profile.name}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <JamIcon name="document" size={16} color="#a3a3a3" />
              <Text style={styles.infoText} numberOfLines={1}>
                {profile.email}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <JamIcon ionicon="location-outline" size={16} color="#a3a3a3" />
              <Text style={styles.infoText}>{profile.city || 'Cavite, Philippines'}</Text>
            </View>
            <View style={styles.infoRow}>
              <JamIcon name="world" size={16} color="#a3a3a3" />
              <Text style={styles.infoText}>Tara, Cavite! traveler</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <ProfileStatBar label="Saved places" value={savedPlaceCount} color={ACCENT.pink} />
            <ProfileStatBar label="Destinations reached" value={allTimeVisitCount} color={ACCENT.teal} />
            <ProfileStatBar label="Public collections" value={publicLists.length} color={ACCENT.green} />
          </View>
        </View>

        {/* My Summary */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Summary</Text>
            <View style={styles.sectionPill}>
              <Text style={styles.sectionPillText}>This month</Text>
            </View>
          </View>
          <View style={styles.summaryGrid}>
            <SummaryCard
              title="Visits this month"
              count={monthVisits.length}
              bg={ACCENT.green}
              updatedLabel={summaryMeta.monthUpdated}
            />
            <SummaryCard
              title="Saved places"
              count={savedPlaceCount}
              bg={ACCENT.teal}
              updatedLabel={summaryMeta.savedUpdated}
              onPress={() => navigation.navigate('SavedList' as never)}
            />
            <SummaryCard
              title="Public collections"
              count={publicLists.length}
              bg={ACCENT.pink}
              updatedLabel={summaryMeta.publicUpdated}
              onPress={() => navigation.navigate('SavedList' as never)}
            />
          </View>
        </View>

        {/* Recent visits */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent visits ({monthVisits.length})</Text>
            <View style={styles.sectionPill}>
              <Text style={styles.sectionPillText}>This month</Text>
            </View>
          </View>
          {recentVisits.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.visitScroll}
            >
              {recentVisits.map((card) => (
                <RecentVisitCard key={card.id} card={card} onPress={() => openPlace(card.id)} />
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyHint}>
              You haven&apos;t reached a destination yet. After a trip, open Directions and tap
              &quot;Destination Reached&quot;.
            </Text>
          )}
        </View>

        {publicLists.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Public collections ({publicLists.length})</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('SavedList' as never)}
                style={styles.manageLink}
                accessibilityRole="button"
              >
                <Text style={styles.manageLinkText}>Manage saved</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.visitScroll}
            >
              {publicLists.map((list) => (
                <PublicListCard key={list.id} list={list} onPress={() => openList(list)} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={styles.signOutBtnText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={styles.footerTag}>Tara, Cavite! · Explore Cavite & beyond</Text>
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
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#e8ecef',
  },
  avatarPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 56,
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
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
    paddingTop: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerEditIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: CARD_WHITE,
    alignItems: 'center',
    justifyContent: 'center',
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
  infoGrid: {
    marginTop: 18,
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
    gap: 10,
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0f0f0',
  },
  statBar: {
    flex: 1,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: TITLE,
    flexShrink: 1,
  },
  sectionPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fafafa',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sectionPillText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    fontWeight: '600',
    color: '#525252',
  },
  summaryGrid: {
    gap: 10,
  },
  summaryCard: {
    minHeight: 130,
    borderRadius: 22,
    padding: 16,
    justifyContent: 'space-between',
  },
  summaryCardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#262626',
  },
  summaryCardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 16,
  },
  summaryCardUpdated: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(38, 38, 38, 0.75)',
  },
  summaryCardBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  summaryCardBadgeText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: TITLE,
  },
  visitScroll: {
    gap: 12,
    paddingRight: 4,
  },
  visitCard: {
    width: 168,
    borderRadius: 22,
    backgroundColor: CARD_WHITE,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  visitCardImageWrap: {
    aspectRatio: 4 / 3,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  visitCardImage: {
    width: '100%',
    height: '100%',
  },
  visitCardBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    backgroundColor: OLIVE,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  visitCardBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#fff',
  },
  visitCardBody: {
    padding: 12,
  },
  visitCardName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: TITLE,
  },
  visitCardSub: {
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: MUTED,
    lineHeight: 15,
  },
  publicListCover: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4f6',
  },
  publicListBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  publicListBadgeText: {
    color: TEAL,
  },
  emptyHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  manageLink: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d4d4d4',
    backgroundColor: CARD_WHITE,
  },
  manageLinkText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#404040',
  },
  signOutBtn: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  signOutBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: SIGN_OUT_RED,
  },
  footerTag: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 8,
  },
});

export default ProfileScreen;
