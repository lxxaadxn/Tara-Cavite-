import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import { Colors } from '../constants/theme';
import { Terminal } from '../data/mockData';
import { terminalAddressLine } from '../lib/terminalHelpers';
import { terminalTransportBullets } from '../lib/transportGuidance';
import {
  getRoutesForTerminalId,
  type TerminalRouteRow,
} from '../lib/caviteRouteCatalog';
import { fetchRoutesForTerminalId } from '../lib/fetchTerminalRoutesFromSupabase';

const TITLE_DARK = '#241D13';
const MUTED = '#868686';
const TAB_INACTIVE = '#7A7878';

type DetailTab = 'description' | 'routes';

/** Narrative copy only: about the terminal + operating hours woven in (no payment / fares). */
function descriptionFor(t: Terminal): string {
  const hoursBit = `The facility is open ${t.operatingHours}; hours may differ on holidays or during special events.`;
  if (t.description) {
    return `${t.description.trim()}\n\n${hoursBit}`;
  }
  const open = t.status === 'OPEN' ? 'open' : 'closed';
  return [
    `${t.name} is a ${open} transport hub serving ${t.transportTypes.join(', ')} and connecting passengers across the region.`,
    hoursBit,
  ].join('\n\n');
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  android: { elevation: 2 },
  default: {},
});

const TerminalDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const terminal = (route.params as { terminal?: Terminal })?.terminal;
  const [tab, setTab] = useState<DetailTab>('description');
  const [saved, setSaved] = useState(false);
  const [openGates, setOpenGates] = useState<Record<string, boolean>>({});

  const addressLine = useMemo(
    () => (terminal ? terminalAddressLine(terminal) : ''),
    [terminal]
  );
  const description = useMemo(
    () => (terminal ? descriptionFor(terminal) : ''),
    [terminal]
  );
  const [sheetRoutes, setSheetRoutes] = useState<TerminalRouteRow[]>([]);

  useEffect(() => {
    if (!terminal) {
      setSheetRoutes([]);
      return;
    }
    setSheetRoutes(getRoutesForTerminalId(terminal.id));
    let cancelled = false;
    fetchRoutesForTerminalId(terminal.id).then((rows) => {
      if (!cancelled) setSheetRoutes(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [terminal?.id]);

  useEffect(() => {
    const gates = terminal?.routesByGate;
    if (gates?.length) {
      setOpenGates({ [gates[0].gateName]: true });
    } else {
      setOpenGates({});
    }
  }, [terminal?.id]);

  const toggleGate = (gateName: string) => {
    setOpenGates((prev) => ({ ...prev, [gateName]: !prev[gateName] }));
  };

  if (!terminal) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.missingText}>Terminal not found</Text>
      </View>
    );
  }

  const hasGates = terminal.routesByGate && terminal.routesByGate.length > 0;
  const hasFlatRoutes = terminal.primaryRoutes.length > 0;
  const hasSheetRoutes = sheetRoutes.length > 0;

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
          <Text style={styles.headerTitle} numberOfLines={1}>
            {terminal.name}
          </Text>
          <View style={styles.headerIconBtn} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 32 },
        ]}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        bounces
      >
        <View style={styles.hero}>
          <JamIcon ionicon="bus" size={56} color={Colors.primary} />
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleTextCol}>
            <Text style={styles.title}>{terminal.name}</Text>
            <Text style={styles.subtitle}>{addressLine}</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, saved && styles.saveBtnActive]}
            onPress={() => setSaved((s) => !s)}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove bookmark' : 'Save terminal'}
          >
            <JamIcon
              ionicon={saved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={Colors.accent}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.tabDividerTop} />

        <View style={styles.tabBarRow}>
          <TouchableOpacity
            style={styles.tabHit}
            onPress={() => setTab('description')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'description' }}
          >
            <Text
              style={[
                styles.tabLabelText,
                tab === 'description' ? styles.tabTextActive : styles.tabTextInactive,
              ]}
            >
              Description
            </Text>
            <View
              style={[
                styles.tabLine,
                tab === 'description' ? styles.tabLineActive : styles.tabLineInactive,
              ]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabHit, styles.tabHitSpaced]}
            onPress={() => setTab('routes')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'routes' }}
          >
            <Text
              style={[
                styles.tabLabelText,
                tab === 'routes' ? styles.tabTextActive : styles.tabTextInactive,
              ]}
            >
              Routes
            </Text>
            <View
              style={[
                styles.tabLine,
                tab === 'routes' ? styles.tabLineActive : styles.tabLineInactive,
              ]}
            />
          </TouchableOpacity>
        </View>

        {tab === 'description' ? (
          <View style={styles.descriptionPanel}>
            <Text style={styles.bodyText}>{description}</Text>
          </View>
        ) : (
          <View style={styles.routesBlock}>
            {hasSheetRoutes ? (
              <View style={styles.sheetRoutesCard}>
                <Text style={styles.sheetRoutesHint}>
                  Routes where this city is the origin or destination (sheet tabs Routes and
                  Terminal_Routes). The map uses OpenStreetMap for driving to the terminal pin.
                </Text>
                {sheetRoutes.map((r) => (
                  <View key={r.terminalRouteId} style={styles.sheetRouteRow}>
                    <View style={styles.sheetRouteAccent} />
                    <View style={styles.sheetRouteBody}>
                      <Text style={styles.sheetRouteName}>{r.routeName}</Text>
                      <Text style={styles.sheetRouteMeta}>
                        {r.origin} → {r.destination}
                      </Text>
                      <View style={styles.sheetRouteModePill}>
                        <Text style={styles.sheetRouteModeText}>{r.transportName}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : !hasGates && !hasFlatRoutes ? (
              <Text style={styles.routesEmpty}>No routes listed yet.</Text>
            ) : hasGates && terminal.routesByGate ? (
              terminal.routesByGate.map((gate) => {
                const open = !!openGates[gate.gateName];
                return (
                  <View key={gate.gateName} style={styles.accordionCard}>
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      onPress={() => toggleGate(gate.gateName)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open }}
                    >
                      <Text style={styles.accordionTitle} numberOfLines={2}>
                        {gate.gateName}
                      </Text>
                      <JamIcon
                        ionicon={open ? 'chevron-up' : 'chevron-down'}
                        size={22}
                        color={Colors.primary}
                      />
                    </TouchableOpacity>
                    {open ? (
                      <View style={styles.accordionBody}>
                        {gate.routes.map((r, idx) => (
                          <View
                            key={`${gate.gateName}-${idx}`}
                            style={styles.routeLineRow}
                          >
                            <View style={styles.routeBullet} />
                            <Text style={styles.routeLineText}>{r.label}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <View style={styles.flatRoutesCard}>
                {terminal.primaryRoutes.map((r, i) => (
                  <View
                    key={i}
                    style={[
                      styles.flatRouteRow,
                      i < terminal.primaryRoutes.length - 1 && styles.flatRouteRowBorder,
                    ]}
                  >
                    <View style={styles.routeAccentBar} />
                    <Text style={styles.flatRouteText}>{r.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.transportSection}>
          <Text style={styles.transportSectionTitle}>How to get here</Text>
          <View style={styles.transportChipsRow}>
            {terminal.transportTypes.map((mode) => (
              <View key={mode} style={styles.transportChip}>
                <Text style={styles.transportChipText}>{mode}</Text>
              </View>
            ))}
          </View>
          {terminalTransportBullets(terminal.transportTypes)
            .slice(1)
            .map((line, i) => (
              <Text key={i} style={styles.transportBullet}>
                • {line}
              </Text>
            ))}
        </View>

        <TouchableOpacity
          style={styles.directionsBtn}
          onPress={() =>
            navigation.navigate('Directions', {
              place: {
                id: terminal.id,
                terminalId: terminal.id,
                name: terminal.name,
                address: addressLine,
                type: 'Terminal',
                hours: terminal.operatingHours,
                latitude: terminal.latitude,
                longitude: terminal.longitude,
                transportTypes: terminal.transportTypes,
              },
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.directionsBtnText}>Get directions (map to terminal)</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: 220,
    borderRadius: 20,
    backgroundColor: '#D9D9D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleTextCol: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    color: TITLE_DARK,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
  },
  saveBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginTop: 2,
    backgroundColor: 'rgba(126, 160, 14, 0.36)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnActive: {
    backgroundColor: 'rgba(126, 160, 14, 0.55)',
  },
  tabDividerTop: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(134,134,134,0.35)',
    marginBottom: 0,
  },
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 4,
    marginBottom: 18,
  },
  tabHit: {
    paddingTop: 10,
    minWidth: 100,
  },
  tabHitSpaced: {
    marginLeft: 28,
  },
  tabLabelText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'left',
  },
  tabTextActive: {
    color: Colors.accent,
  },
  tabTextInactive: {
    color: TAB_INACTIVE,
  },
  tabLine: {
    height: 2,
    marginTop: 8,
    borderRadius: 1,
    width: '100%',
  },
  tabLineActive: {
    backgroundColor: Colors.accent,
  },
  tabLineInactive: {
    backgroundColor: 'transparent',
  },
  descriptionPanel: {
    backgroundColor: '#F6F7F6',
    borderRadius: 14,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  bodyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    lineHeight: 24,
    color: TITLE_DARK,
  },
  routesBlock: {
    marginBottom: 22,
  },
  routesEmpty: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    paddingVertical: 24,
  },
  accordionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
    ...cardShadow,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
  },
  accordionTitle: {
    flex: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: Colors.primary,
    marginRight: 12,
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
    backgroundColor: Colors.white,
  },
  routeLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  routeBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
    marginTop: 8,
    marginRight: 12,
  },
  routeLineText: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: TITLE_DARK,
  },
  flatRoutesCard: {
    backgroundColor: '#F6F7F6',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  flatRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  flatRouteRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  routeAccentBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
    backgroundColor: Colors.accent,
    marginRight: 14,
  },
  flatRouteText: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    lineHeight: 22,
    color: TITLE_DARK,
  },
  directionsBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  directionsBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: Colors.white,
  },
  transportSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F6F7F6',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  transportSectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: TITLE_DARK,
    marginBottom: 12,
  },
  transportChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  transportChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(126, 160, 14, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(126, 160, 14, 0.45)',
  },
  transportChipText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: Colors.primary,
  },
  transportBullet: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: TITLE_DARK,
    marginBottom: 8,
  },
  missingText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    padding: 24,
  },
  sheetRoutesCard: {
    backgroundColor: '#F6F7F6',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  sheetRoutesHint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: MUTED,
    marginBottom: 14,
  },
  sheetRouteRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 12,
    backgroundColor: Colors.white,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  sheetRouteAccent: {
    width: 4,
    backgroundColor: Colors.accent,
  },
  sheetRouteBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  sheetRouteName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: TITLE_DARK,
    marginBottom: 4,
  },
  sheetRouteMeta: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: MUTED,
    marginBottom: 8,
  },
  sheetRouteModePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(31, 79, 89, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sheetRouteModeText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: Colors.primary,
  },
});

export default TerminalDetailScreen;
