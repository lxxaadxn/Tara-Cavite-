import React, { useState, useMemo, useContext, useCallback } from 'react';
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
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import {
  DashboardFiltersPanel,
  FILTER_OPTION_LABEL_BY_KEY,
  type DashboardFilterSectionId,
} from '../components/DashboardFiltersPanel';
import { Colors } from '../constants/theme';
import { mockTerminals, Terminal } from '../data/mockData';
import { terminalAddressLine } from '../lib/terminalHelpers';

/** Figma text / list emphasis */
const TITLE_DARK = '#241D13';
const PLACEHOLDER = '#B3AAAA';
const HEADER_GREEN = '#7EA00E';
const TEAL = '#1F4F59';
const H_PAD = 16;
const { height: SCREEN_H } = Dimensions.get('window');
const FILTER_SHEET_MAX_HEIGHT = Math.round(SCREEN_H * 0.5);

const TERMINAL_FILTER_SECTION_IDS: DashboardFilterSectionId[] = [
  'cities',
  'municipalities',
];

function normalizeAreaLabel(label: string): string {
  return label.replace(/\s+City\s*$/i, '').trim().toLowerCase();
}

function terminalMatchesLocationToggles(
  t: Terminal,
  toggles: Record<string, boolean>
): boolean {
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

/** Preferred row order to match design mock */
const TERMINAL_DISPLAY_ORDER = [
  'PITX',
  'SM Pala-pala terminal',
  'Robinsons Pala-pala terminal',
  'SM Molino Terminal',
];

type TransitMode = 'all' | 'modern-jeepney' | 'jeepney' | 'van' | 'bus';

const TRANSIT_TILES: { mode: TransitMode; label: string; ionicon: string }[] = [
  { mode: 'modern-jeepney', label: 'Modern Jeepney', ionicon: 'bus' },
  { mode: 'jeepney', label: 'Jeepney', ionicon: 'bus' },
  { mode: 'van', label: 'Van', ionicon: 'car' },
  { mode: 'bus', label: 'Bus', ionicon: 'bus' },
];

const EXTRA_SCROLL_BOTTOM = 40;

function sortTerminals(list: Terminal[]): Terminal[] {
  return [...list].sort((a, b) => {
    const ia = TERMINAL_DISPLAY_ORDER.indexOf(a.name);
    const ib = TERMINAL_DISPLAY_ORDER.indexOf(b.name);
    if (ia === -1 && ib === -1) return a.name.localeCompare(b.name);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

function terminalMatchesTransit(t: Terminal, mode: TransitMode): boolean {
  if (mode === 'all') return true;
  const types = t.transportTypes.map((x) => x.toLowerCase());
  switch (mode) {
    case 'modern-jeepney':
      return types.some((x) => x.includes('modern'));
    case 'jeepney':
      return types.some((x) => x.includes('jeepney'));
    case 'van':
      return types.some((x) => x.includes('van'));
    case 'bus':
      return types.some((x) => x.includes('bus'));
    default:
      return true;
  }
}

const TerminalsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [transitMode, setTransitMode] = useState<TransitMode>('all');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [locationToggles, setLocationToggles] = useState<Record<string, boolean>>({});

  const filterSheetPadBottom = Math.max(insets.bottom, 10);
  const filterScrollMaxHeight = FILTER_SHEET_MAX_HEIGHT - filterSheetPadBottom;

  const onLocationTogglesChange = useCallback((toggles: Record<string, boolean>) => {
    setLocationToggles(toggles);
  }, []);

  const scrollBottomPadding =
    tabBarHeight + Math.max(insets.bottom, 8) + EXTRA_SCROLL_BOTTOM;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = mockTerminals.filter((t) => terminalMatchesTransit(t, transitMode));
    list = list.filter((t) => terminalMatchesLocationToggles(t, locationToggles));
    if (q) {
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }
    return sortTerminals(list);
  }, [searchQuery, transitMode, locationToggles]);

  const renderTerminalItem = (terminal: Terminal) => (
    <TouchableOpacity
      key={terminal.id}
      style={styles.terminalCard}
      onPress={() =>
        navigation.navigate('TerminalDetail' as never, { terminal } as never)
      }
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${terminal.name}, ${terminalAddressLine(terminal)}`}
    >
      <JamIcon ionicon="bus" size={24} color={Colors.primary} />
      <View style={styles.terminalTextCol}>
        <Text style={styles.terminalName} numberOfLines={2}>
          {terminal.name}
        </Text>
        <Text style={styles.terminalAddress} numberOfLines={2}>
          {terminalAddressLine(terminal)}
        </Text>
      </View>
      <View style={styles.terminalChevronWrap} pointerEvents="none">
        <JamIcon ionicon="chevron-forward" size={22} color={Colors.accent} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <JamIcon ionicon="chevron-left" size={26} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terminals</Text>
          <View style={styles.headerIconBtn} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollBottomPadding },
        ]}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
      >
        <View style={styles.searchRow}>
          <View style={styles.searchPill}>
            <JamIcon name="search" size={18} color={HEADER_GREEN} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Terminals"
              placeholderTextColor={PLACEHOLDER}
              value={searchQuery}
              onChangeText={setSearchQuery}
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

        <Text style={styles.sectionHeading}>Mode of Transit</Text>
        <View style={styles.transitGrid}>
          {TRANSIT_TILES.map((tile) => {
            const active = transitMode === tile.mode;
            return (
              <TouchableOpacity
                key={tile.mode}
                style={styles.transitCell}
                onPress={() =>
                  setTransitMode((prev) => (prev === tile.mode ? 'all' : tile.mode))
                }
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.transitIconBox,
                    active && styles.transitIconBoxActive,
                  ]}
                >
                  <JamIcon
                    ionicon={tile.ionicon}
                    size={26}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.transitLabel} numberOfLines={2}>
                  {tile.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionHeading, styles.terminalsSectionTitle]}>
          Terminals
        </Text>
        {filtered.length === 0 ? (
          <Text style={styles.emptyHint}>
            No terminals match your search or filters.
          </Text>
        ) : (
          filtered.map(renderTerminalItem)
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  android: { elevation: 3 },
  default: {},
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  headerBar: {
    backgroundColor: Colors.accent,
    paddingBottom: 14,
    paddingHorizontal: 8,
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins_500Medium',
    fontSize: 20,
    lineHeight: 24,
    color: Colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    gap: 10,
    marginBottom: 20,
  },
  searchPill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 17,
    backgroundColor: Colors.white,
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
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#000000',
    paddingVertical: 0,
  },
  filterCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },
  sectionHeading: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: TITLE_DARK,
    marginBottom: 12,
  },
  terminalsSectionTitle: {
    marginTop: 8,
  },
  transitGrid: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  transitCell: {
    flex: 1,
    alignItems: 'center',
  },
  transitIconBox: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 76,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
    borderWidth: Platform.OS === 'android' ? 0 : undefined,
  },
  transitIconBoxActive: {
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  transitLabel: {
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    lineHeight: 15,
    color: Colors.accent,
  },
  terminalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 14,
    paddingLeft: 22,
    paddingRight: 16,
    minHeight: 72,
    ...cardShadow,
    overflow: 'hidden',
  },
  terminalTextCol: {
    flex: 1,
  },
  terminalName: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: TITLE_DARK,
    marginBottom: 4,
  },
  terminalAddress: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: '#868686',
  },
  terminalChevronWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: PLACEHOLDER,
    marginTop: 8,
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
