import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Image,
  StatusBar,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import {
  DashboardFiltersPanel,
  type DashboardFilterSectionId,
} from '../components/DashboardFiltersPanel';
import { mockItineraries, ItineraryCard, Place } from '../data/mockData';

const HEADER_GREEN = '#7EA00E';
const TEAL = '#1F4F59';
const PLACEHOLDER = '#B3AAAA';
const SUBTITLE = '#425466';
const VIEW_BG = '#DCD964';
const VIEW_TEXT = '#213502';
const H_PAD = 16;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_IMG_H = Math.round(SCREEN_W * 0.42);
/** Same pattern as Home: sheet height cap, scroll inside panel. */
const FILTER_SHEET_MAX_HEIGHT = Math.round(SCREEN_H * 0.5);

const ITINERARY_FILTER_SECTION_IDS: DashboardFilterSectionId[] = ['cities', 'municipalities'];

const ItinerariesScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const filterSheetPadBottom = Math.max(insets.bottom, 10);
  const filterScrollMaxHeight = FILTER_SHEET_MAX_HEIGHT - filterSheetPadBottom;
  const [search, setSearch] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);

  const onBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('Dashboard');
    }
  };

  const filtered = mockItineraries.filter(
    (it) =>
      !search.trim() ||
      it.title.toLowerCase().includes(search.toLowerCase()) ||
      it.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  const renderCard = (item: ItineraryCard) => (
    <View key={item.id} style={styles.card}>
      <Image
        source={item.image}
        style={styles.cardImage}
        resizeMode="cover"
        accessibilityLabel={`${item.title} cover image`}
      />
      <View style={styles.cardBody}>
        <View style={styles.cardTextCol}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={2}>
            {item.subtitle}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => {
            const place: Place = {
              id: item.id,
              name: item.title,
              address: item.subtitle,
              type: 'Itinerary',
              hours: 'Varies by stop',
              latitude: 14.1,
              longitude: 120.9,
              image: item.image,
            };
            navigation.navigate('PlaceDetail' as never, { place } as never);
          }}
          accessibilityLabel={`View ${item.title}`}
          accessibilityRole="button"
        >
          <Text style={styles.viewBtnText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_GREEN} />
      <View style={[styles.greenHeader, { paddingTop: insets.top + 10, paddingBottom: 14 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.headerSide}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <JamIcon name="chevron-left" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} pointerEvents="none">
            Itineraries
          </Text>
          <View style={styles.headerSide} />
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchPill}>
          <JamIcon name="search" size={18} color={HEADER_GREEN} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Terminals"
            placeholderTextColor={PLACEHOLDER}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Search terminals"
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map(renderCard)}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: 72 + Math.max(insets.bottom, 10) }]}
        onPress={() => navigation.navigate('CreateItinerary' as never)}
        accessibilityLabel="Add itinerary"
        accessibilityRole="button"
      >
        <JamIcon name="plus" size={26} color={HEADER_GREEN} />
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
              embedded
              sheet
              sheetScrollMaxHeight={filterScrollMaxHeight}
              sectionIds={ITINERARY_FILTER_SECTION_IDS}
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  cardImage: {
    width: '100%',
    height: CARD_IMG_H,
    backgroundColor: '#E8E8E8',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 16,
    lineHeight: 22,
    color: '#000000',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: SUBTITLE,
  },
  viewBtn: {
    backgroundColor: VIEW_BG,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 100,
    flexShrink: 0,
  },
  viewBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 14,
    color: VIEW_TEXT,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 6,
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
