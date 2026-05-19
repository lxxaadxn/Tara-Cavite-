import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Image,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { JamIcon } from '../components/JamIcon';
import { DashboardFiltersPanel } from '../components/DashboardFiltersPanel';
import { Header } from '../components/Header';
import { trendingSpots, nearbyPlaces, type Place } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { fetchDashboardPlacesPool, haversineDistanceKm } from '../lib/placesFromSupabase';
import {
  placeMatchesDashboardFilters,
  sortPlacesByDashboardSort,
} from '../lib/dashboardPlaceFilters';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
/** Max sheet height (shorter sheet); content scrolls inside when tall. */
const FILTER_SHEET_MAX_HEIGHT = Math.round(SCREEN_HEIGHT * 0.5);
const H_PAD = 16;
const CARD_GAP = 40;
const CARD_WIDTH = Math.min(320, Math.round(SCREEN_WIDTH * 0.74));
const IMAGE_HEIGHT = Math.round(CARD_WIDTH * 0.58);

/** Figma dashboard export tokens */
const FIGMA = {
  textTitle: '#241D13',
  textSubtitle: '#425466',
  textMuted: '#868686',
  star: '#FFC012',
  searchGreen: '#7EA00E',
  white: '#FFFFFF',
  bg: '#FFFFFF',
};
/** Match Itineraries tab search row (filter icon on white circle). */
const TEAL = '#1F4F59';
const SEARCH_PLACEHOLDER = '#B3AAAA';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const filterSheetPadBottom = Math.max(insets.bottom, 10);
  const filterScrollMaxHeight = FILTER_SHEET_MAX_HEIGHT - filterSheetPadBottom;
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filterToggles, setFilterToggles] = useState<Record<string, boolean>>({});
  const [catalogPlaces, setCatalogPlaces] = useState<Place[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogFromSupabase, setCatalogFromSupabase] = useState(false);
  const [userPt, setUserPt] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      try {
        const list = await fetchDashboardPlacesPool(supabase, 1500);
        if (!cancelled) {
          setCatalogPlaces(list);
          setCatalogFromSupabase(true);
        }
      } catch {
        if (!cancelled) {
          setCatalogPlaces([...trendingSpots, ...nearbyPlaces] as Place[]);
          setCatalogFromSupabase(false);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) {
          setUserPt({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSorted = useMemo(() => {
    const matched = catalogPlaces.filter((p) => placeMatchesDashboardFilters(p, filterToggles));
    return sortPlacesByDashboardSort(matched, filterToggles);
  }, [catalogPlaces, filterToggles]);

  const trendingRow = useMemo(() => filteredSorted.slice(0, 36), [filteredSorted]);

  const nearbyRow = useMemo(() => {
    if (!userPt) return filteredSorted.slice(0, 36);
    const scored = filteredSorted.map((p) => ({
      place: p,
      km: haversineDistanceKm(userPt.lat, userPt.lng, p.latitude, p.longitude),
    }));
    scored.sort((a, b) => a.km - b.km);
    return scored.map((s) => s.place).slice(0, 36);
  }, [filteredSorted, userPt]);

  const onFilterTogglesChange = useCallback((toggles: Record<string, boolean>) => {
    setFilterToggles(toggles);
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate('PlaceDetail', { query: searchQuery.trim() });
    }
  };

  const renderPlaceCard = (place: Place) => (
    <TouchableOpacity
      key={place.id}
      style={styles.card}
      onPress={() => navigation.navigate('PlaceDetail', { place })}
      accessibilityLabel={`${place.name}, ${place.address}`}
      accessibilityRole="button"
      activeOpacity={0.9}
    >
      {place.image ? (
        <Image
          source={place.image}
          style={styles.cardImage}
          resizeMode="cover"
          accessibilityLabel={`${place.name} image`}
        />
      ) : (
        <View style={[styles.cardImage, styles.imagePlaceholder]}>
          <JamIcon ionicon="image-outline" size={40} color={FIGMA.textMuted} />
        </View>
      )}
      <View style={styles.cardTitleRow}>
        <Text style={styles.placeTitle} numberOfLines={2}>
          {place.name}
        </Text>
        <View style={styles.ratingWrap}>
          <JamIcon ionicon="star" size={14} color={FIGMA.star} />
          <Text style={styles.ratingText}>{place.rating ?? '5.0'}</Text>
        </View>
      </View>
      <Text style={styles.placeSubtitle} numberOfLines={2}>
        {place.address}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title=""
        homeBranding
        showNotification
        showFilter={false}
        onNotificationPress={() => navigation.navigate('Notifications')}
      />
      <View style={styles.searchFilterRow}>
        <View style={styles.searchPill}>
          <JamIcon name="search" size={18} color={FIGMA.searchGreen} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where are you going?"
            placeholderTextColor={SEARCH_PLACEHOLDER}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            accessibilityLabel="Search for destinations"
          />
        </View>
        <TouchableOpacity
          style={styles.filterCircle}
          onPress={() => setFiltersVisible((v) => !v)}
          accessibilityLabel={filtersVisible ? 'Hide filters' : 'Show filters'}
          accessibilityRole="button"
        >
          <JamIcon name="filter" size={20} color={TEAL} />
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending Tourist Spots</Text>
          {catalogLoading ? (
            <View style={styles.rowLoading}>
              <ActivityIndicator color={FIGMA.searchGreen} />
            </View>
          ) : trendingRow.length === 0 ? (
            <Text style={styles.emptyHint}>No establishments match your filters. Try resetting filters or another city.</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScrollContent}
            >
              {trendingRow.map((spot) => renderPlaceCard(spot))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{userPt ? 'Nearby Places' : 'More places'}</Text>
          {catalogLoading ? (
            <View style={styles.rowLoading}>
              <ActivityIndicator color={FIGMA.searchGreen} />
            </View>
          ) : nearbyRow.length === 0 ? (
            <Text style={styles.emptyHint}>No establishments match your filters.</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScrollContent}
            >
              {nearbyRow.map((place) => renderPlaceCard(place))}
            </ScrollView>
          )}
        </View>
        {!catalogFromSupabase && !catalogLoading ? (
          <Text style={styles.offlineHint}>Showing sample listings — connect to load full Cavite catalog.</Text>
        ) : null}
      </ScrollView>

      <Modal
        visible={filtersVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFiltersVisible(false)}
      >
        <View style={styles.filterModalRoot} accessibilityViewIsModal>
          <Pressable
            style={styles.filterModalDismiss}
            onPress={() => setFiltersVisible(false)}
            accessibilityLabel="Dismiss filters"
            accessibilityRole="button"
          />
          <View
            style={[
              styles.filterSheet,
              {
                maxHeight: FILTER_SHEET_MAX_HEIGHT,
                paddingBottom: filterSheetPadBottom,
              },
            ]}
          >
            <DashboardFiltersPanel
              embedded
              sheet
              sheetScrollMaxHeight={filterScrollMaxHeight}
              onTogglesChange={onFilterTogglesChange}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FIGMA.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
    paddingTop: 4,
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },
  searchPill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 17,
    backgroundColor: '#FFFFFF',
    borderRadius: 29,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#000000',
  },
  filterCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },
  section: {
    marginBottom: 8,
  },
  /** Single flat tint (no elevation) so edges match the center — full window via Modal */
  filterModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  filterModalDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  filterSheet: {
    width: '100%',
    backgroundColor: FIGMA.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: FIGMA.textTitle,
    paddingHorizontal: H_PAD,
    marginBottom: 14,
  },
  hScrollContent: {
    paddingLeft: H_PAD,
    paddingRight: H_PAD,
    flexDirection: 'row',
  },
  card: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
  },
  cardImage: {
    width: '100%',
    height: IMAGE_HEIGHT,
    borderRadius: 21,
    backgroundColor: '#E8E8E8',
    marginBottom: 10,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  placeTitle: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: FIGMA.textTitle,
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: 2,
  },
  ratingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 24,
    color: FIGMA.textMuted,
  },
  placeSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: FIGMA.textSubtitle,
  },
  rowLoading: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: FIGMA.textMuted,
    paddingHorizontal: H_PAD,
    paddingVertical: 8,
  },
  offlineHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: FIGMA.textMuted,
    paddingHorizontal: H_PAD,
    paddingBottom: 16,
    textAlign: 'center',
  },
});

export default HomeScreen;
