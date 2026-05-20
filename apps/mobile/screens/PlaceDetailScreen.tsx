import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import { Colors, Theme } from '../constants/theme';
import { Header } from '../components/Header';
import { Place } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { searchPlacesByText } from '../lib/placesFromSupabase';
import { fetchTerminalsFromSupabase, filterTerminalsByText } from '../lib/terminalsFromSupabase';
import type { Terminal } from '../data/mockData';

type RouteParams = { place?: Place; query?: string; category?: string };

const PlaceDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as RouteParams | undefined;

  const initialPlace = params?.place;
  const searchQuery = params?.query?.trim() ?? params?.category?.trim() ?? '';

  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Place[]>([]);
  const [terminalCandidates, setTerminalCandidates] = useState<Terminal[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isSearchFlow = !initialPlace && Boolean(searchQuery);

  useLayoutEffect(() => {
    if (initialPlace) {
      (navigation as { replace: (name: string, params: object) => void }).replace('AboutEstablishment', {
        place: initialPlace,
      });
    }
  }, [initialPlace, navigation]);

  useEffect(() => {
    if (initialPlace) return;
    if (!searchQuery) {
      setCandidates([]);
      setTerminalCandidates([]);
      setFetchError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    Promise.all([searchPlacesByText(supabase, searchQuery), fetchTerminalsFromSupabase(supabase)])
      .then(([placeList, terminals]) => {
        if (cancelled) return;
        setCandidates(placeList);
        setTerminalCandidates(filterTerminalsByText(terminals, searchQuery, 10));
      })
      .catch((e: Error) => {
        if (!cancelled) setFetchError(e.message ?? 'Search failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialPlace?.id, searchQuery]);

  useLayoutEffect(() => {
    if (!isSearchFlow || loading || fetchError) return;
    if (candidates.length === 1 && terminalCandidates.length === 0) {
      (navigation as { replace: (name: string, params: object) => void }).replace('AboutEstablishment', {
        place: candidates[0],
      });
      return;
    }
    if (terminalCandidates.length === 1 && candidates.length === 0) {
      (navigation as { replace: (name: string, params: object) => void }).replace('TerminalDetail', {
        terminal: terminalCandidates[0],
      });
    }
  }, [isSearchFlow, loading, fetchError, candidates, terminalCandidates, navigation]);

  const showList =
    isSearchFlow &&
    !loading &&
    !fetchError &&
    (candidates.length > 1 || terminalCandidates.length > 1 || (candidates.length && terminalCandidates.length));
  const showEmpty =
    isSearchFlow && !loading && !fetchError && candidates.length === 0 && terminalCandidates.length === 0;
  const showLoading = isSearchFlow && loading;
  const showError = isSearchFlow && !loading && fetchError;

  const listHeading = useMemo(() => {
    if (!searchQuery) return 'Results';
    return `Results for "${searchQuery}"`;
  }, [searchQuery]);

  if (initialPlace) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title=""
        showBack
        showNotification
        onNotificationPress={() => navigation.navigate('Notifications' as never)}
      />

      {showLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.hint}>Searching places…</Text>
        </View>
      ) : null}

      {showError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{fetchError}</Text>
          <Text style={styles.hint}>Check your connection and try again.</Text>
        </View>
      ) : null}

      {showEmpty ? (
        <View style={styles.centered}>
          <JamIcon ionicon="search-outline" size={48} color={Colors.text.light} />
          <Text style={styles.emptyTitle}>No places found</Text>
          <Text style={styles.hint}>
            Nothing in the map database matched &quot;{searchQuery}&quot;. Try another name or address from
            Dasmariñas STA listings.
          </Text>
        </View>
      ) : null}

      {showList ? (
        <ScrollView
          style={styles.listWrap}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.listHeading}>{listHeading}</Text>
          {candidates.length ? (
            <Text style={styles.sectionCaption}>Places & establishments</Text>
          ) : null}
          {candidates.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.resultRow}
              onPress={() =>
                navigation.navigate('AboutEstablishment' as never, { place: item } as never)
              }
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.address}`}
            >
              <JamIcon ionicon="location" size={22} color={Colors.primary} />
              <View style={styles.resultTextCol}>
                <Text style={styles.resultName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.resultAddr} numberOfLines={2}>
                  {item.address}
                </Text>
              </View>
              <JamIcon ionicon="chevron-forward" size={20} color={Colors.text.light} />
            </TouchableOpacity>
          ))}
          {terminalCandidates.length ? (
            <Text style={styles.sectionCaption}>Terminals</Text>
          ) : null}
          {terminalCandidates.map((item) => (
            <TouchableOpacity
              key={`t-${item.id}`}
              style={styles.resultRow}
              onPress={() => navigation.navigate('TerminalDetail' as never, { terminal: item } as never)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.addressLine ?? item.municipality}`}
            >
              <JamIcon ionicon="bus" size={22} color={Colors.primary} />
              <View style={styles.resultTextCol}>
                <Text style={styles.resultName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.resultAddr} numberOfLines={2}>
                  {item.addressLine ?? item.municipality}
                </Text>
              </View>
              <JamIcon ionicon="chevron-forward" size={20} color={Colors.text.light} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    gap: Theme.spacing.sm,
  },
  hint: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Theme.spacing.sm,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Theme.spacing.md,
  },
  listWrap: {
    flex: 1,
    paddingHorizontal: Theme.spacing.md,
  },
  listHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Theme.spacing.xs,
    marginTop: Theme.spacing.sm,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingBottom: Theme.spacing.xl,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: Theme.borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
    marginBottom: Theme.spacing.sm,
  },
  resultTextCol: {
    flex: 1,
    minWidth: 0,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  resultAddr: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 4,
  },
});

export default PlaceDetailScreen;
