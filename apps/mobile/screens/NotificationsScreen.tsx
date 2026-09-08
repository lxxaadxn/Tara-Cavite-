import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  announcementNotificationSummary,
  fetchPublishedAnnouncements,
  groupAnnouncementsByDay,
  markAnnouncementsRead,
} from 'cavitour-shared/announcements';
import { Header } from '../components/Header';
import { NotificationGlyph } from '../components/NotificationGlyph';
import { navigateNamed } from '../lib/navigateNamed';
import { supabase } from '../lib/supabase';

const PANEL_BG = '#F1F7F6';
const INK = '#16352E';
const TEAL = '#1B8A70';
const MUTED = '#707D7D';
const SKELETON = 'rgba(212, 212, 212, 0.8)';
const H_PAD = 12;

/** Same limit as web `NotificationsPopover`. */
const NOTIFICATION_BODY_WORD_LIMIT = 28;

type AnnouncementItem = {
  id: string;
  kind: string;
  title: string;
  place: string;
  venueName?: string;
  body: string;
};

type AnnouncementGroup = {
  group: string;
  timeLabel: string;
  items: AnnouncementItem[];
};

function truncateWords(text: string, limit: number): { text: string; truncated: boolean } {
  const raw = String(text ?? '').trim();
  if (!raw) return { text: '', truncated: false };
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length <= limit) return { text: raw, truncated: false };
  return { text: words.slice(0, limit).join(' '), truncated: true };
}

function Skel({ style }: { style?: object }) {
  return <View style={[styles.skel, style]} />;
}

function NotificationsSkeleton() {
  return (
    <View accessibilityLabel="Loading notifications">
      {[0, 1].map((group) => (
        <View key={group} style={styles.group}>
          <View style={styles.groupHeader}>
            <Skel style={styles.skelGroupTitle} />
            <Skel style={styles.skelGroupTime} />
          </View>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.row}>
              <Skel style={styles.skelGlyph} />
              <View style={styles.rowText}>
                <Skel style={styles.skelLine} />
                <Skel style={styles.skelLineShort} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Mirrors the web notifications popover: flat rows on a mint panel, 28-word previews. */
const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [groups, setGroups] = useState<AnnouncementGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const rows = (await fetchPublishedAnnouncements(supabase)) as AnnouncementItem[];
      setGroups(groupAnnouncementsByDay(rows) as AnnouncementGroup[]);
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (userId && rows.length) {
        await markAnnouncementsRead(
          supabase,
          userId,
          rows.map((row) => row.id)
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notifications.');
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openAnnouncement = (id: string) => {
    navigateNamed(navigation, 'Announcements', { focusId: id });
  };

  return (
    <View style={styles.safe}>
      <Header title="Notifications" showBack darkBackground />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={TEAL}
            colors={[TEAL]}
          />
        }
      >
        {loading ? (
          <NotificationsSkeleton />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : groups.length === 0 ? (
          <Text style={styles.empty}>No announcements yet.</Text>
        ) : (
          groups.map((group) => (
            <View key={group.group} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{group.group}</Text>
                <Text style={styles.groupTime}>{group.timeLabel}</Text>
              </View>
              {group.items.map((item) => {
                const summary = announcementNotificationSummary(item);
                const preview = item.body
                  ? truncateWords(item.body, NOTIFICATION_BODY_WORD_LIMIT)
                  : null;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.row}
                    onPress={() => openAnnouncement(item.id)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={preview?.text ? `${summary}. ${preview.text}` : summary}
                  >
                    <View style={styles.glyphSlot}>
                      <NotificationGlyph kind={item.kind} size={20} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{summary}</Text>
                      {preview?.text ? (
                        <Text style={styles.rowBody}>
                          {preview.text}
                          {preview.truncated ? (
                            <Text style={styles.seeMore}> see more..</Text>
                          ) : null}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PANEL_BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 14,
    paddingBottom: 28,
  },
  group: {
    marginBottom: 20,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  groupTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: TEAL,
  },
  groupTime: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    lineHeight: 16,
    color: MUTED,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  glyphSlot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PANEL_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: INK,
  },
  rowBody: {
    marginTop: 2,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
  },
  seeMore: {
    fontFamily: 'Poppins_600SemiBold',
    color: TEAL,
  },
  empty: {
    paddingHorizontal: 4,
    paddingVertical: 24,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: MUTED,
  },
  error: {
    paddingHorizontal: 4,
    paddingVertical: 24,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#DC2626',
  },
  skel: {
    borderRadius: 8,
    backgroundColor: SKELETON,
  },
  skelGroupTitle: {
    height: 16,
    width: 80,
  },
  skelGroupTime: {
    height: 12,
    width: 64,
  },
  skelGlyph: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginTop: 2,
  },
  skelLine: {
    height: 16,
    alignSelf: 'stretch',
  },
  skelLineShort: {
    height: 12,
    width: 160,
    maxWidth: '100%',
    marginTop: 8,
  },
});

export default NotificationsScreen;
