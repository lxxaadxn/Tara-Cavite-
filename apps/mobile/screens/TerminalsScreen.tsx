import React, { useState, useMemo, useContext, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import * as Location from 'expo-location';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import { LeafletMapView, type LeafletMarker } from '../components/LeafletMapView';
import {
  DashboardFiltersPanel,
  FILTER_OPTION_LABEL_BY_KEY,
  type DashboardFilterSectionId,
} from '../components/DashboardFiltersPanel';
import { mockTerminals, Terminal } from '../data/mockData';
import { terminalAddressLine } from '../lib/terminalHelpers';
import { supabase } from '../lib/supabase';
import { haversineDistanceKm } from '../lib/placesFromSupabase';
import { fetchTerminalsFromSupabase } from '../lib/terminalsFromSupabase';

const TITLE_DARK = '#241D13';
const PLACEHOLDER = '#B3AAAA';
const HEADER_GREEN = '#7EA00E';
const TEAL = '#1F4F59';
const PAGE_BG = '#F4F6EC';
const WHITE = '#FFFFFF';
const MUTED = '#7A7878';
const H_PAD = 16;
const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const FILTER_SHEET_MAX_HEIGHT = Math.round(SCREEN_H * 0.5);
const MAP_BLOCK_H = Math.min(320, Math.round(SCREEN_W * 0.68));

const TERMINAL_FILTER_SECTION_IDS: DashboardFilterSectionId[] = ['cities', 'municipalities'];

function normalizeAreaLabel(label: string): string {
  return label.replace(/\s+City\s*$/i, '').trim().toLowerCase();
}

function terminalMatchesLocationToggles(t: Terminal, toggles: Record<string, boolean>): boolean {
  const activeKeys = Object.keys(toggles).filter((k) => toggles[k]);
  if (activeKeys.length === 0) return true;
  const tm = t.municipality.trim().toLowerCase();
  return activeKeys.some((key) => {
    const label = FILTER_OPTION_LABEL_BY_KEY[key];
    if (!label) return false;
    const n = normalizeAreaLabel(label);
    if (!n) return false;
    return tm === n || tm.includes(n) || n.includes(tm);
  });
}

type TransitMode = 'all' | 'modern-jeepney' | 'jeepney' | 'van' | 'bus';

const TRANSIT_CHIPS: {
  mode: TransitMode;
  label: string;
  icon: { name?: 'unordered-list'; ionicon?: string };
}[] = [
  { mode: 'all', label: 'All', icon: { name: 'unordered-list' } },
  { mode: 'bus', label: 'Bus', icon: { ionicon: 'bus' } },
  { mode: 'van', label: 'Van', icon: { ionicon: 'car' } },
  { mode: 'jeepney', label: 'Jeepney', icon: { ionicon: 'bus' } },
  { mode: 'modern-jeepney', label: 'Modern PUV', icon: { ionicon: 'bus' } },
];

const EXTRA_SCROLL_BOTTOM = 56;

function sortTerminalsByName(list: Terminal[]): Terminal[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

/** Normalize transport labels from Supabase (e.g. Jeepney, UV Express) for chip filters. */
function terminalMatchesTransit(t: Terminal, mode: TransitMode): boolean {
  if (mode === 'all') return true;
  const types = t.transportTypes.map((x) => x.toLowerCase());
  switch (mode) {
    case 'modern-jeepney':
      return types.some((s) => {
        if (/\bmodern\b|\bmpuv\b|e-jeep|electric|class\s*2|\bpuv\b/.test(s)) return true;
        if (s.includes('jeepney')) return true;
        if (s.includes('uv express') || s.includes('uv-express')) return true;
        if (s.includes('shuttle')) return true;
        if (s.includes('multicab')) return true;
        return false;
      });
    case 'jeepney':
      return types.some((x) => x.includes('jeepney'));
    case 'van':
      return types.some((x) => x.includes('van') || x.includes('uv express'));
    case 'bus':
      return types.some((x) => x.includes('bus'));
    default:
      return true;
  }
}

function statusStyle(status: Terminal['status']) {
  const open = status === 'OPEN';
  return {
    bg: open ? 'rgba(126, 160, 14, 0.18)' : 'rgba(122, 120, 120, 0.15)',
    text: open ? HEADER_GREEN : MUTED,
    label: open ? 'Open' : status,
  };
}

const TerminalsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [transitMode, setTransitMode] = useState<TransitMode>('all');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [locationToggles, setLocationToggles] = useState<Record<string, boolean>>({});
  const [terminals, setTerminals] = useState<Terminal[]>(mockTerminals);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);

  const filterSheetPadBottom = Math.max(insets.bottom, 10);
  const filterScrollMaxHeight = FILTER_SHEET_MAX_HEIGHT - filterSheetPadBottom;

  const onLocationTogglesChange = useCallback((toggles: Record<string, boolean>) => {
    setLocationToggles(toggles);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const live = await fetchTerminalsFromSupabase(supabase);
        if (!cancelled && live.length > 0) setTerminals(live);
      } catch {
        if (!cancelled) setTerminals(mockTerminals);
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
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollBottomPadding = tabBarHeight + Math.max(insets.bottom, 8) + EXTRA_SCROLL_BOTTOM;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = terminals.filter((t) => terminalMatchesTransit(t, transitMode));
    list = list.filter((t) => terminalMatchesLocationToggles(t, locationToggles));
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          terminalAddressLine(t).toLowerCase().includes(q) ||
          t.municipality.toLowerCase().includes(q)
      );
    }
    let ordered = sortTerminalsByName(list);
    if (userLocation) {
      ordered = [...ordered].sort(
        (a, b) =>
          haversineDistanceKm(userLocation.lat, userLocation.lng, a.latitude, a.longitude) -
          haversineDistanceKm(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
      );
    }
    return ordered;
  }, [searchQuery, transitMode, locationToggles, terminals, userLocation]);

  const toMarker = (t: Terminal): LeafletMarker | null => {
    if (!Number.isFinite(t.latitude) || !Number.isFinite(t.longitude)) return null;
    return { id: String(t.id), name: t.name, lat: t.latitude, lng: t.longitude };
  };

  const { pinMarkers, dotTerminals } = useMemo(() => {
    const all = filtered.map(toMarker).filter(Boolean) as LeafletMarker[];
    const sel = mapSelectedId ? String(mapSelectedId) : null;
    if (!sel) {
      return { pinMarkers: [] as LeafletMarker[], dotTerminals: all };
    }
    return {
      pinMarkers: all.filter((m) => m.id === sel),
      dotTerminals: all.filter((m) => m.id !== sel),
    };
  }, [filtered, mapSelectedId]);

  const renderTerminalItem = (terminal: Terminal) => {
    const st = statusStyle(terminal.status);
    const selected = mapSelectedId != null && String(mapSelectedId) === String(terminal.id);
    const distKm =
      userLocation && Number.isFinite(terminal.latitude) && Number.isFinite(terminal.longitude)
        ? haversineDistanceKm(userLocation.lat, userLocation.lng, terminal.latitude, terminal.longitude)
        : null;
    return (
      <TouchableOpacity
        key={terminal.id}
        style={[styles.terminalCard, selected && styles.terminalCardSelected]}
        onPress={() => setMapSelectedId(String(terminal.id))}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Select ${terminal.name} on map`}
      >
        <View style={styles.cardAccent} />
        <View style={styles.cardInner}>
          <View style={styles.cardTopRow}>
            <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
              <Text style={[styles.statusPillText, { color: st.text }]}>{st.label}</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('TerminalDetail' as never, { terminal } as never)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`Open ${terminal.name} details`}
            >
              <Text style={styles.openDetailsText}>Details</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.terminalName} numberOfLines={2}>
            {terminal.name}
          </Text>
          <Text style={styles.terminalMuni} numberOfLines={1}>
            {terminal.municipality}
          </Text>
          <Text style={styles.terminalAddress} numberOfLines={2}>
            {terminalAddressLine(terminal)}
          </Text>
          {distKm != null ? (
            <Text style={styles.distanceHint}>~{distKm.toFixed(1)} km from you</Text>
          ) : null}
          {terminal.transportTypes?.length ? (
            <View style={styles.tagRow}>
              {terminal.transportTypes.slice(0, 4).map((mode) => (
                <View key={mode} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{mode}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <JamIcon ionicon="chevron-left" size={26} color={WHITE} />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Terminals</Text>
            <Text style={styles.headerSubtitle} pointerEvents="none">
              {userLocation
                ? 'Tap a terminal to highlight it on the map · location sorts by distance'
                : `${terminals.length} terminals · allow location to sort by distance`}
            </Text>
          </View>
          <View style={styles.headerIconBtn} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
      >
        <View style={[styles.mapBlock, { height: MAP_BLOCK_H, marginBottom: 18 }]}>
          <LeafletMapView
            style={StyleSheet.absoluteFill}
            markers={pinMarkers}
            terminals={dotTerminals}
            userLocation={userLocation}
            onMarkerPress={(id) => setMapSelectedId(String(id))}
          />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchPill}>
            <JamIcon name="search" size={18} color={TEAL} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name, city, or address…"
              placeholderTextColor={PLACEHOLDER}
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityLabel="Search terminals"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8} accessibilityLabel="Clear search">
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

        <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>Transit type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
          style={styles.chipsScrollView}
        >
          {TRANSIT_CHIPS.map((chip) => {
            const active = transitMode === chip.mode;
            const c = active ? WHITE : TEAL;
            return (
              <TouchableOpacity
                key={chip.mode}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setTransitMode(chip.mode)}
                activeOpacity={0.85}
              >
                {chip.icon.name ? (
                  <JamIcon name="unordered-list" size={18} color={c} />
                ) : (
                  <JamIcon ionicon={chip.icon.ionicon!} size={18} color={c} />
                )}
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{chip.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.sectionLabel, { marginBottom: 12, marginTop: 4 }]}>Terminals</Text>
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <JamIcon name="bus" size={40} color={PLACEHOLDER} />
            <Text style={styles.emptyTitle}>No matches</Text>
            <Text style={styles.emptyHint}>Try another search, transit type, or area filter.</Text>
          </View>
        ) : (
          <View style={styles.terminalList}>{filtered.map((t) => renderTerminalItem(t))}</View>
        )}
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
              sectionIds={TERMINAL_FILTER_SECTION_IDS}
              onTogglesChange={onLocationTogglesChange}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#1F4F59',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  android: { elevation: 4 },
  default: {},
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  headerBar: {
    backgroundColor: HEADER_GREEN,
    paddingBottom: 14,
    paddingHorizontal: H_PAD,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconBtn: {
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
    fontSize: 19,
    color: WHITE,
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  searchPill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(31,79,89,0.1)',
    ...cardShadow,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: TITLE_DARK,
    paddingVertical: 0,
  },
  filterCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(31,79,89,0.1)',
    ...cardShadow,
  },
  sectionLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: TEAL,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  chipsScrollView: {
    marginBottom: 22,
    marginHorizontal: -H_PAD,
  },
  chipsScroll: {
    paddingHorizontal: H_PAD,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: 'rgba(31,79,89,0.12)',
  },
  chipActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  chipLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: TEAL,
  },
  chipLabelActive: {
    color: WHITE,
  },
  terminalList: {
    gap: 16,
    paddingBottom: 12,
  },
  terminalCard: {
    marginBottom: 0,
    backgroundColor: WHITE,
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    ...cardShadow,
    borderWidth: 1,
    borderColor: 'rgba(31,79,89,0.08)',
  },
  terminalCardSelected: {
    borderColor: HEADER_GREEN,
    borderWidth: 2,
  },
  openDetailsText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: TEAL,
  },
  distanceHint: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: TEAL,
    marginTop: 6,
  },
  mapBlock: {
    marginHorizontal: H_PAD,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(31,79,89,0.12)',
    backgroundColor: '#e8ebe6',
  },
  cardAccent: {
    width: 5,
    backgroundColor: HEADER_GREEN,
  },
  cardInner: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingLeft: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  terminalName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: TITLE_DARK,
    lineHeight: 22,
  },
  terminalMuni: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: TEAL,
    marginTop: 4,
  },
  terminalAddress: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
    marginTop: 4,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: PAGE_BG,
    borderWidth: 1,
    borderColor: 'rgba(31,79,89,0.08)',
  },
  tagChipText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: TEAL,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(31,79,89,0.08)',
  },
  emptyTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: TITLE_DARK,
    marginTop: 12,
  },
  emptyHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    marginTop: 6,
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

export default TerminalsScreen;
