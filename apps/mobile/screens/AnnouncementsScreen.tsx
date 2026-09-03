import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchPublishedAnnouncements,
  formatAnnouncementDateLabel,
} from 'cavitour-shared/announcements';
import { JamIcon } from '../components/JamIcon';
import { supabase } from '../lib/supabase';
import { getFloatingTabBarScrollPadding } from '../lib/mainTabBarStyle';

const PAGE_BG = '#F1F7F6';
const TEAL = '#1B8A70';
const INK = '#171717';
const MUTED = '#737373';
const ALERT_AMBER = '#C47B17';

type AnnouncementItem = {
  id: string;
  kind: string;
  title: string;
  place: string;
  body: string;
  publishedAt?: string;
};

const AnnouncementsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = (await fetchPublishedAnnouncements(supabase)) as AnnouncementItem[];
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load announcements.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.pageHeader}>
        <Text style={styles.title}>Announcements</Text>
        <Text style={styles.subtitle}>
          Events and travel notices from Cavite LGUs and tourism partners.
        </Text>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={TEAL} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: getFloatingTabBarScrollPadding(insets.bottom) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!error && items.length === 0 ? (
            <Text style={styles.empty}>No announcements yet. Check back soon.</Text>
          ) : null}
          {items.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.glyph}>
                <JamIcon
                  name={item.kind === 'advisory' ? 'alert' : 'bell'}
                  size={20}
                  color={item.kind === 'advisory' ? ALERT_AMBER : TEAL}
                />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.publishedAt ? (
                    <Text style={styles.cardDate}>{formatAnnouncementDateLabel(item.publishedAt)}</Text>
                  ) : null}
                </View>
                {item.place ? <Text style={styles.cardPlace}>{item.place}</Text> : null}
                <Text style={styles.cardCopy}>{item.body}</Text>
              </View>
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
    backgroundColor: PAGE_BG,
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    color: INK,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  error: {
    color: '#DC2626',
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
  },
  empty: {
    color: MUTED,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(23,23,23,0.08)',
  },
  glyph: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PAGE_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: INK,
  },
  cardDate: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#A3A3A3',
  },
  cardPlace: {
    marginTop: 4,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#525252',
  },
  cardCopy: {
    marginTop: 8,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
  },
});

export default AnnouncementsScreen;
