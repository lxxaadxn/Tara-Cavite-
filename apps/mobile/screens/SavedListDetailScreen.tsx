import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import { Place, mockItineraries, type ItineraryCard } from '../data/mockData';
import { supabase } from '../lib/supabase';

const GREEN = '#7EA00E';
const TEAL = '#1F4F59';
const WHITE = '#FFFFFF';
const TITLE = '#241D13';
const MUTED = '#7A7878';
const PAGE_BG = '#F5F5F6';
const PLACEHOLDER_INPUT = '#B3AAAA';
const H_PAD = 16;

const SAVED_PLACES_SELECT =
  'id, name, address, type, hours, latitude, longitude, image_url, description, ntdp_category, city_mun';

export type SavedListDetailParams = {
  listId: string;
  list: {
    id: string;
    name: string;
    description?: string;
    icon_name: string;
    type: 'private' | 'shared';
  };
};

type SavedKind = 'establishment' | 'itinerary';

type SavedRow = {
  kind: SavedKind;
  key: string;
  title: string;
  place?: Place;
  itinerary?: ItineraryCard;
};

type TypeFilter = 'all' | SavedKind;

function rowIconForKind(kind: SavedKind) {
  const color = TEAL;
  switch (kind) {
    case 'establishment':
      return <JamIcon ionicon="business" size={24} color={color} />;
    default:
      return <JamIcon ionicon="map-outline" size={24} color={color} />;
  }
}

const FILTER_OPTIONS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All saves' },
  { key: 'establishment', label: 'Establishments' },
  { key: 'itinerary', label: 'Itineraries' },
];

