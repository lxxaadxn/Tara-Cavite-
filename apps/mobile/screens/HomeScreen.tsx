import React, { useCallback, useState } from 'react';
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
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { JamIcon } from '../components/JamIcon';
import { DashboardFiltersPanel } from '../components/DashboardFiltersPanel';
import { Header } from '../components/Header';
import type { Place } from '../data/mockData';
import { supabase } from '../lib/supabase';
import {
  fetchTrendingPlacesFromSupabase,
  fetchNearbyPlacesFromSupabase,
} from '../lib/placesFromSupabase';

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
const NEARBY_RADIUS_KM = 3;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const filterSheetPadBottom = Math.max(insets.bottom, 10);
  const filterScrollMaxHeight = FILTER_SHEET_MAX_HEIGHT - filterSheetPadBottom;
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [trendingPlaces, setTrendingPlaces] = useState<Place[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [nearbyLoading, setNearbyLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nearbyStatus, setNearbyStatus] = useState<'ok' | 'no_permission' | 'error' | 'empty'>(
    'ok'
  );

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setTrendingLoading(true);
      setNearbyLoading(true);
    }
    setNearbyStatus('ok');

    try {
      const trending = await fetchTrendingPlacesFromSupabase(supabase, 40);
      setTrendingPlaces(trending);
    } catch {
      setTrendingPlaces([]);
    } finally {
      if (!isRefresh) setTrendingLoading(false);
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setNearbyPlaces([]);
        setNearbyStatus('no_permission');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;

      const nearby = await fetchNearbyPlacesFromSupabase(
        supabase,
        userLat,
        userLng,
        NEARBY_RADIUS_KM,
        40
      );
      setNearbyPlaces(nearby);
      setNearbyStatus(nearby.length ? 'ok' : 'empty');
    } catch {
      setNearbyPlaces([]);
      setNearbyStatus('error');
    } finally {
      if (!isRefresh) setNearbyLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate('PlaceDetail' as never, { query: searchQuery.trim() } as never);
    }
  };

  const renderPlaceCard = (place: Place) => (
    <TouchableOpacity
      key={place.id}
      style={styles.card}
      onPress={() => navigation.navigate('AboutEstablishment' as never, { place } as never)}
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
        onNotificationPress={() => navigation.navigate('Notifications' as never)}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboard(true)}
            tintColor={FIGMA.searchGreen}
          />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending Tourist Spots</Text>
          {trendingLoading ? (
            <View style={styles.sectionLoading}>
              <ActivityIndicator color={FIGMA.searchGreen} />
            </View>
          ) : trendingPlaces.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScrollContent}
            >
              {trendingPlaces.map((spot) => renderPlaceCard(spot))}
            </ScrollView>
          ) : (
            <Text style={styles.sectionEmpty}>No establishments in the catalog yet.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{`Nearby Places`}</Text>
          {nearbyLoading ? (
            <View style={styles.sectionLoading}>
              <ActivityIndicator color={FIGMA.searchGreen} />
            </View>
          ) : nearbyStatus === 'no_permission' ? (
            <Text style={styles.sectionEmpty}>
              Turn on location permission to see places near you.
            </Text>
          ) : nearbyStatus === 'error' ? (
            <Text style={styles.sectionEmpty}>Could not load nearby places. Pull to refresh.</Text>
          ) : nearbyPlaces.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScrollContent}
            >
              {nearbyPlaces.map((place) => renderPlaceCard(place))}
            </ScrollView>
          ) : (
            <Text style={styles.sectionEmpty}>
              {`No catalog places within ${NEARBY_RADIUS_KM} km of your location.`}
            </Text>
          )}
        </View>
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
  sectionLoading: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionEmpty: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: FIGMA.textMuted,
    paddingHorizontal: H_PAD,
    paddingBottom: 20,
  },
});

export default HomeScreen;
