import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ItineraryProductCard } from '../components/ItineraryProductCard';
import type { Place } from '../data/mockData';
import type { PublishedItinerary } from '../data/publishedItineraries';
import { supabase } from '../lib/supabase';
import { fetchDashboardPlacesPool, logPlacesFetchError } from '../lib/placesFromSupabase';
import { buildEnrichedItinerary } from '../lib/itineraryPlaces';
import { fetchPublishedItineraries, subscribeItineraries } from 'cavitour-shared/itineraries';
import { getFloatingTabBarScrollPadding } from '../lib/mainTabBarStyle';

const PAGE_BG = '#F1F7F6';
const H_PAD = 16;
const INK = '#171717';
const MUTED = '#737373';

const ItinerariesScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [catalogPlaces, setCatalogPlaces] = useState<Place[]>([]);
  const [published, setPublished] = useState<PublishedItinerary[]>([]);

  const openDetail = (itineraryId: string) => {
    (navigation as { navigate: (n: string, p: object) => void }).navigate('ItineraryDetail', {
      itineraryId,
    });
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [list, itineraries] = await Promise.all([
          fetchDashboardPlacesPool(supabase, 2000),
          fetchPublishedItineraries(supabase),
        ]);
        if (cancelled) return;
        setCatalogPlaces(list);
        setPublished((itineraries ?? []) as PublishedItinerary[]);
      } catch (err) {
        logPlacesFetchError('ItinerariesScreen.fetchDashboardPlacesPool', err);
        if (!cancelled) {
          setCatalogPlaces([]);
          setPublished([]);
        }
      }
    };
    load();
    const unsub = subscribeItineraries(supabase, () => {
      fetchPublishedItineraries(supabase)
        .then((itineraries) => {
          if (!cancelled) setPublished((itineraries ?? []) as PublishedItinerary[]);
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const items = useMemo(
    () => published.map((it) => buildEnrichedItinerary(it, catalogPlaces) ?? it),
    [catalogPlaces, published]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Itineraries</Text>
        <Text style={styles.pageSubtitle}>Ready-to-use travel routes linking verified destinations.</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: getFloatingTabBarScrollPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: it }) => (
          <ItineraryProductCard itinerary={it} onPress={() => openDetail(it.id)} />
        )}
      />
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
    paddingBottom: 8,
  },
  pageTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    color: INK,
  },
  pageSubtitle: {
    marginTop: 6,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  listContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 12,
    gap: 18,
  },
});

export default ItinerariesScreen;