export default function SavedListDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { listId, list } = route.params as SavedListDetailParams;

  const [loading, setLoading] = useState(true);
  const [allRows, setAllRows] = useState<SavedRow[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: placeLinks, error: placeLinkErr } = await supabase
        .from('saved_list_items')
        .select('place_id')
        .eq('list_id', listId);
      if (placeLinkErr) throw placeLinkErr;

      const { data: itinLinks, error: itinErr } = await supabase
        .from('saved_list_itinerary_items')
        .select('itinerary_ref')
        .eq('list_id', listId);

      const rows: SavedRow[] = [];

      const placeIds = (placeLinks ?? []).map((r) => (r as { place_id: string }).place_id);
      if (placeIds.length > 0) {
        const { data: pRows, error } = await supabase
          .from('places')
          .select(SAVED_PLACES_SELECT)
          .in('id', placeIds);
        if (error) throw error;
        for (const row of pRows ?? []) {
          const placeRow = row as {
            id: string;
            name: string;
            address: string;
            type: string | null;
            hours: string | null;
            latitude: number | null;
            longitude: number | null;
            image_url: string | null;
            description: string | null;
            ntdp_category: string | null;
            city_mun: string | null;
          };
          if (placeRow.latitude == null || placeRow.longitude == null) continue;
          const p: Place = {
            id: placeRow.id,
            name: placeRow.name,
            address: placeRow.address,
            type: placeRow.type || 'Place',
            hours: placeRow.hours ?? '',
            latitude: placeRow.latitude,
            longitude: placeRow.longitude,
          };
          if (placeRow.image_url) p.image = placeRow.image_url;
          if (placeRow.description) p.description = placeRow.description;
          if (placeRow.ntdp_category) p.ntdp_category = placeRow.ntdp_category;
          if (placeRow.city_mun) p.city_mun = placeRow.city_mun;
          rows.push({
            kind: 'establishment',
            key: `e-${p.id}`,
            title: p.name,
            place: p,
          });
        }
      }

      if (!itinErr) {
        const iRefs = new Set((itinLinks ?? []).map((r) => (r as { itinerary_ref: string }).itinerary_ref));
        for (const c of mockItineraries) {
          if (iRefs.has(c.id)) {
            rows.push({ kind: 'itinerary', key: `i-${c.id}`, title: c.title, itinerary: c });
          }
        }
      }

      rows.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
      setAllRows(rows);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not load this list.');
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (typeFilter !== 'all' && r.kind !== typeFilter) return false;
      if (!q) return true;
      return r.title.toLowerCase().includes(q);
    });
  }, [allRows, search, typeFilter]);

  const openRow = (item: SavedRow) => {
    if (item.kind === 'establishment' && item.place) {
      (navigation as { navigate: (name: string, params: object) => void }).navigate('Dashboard', {
        screen: 'AboutEstablishment',
        params: { place: item.place },
      });
      return;
    }
    if (item.kind === 'itinerary' && item.itinerary) {
      (navigation as { navigate: (name: string, params: object) => void }).navigate('Itineraries', {
        screen: 'ItineraryDetail',
        params: { itineraryId: item.itinerary.id },
      });
    }
  };

  const goEditList = () => {
    navigation.navigate(
      'NewList' as never,
      {
        listId: list.id,
        listData: list,
      } as never
    );
  };

  const filterLabel =
    FILTER_OPTIONS.find((o) => o.key === typeFilter)?.label ?? 'All saves';

  const renderItem = ({ item }: { item: SavedRow }) => (
    <TouchableOpacity style={styles.card} onPress={() => openRow(item)} activeOpacity={0.82} accessibilityRole="button">
      <View style={styles.cardIconWrap}>{rowIconForKind(item.kind)}</View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <JamIcon ionicon="chevron-forward" size={18} color={MUTED} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.greenHeader, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <JamIcon ionicon="chevron-left" size={26} color={WHITE} />
          </TouchableOpacity>
          <Pressable
            style={styles.headerTitlePress}
            onLongPress={goEditList}
            accessibilityRole="header"
            accessibilityLabel={`${list.name}. Long press to edit list.`}
          >
            <Text style={styles.headerTitle} numberOfLines={1}>
              {list.name}
            </Text>
          </Pressable>
          <View style={styles.headerIconBtn} />
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchPill}>
          <JamIcon name="search" size={18} color={GREEN} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search saves"
            placeholderTextColor={PLACEHOLDER_INPUT}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Search saves"
          />
        </View>
        <TouchableOpacity
          style={styles.filterCircle}
          onPress={() => setFilterModalVisible(true)}
          accessibilityLabel={`Filter saves. Current: ${filterLabel}`}
          accessibilityRole="button"
        >
          <JamIcon name="filter" size={20} color={TEAL} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 24 },
          ]}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {allRows.length === 0
                ? 'Nothing saved in this list yet.'
                : 'No saves match your search or filter.'}
            </Text>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable style={styles.filterOverlay} onPress={() => setFilterModalVisible(false)}>
          <Pressable style={styles.filterSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.filterSheetTitle}>Show</Text>
            {FILTER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={styles.filterOption}
                onPress={() => {
                  setTypeFilter(opt.key);
                  setFilterModalVisible(false);
                }}
              >
                <Text
                  style={[styles.filterOptionText, typeFilter === opt.key && styles.filterOptionTextOn]}
                >
                  {opt.label}
                </Text>
                {typeFilter === opt.key ? (
                  <JamIcon ionicon="checkmark" size={18} color={GREEN} />
                ) : null}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.filterDone} onPress={() => setFilterModalVisible(false)}>
              <Text style={styles.filterDoneText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  greenHeader: {
    backgroundColor: GREEN,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitlePress: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  headerTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 20,
    lineHeight: 24,
    color: WHITE,
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
    backgroundColor: PAGE_BG,
  },
  searchPill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: WHITE,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(122, 120, 120, 0.28)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: TITLE,
  },
  filterCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(122, 120, 120, 0.28)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(122, 120, 120, 0.12)',
  },
  cardIconWrap: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: TITLE,
    minWidth: 0,
  },
  emptyText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  filterSheetTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: TITLE,
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(122, 120, 120, 0.25)',
  },
  filterOptionText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: MUTED,
  },
  filterOptionTextOn: {
    color: GREEN,
    fontFamily: 'Poppins_700Bold',
  },
  filterDone: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  filterDoneText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: TEAL,
  },
});
