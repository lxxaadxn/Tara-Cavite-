import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  Image,
  StatusBar,
  Dimensions,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import {
  DashboardFiltersPanel,
  type DashboardFilterSectionId,
} from '../components/DashboardFiltersPanel';
import { getBrowseEstablishmentsForItineraries, type Place } from '../data/mockData';
import {
  placeMatchesDashboardFilters,
  sortPlacesByDashboardSort,
} from '../lib/dashboardPlaceFilters';

const HEADER_GREEN = '#7EA00E';
const TEAL = '#1F4F59';
const PLACEHOLDER = '#B3AAAA';
const TITLE = '#241D13';
const MUTED = '#7A7878';
const PAGE_BG = '#F4F6EC';
const WHITE = '#FFFFFF';
const H_PAD = 16;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_IMG_H = Math.round(SCREEN_W * 0.38);
const FILTER_SHEET_MAX_HEIGHT = Math.round(SCREEN_H * 0.5);

const ITINERARY_FILTER_SECTION_IDS: DashboardFilterSectionId[] = [
  'sort',
  'categories',
  'cities',
  'municipalities',
  'access',
  'amenities',
];

type ItineraryEstablishmentItem = {
  place: Place;
  itineraryTitle: string;
};

const ItinerariesScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const filterSheetPadBottom = Math.max(insets.bottom, 10);
  const filterScrollMaxHeight = FILTER_SHEET_MAX_HEIGHT - filterSheetPadBottom;
  const [search, setSearch] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterToggles, setFilterToggles] = useState<Record<string, boolean>>({});
  const [filterPanelKey, setFilterPanelKey] = useState(0);

  const onBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as { navigate: (n: string) => void }).navigate('Dashboard');
    }
  };

  const availableEstablishments = useMemo(() => getBrowseEstablishmentsForItineraries(), []);

  const onFilterTogglesChange = useCallback((toggles: Record<string, boolean>) => {
    setFilterToggles(toggles);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = availableEstablishments;
    if (q) {
      rows = rows.filter(({ place, itineraryTitle }) =>
        [place.name, place.address, place.type, itineraryTitle].some((v) => v.toLowerCase().includes(q))
      );
    }
    const hasFilter = Object.keys(filterToggles).some((k) => filterToggles[k]);
    if (hasFilter) {
      rows = rows.filter(({ place }) => placeMatchesDashboardFilters(place, filterToggles));
    }
    const sortKeys = Object.keys(filterToggles).filter((k) => k.startsWith('sort-') && filterToggles[k]);
    if (sortKeys.length) {
      const places = rows.map((r) => r.place);
      const sortedPlaces = sortPlacesByDashboardSort(places, filterToggles);
      const order = new Map(sortedPlaces.map((p, i) => [p.id, i]));
      rows = [...rows].sort((a, b) => (order.get(a.place.id) ?? 0) - (order.get(b.place.id) ?? 0));
    }
    return rows;
  }, [search, availableEstablishments, filterToggles]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const renderCard = ({ item }: { item: ItineraryEstablishmentItem }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.92}
      onPress={() =>
        navigation.navigate('AboutEstablishment' as never, { place: item.place } as never)
      }
      accessibilityLabel={`${item.place.name} establishment`}
      accessibilityRole="button"
    >
      <Image
        source={item.place.image}
        style={styles.cardImage}
        resizeMode="cover"
        accessibilityLabel={`${item.place.name} cover`}
      />
      <View style={styles.cardBody}>
        <View style={styles.cardTextCol}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.place.name}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={2}>
            {item.place.address}
          </Text>
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{item.place.type}</Text>
            </View>
            <Text style={styles.tagChip} numberOfLines={1}>
              via {item.itineraryTitle}
            </Text>
          </View>
        </View>
        <View style={styles.viewBtn}>
          <Text style={styles.viewBtnText}>View</Text>
          <JamIcon ionicon="chevron-forward" size={16} color={TEAL} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_GREEN} />
      <View style={[styles.greenHeader, { paddingTop: insets.top + 8, paddingBottom: 14 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.headerSide}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <JamIcon name="chevron-left" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle} pointerEvents="none">
              Available Itinerary Establishments
            </Text>
            <Text style={styles.headerSubtitle} pointerEvents="none">
              {availableEstablishments.length} ideas — route stops + same city or municipality
            </Text>
          </View>
          <View style={styles.headerSide} />
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchPill}>
          <JamIcon name="search" size={18} color={TEAL} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search establishments…"
            placeholderTextColor={PLACEHOLDER}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Search establishments"
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
              <JamIcon ionicon="close-circle" size={20} color={MUTED} />
            </TouchableOpacity>
          ) : null}
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

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.place.id}
        renderItem={renderCard}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 100 + Math.max(insets.bottom, 12) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HEADER_GREEN} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <JamIcon ionicon="map-outline" size={48} color={MUTED} />
            <Text style={styles.emptyTitle}>No matches</Text>
            <Text style={styles.emptySub}>Try another search, open filters, or reset them.</Text>
            <TouchableOpacity
              onPress={() => {
                setSearch('');
                setFilterPanelKey((k) => k + 1);
              }}
              style={styles.emptyBtn}
            >
              <Text style={styles.emptyBtnText}>Clear search & filters</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: 72 + Math.max(insets.bottom, 10) }]}
        onPress={() => navigation.navigate('CreateItinerary' as never)}
        accessibilityLabel="Create new itinerary"
        accessibilityRole="button"
        activeOpacity={0.9}
      >
        <JamIcon ionicon="add-outline" size={28} color={WHITE} />
      </TouchableOpacity>

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
              key={filterPanelKey}
              embedded
              sheet
              sheetScrollMaxHeight={filterScrollMaxHeight}
              sectionIds={ITINERARY_FILTER_SECTION_IDS}
              onTogglesChange={onFilterTogglesChange}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  greenHeader: {
    backgroundColor: HEADER_GREEN,
    paddingHorizontal: H_PAD,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
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
  headerTitleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    lineHeight: 24,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  searchRow: {
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
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(31, 79, 89, 0.12)',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: TITLE,
  },
  filterCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(31, 79, 89, 0.12)',
  },
  listContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 4,
    gap: 12,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(31, 79, 89, 0.08)',
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: CARD_IMG_H,
    backgroundColor: '#E8E8E8',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  cardTextCol: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    lineHeight: 23,
    color: TITLE,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: MUTED,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  pill: {
    backgroundColor: 'rgba(126, 160, 14, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: TEAL,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagChip: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: MUTED,
    backgroundColor: '#f4f6ec',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dce9a8',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexShrink: 0,
  },
  viewBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: TITLE,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: HEADER_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: TITLE,
    marginTop: 12,
  },
  emptySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: MUTED,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(31, 79, 89, 0.15)',
  },
  emptyBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: TEAL,
  },
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
});

export default ItinerariesScreen;
