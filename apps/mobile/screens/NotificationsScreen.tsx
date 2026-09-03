import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  fetchPublishedAnnouncements,
  groupAnnouncementsByDay,
  markAnnouncementsRead,
} from 'cavitour-shared/announcements';
import { JamIcon } from '../components/JamIcon';
import type { JamIconName } from '../lib/jamSvgMap';
import { supabase } from '../lib/supabase';

const HEADER_GREEN = '#10A37F';
const DATE_TEAL = '#1B8A70';
const MUTED = '#7A7878';
const ALERT_AMBER = '#C47B17';
const H_PAD = 16;

type AnnouncementItem = {
  id: string;
  kind: string;
  title: string;
  place: string;
  body: string;
};

type AnnouncementGroup = {
  group: string;
  timeLabel: string;
  items: AnnouncementItem[];
};

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<AnnouncementGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
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
          rows.map((row: AnnouncementItem) => row.id)
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notifications.');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const iconFor = (kind: string): { name: JamIconName; color: string } =>
    kind === 'advisory' ? { name: 'alert', color: ALERT_AMBER } : { name: 'bell', color: DATE_TEAL };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_GREEN} />
      <View style={[styles.greenHeader, { paddingTop: insets.top + 10, paddingBottom: 14 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerSide}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <JamIcon name="chevron-left" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} pointerEvents="none">
            Notifications
          </Text>
          <View style={styles.headerSide} />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={HEADER_GREEN} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {groups.length === 0 && !error ? (
            <Text style={styles.empty}>No announcements yet.</Text>
          ) : null}
          {groups.map((item) => (
            <View key={item.group} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{item.group}</Text>
                <Text style={styles.groupTime}>{item.timeLabel}</Text>
              </View>
              {item.items.map((n: AnnouncementItem) => {
                const icon = iconFor(n.kind);
                const expanded = expandedId === n.id;
                return (
                  <TouchableOpacity
                    key={n.id}
                    activeOpacity={0.85}
                    style={styles.card}
                    onPress={() => setExpandedId(expanded ? null : n.id)}
                    accessibilityLabel={`${n.title}, ${n.body}`}
                    accessibilityRole="button"
                  >
                    <View style={styles.iconSlot}>
                      <JamIcon name={icon.name} size={20} color={icon.color} />
                    </View>
                    <View style={styles.textBlock}>
                      <Text style={styles.cardTitle}>{n.title}</Text>
                      {n.place ? <Text style={styles.cardPlace}>{n.place}</Text> : null}
                      <Text style={styles.cardBody} numberOfLines={expanded ? undefined : 2}>
                        {n.body}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  greenHeader: {
    backgroundColor: HEADER_GREEN,
    paddingHorizontal: H_PAD,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSide: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins_500Medium',
    fontSize: 18,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 12,
    paddingBottom: 28,
  },
  empty: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: MUTED,
    marginTop: 12,
  },
  error: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#E76365',
    marginBottom: 12,
  },
  group: {
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 17,
    lineHeight: 22,
    color: DATE_TEAL,
  },
  groupTime: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    lineHeight: 14,
    color: MUTED,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 2,
    elevation: 2,
  },
  iconSlot: {
    width: 28,
    alignItems: 'center',
    paddingTop: 1,
    marginRight: 8,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: '#000000',
    marginBottom: 2,
  },
  cardPlace: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 14,
    color: DATE_TEAL,
    marginBottom: 2,
  },
  cardBody: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    lineHeight: 14,
    color: MUTED,
  },
});

export default NotificationsScreen;
