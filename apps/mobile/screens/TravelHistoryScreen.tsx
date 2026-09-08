import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import { fetchProfileActivity, type ProfileVisit } from '../lib/profileActivity';

const PAGE_BG = '#f4f7f9';
const TITLE = '#171717';
const MUTED = '#737373';
const TEAL = '#1B8A70';
const OLIVE = '#10A37F';

function formatVisitDate(value?: string | null): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const d = raw.length <= 10 ? new Date(`${raw}T00:00:00`) : new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function TravelHistoryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [visits, setVisits] = useState<ProfileVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      if (!userId) {
        setVisits([]);
        return;
      }
      const activity = await fetchProfileActivity(supabase, userId);
      setVisits(activity.visits ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load travel history.');
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openPlace = (placeId: string) => {
    if (!placeId) return;
    (navigation as { navigate: (name: string, params: object) => void }).navigate('AboutEstablishment', {
      placeId: String(placeId),
    });
  };

  return (
    <View style={styles.root}>
      <Header title="Travel history" showBack darkBackground />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={OLIVE} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : visits.length === 0 ? (
              <Text style={styles.emptyHint}>
                No visits yet. Reach a destination or check in to start your history.
              </Text>
            ) : (
              visits.map((visit) => (
                <TouchableOpacity
                  key={visit.id}
                  style={styles.row}
                  onPress={() => openPlace(visit.placeId)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {visit.placeName}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {[visit.cityMun || 'Cavite', formatVisitDate(visit.createdAt)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <View style={[styles.badge, visit.checkedIn ? styles.badgeOn : styles.badgeOff]}>
                    <Text style={[styles.badgeText, visit.checkedIn ? styles.badgeOnText : styles.badgeOffText]}>
                      {visit.checkedIn ? 'Checked in' : 'Reached'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
    paddingVertical: 16,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#b91c1c',
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: TITLE,
  },
  rowSub: {
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: MUTED,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeOn: {
    backgroundColor: '#D4EFE8',
  },
  badgeOff: {
    backgroundColor: '#F1F7F6',
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  badgeOnText: {
    color: TEAL,
  },
  badgeOffText: {
    color: '#525252',
  },
});
