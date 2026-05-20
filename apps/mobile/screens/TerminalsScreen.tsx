import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFloatingTabBarScrollPadding } from '../lib/mainTabBarStyle';
import { useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import {
  DashboardFiltersPanel,
  FILTER_OPTION_LABEL_BY_KEY,
  type DashboardFilterSectionId,
} from '../components/DashboardFiltersPanel';
import { mockTerminals, Terminal } from '../data/mockData';
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
const { height: SCREEN_H } = Dimensions.get('window');
const FILTER_SHEET_MAX_HEIGHT = Math.round(SCREEN_H * 0.5);

const TERMINAL_FILTER_SECTION_IDS: DashboardFilterSectionId[] = ['cities', 'municipalities'];

const EXTRA_SCROLL_BOTTOM = 56;

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

function terminalSubtitle(t: Terminal): string {
  return `${t.municipality}, Cavite`;
}

function sortTerminalsByName(list: Terminal[]): Terminal[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

const TerminalsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [locationToggles, setLocationToggles] = useState<Record<string, boolean>>({});
  const [terminals, setTerminals] = useState<Terminal[]>(mockTerminals);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  const scrollBottomPadding = getFloatingTabBarScrollPadding(insets.bottom) + EXTRA_SCROLL_BOTTOM;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = terminals.filter((t) => terminalMatchesLocationToggles(t, locationToggles));
    if (q) {
      list = list.filter((t) =>
        `${t.name} ${terminalSubtitle(t)} ${t.addressLine ?? ''}`.toLowerCase().includes(q)
      );
    }
    let ordered = sortTerminalsByName(list);
    if (
      userLocation &&
      ordered.every(
        (t) => Number.isFinite(t.latitude) && Number.isFinite(t.longitude)
      )
    ) {
      ordered = [...ordered].sort(
        (a, b) =>
          haversineDistanceKm(userLocation.lat, userLocation.lng, a.latitude, a.longitude) -
          haversineDistanceKm(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
      );
    }
    return ordered;
  }, [searchQuery, locationToggles, terminals, userLocation]);

  const openTerminalDetail = useCallback(
    (terminal: Terminal) => {
      (navigation as { navigate: (name: string, params: object) => void }).navigate('TerminalDetail', {
        terminal,
      });
    },
    [navigation]
  );

  const renderTerminalItem = (terminal: Terminal) => {
    const distKm =
      userLocation && Number.isFinite(terminal.latitude) && Number.isFinite(terminal.longitude)
        ? haversineDistanceKm(userLocation.lat, userLocation.lng, terminal.latitude, terminal.longitude)
        : null;
    const routeCount = terminal.routeCount ?? terminal.primaryRoutes?.length ?? 0;

    return (
      <TouchableOpacity
        key={terminal.id}
        style={styles.terminalCard}
        onPress={() => openTerminalDetail(terminal)}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Open ${terminal.name}`}
      >
        <View style={styles.cardInner}>
          <View style={styles.cardTopRow}>
            <Text style={styles.terminalName} numberOfLines={2}>
              {terminal.name}
            </Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{terminal.operatingHours}</Text>
            </View>
          </View>
          <Text style={styles.terminalSubtitle} numberOfLines={1}>
            {terminalSubtitle(terminal)}
          </Text>
          {distKm != null ? (
            <Text style={styles.distanceHint}>~{distKm.toFixed(1)} km from you</Text>
          ) : null}
          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>City</Text>
              <Text style={styles.metaValue}>{terminal.municipality}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Routes</Text>
              <Text style={styles.metaValue}>{routeCount}</Text>
            </View>
          </View>
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
                ? `${filtered.length} terminals · sorted by distance`
                : `${terminals.length} terminals`}
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
      >
        <View style={styles.searchRow}>
          <View style={styles.searchPill}>
            <JamIcon name="search" size={18} color={TEAL} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search terminal"
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

        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <JamIcon name="bus" size={40} color={PLACEHOLDER} />
            <Text style={styles.emptyTitle}>No matches</Text>
            <Text style={styles.emptyHint}>Try another search or area filter.</Text>
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
  terminalList: {
    gap: 12,
    paddingBottom: 12,
  },
  terminalCard: {
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(31,79,89,0.12)',
    ...cardShadow,
  },
  cardInner: {
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(122, 120, 120, 0.12)',
    maxWidth: '46%',
  },
  statusPillText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    color: MUTED,
    textAlign: 'right',
  },
  terminalName: {
    flex: 1,
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: TITLE_DARK,
    lineHeight: 20,
  },
  terminalSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: MUTED,
    marginTop: 4,
  },
  distanceHint: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: TEAL,
    marginTop: 6,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  metaCell: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: PAGE_BG,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metaLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: MUTED,
  },
  metaValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: TITLE_DARK,
    marginTop: 2,
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
