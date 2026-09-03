import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import { mockRoutes, Route } from '../data/mockData';

const GREEN = '#10A37F';
const TEAL = '#1B8A70';
const TITLE = '#241D13';
const MUTED = '#7A7878';
const WHITE = '#FFFFFF';

interface GroupedRoute {
  key: 'today' | 'yesterday' | 'lastMonth';
  title: string;
  routes: Route[];
  rightLabel: string;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function resolveHistoryDates(routes: Route[], now: Date): Route[] {
  const todayStr = toDateKey(now);
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  const yesterdayStr = toDateKey(yest);
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = toDateKey(prevMonth);

  return routes.map((r) => {
    if (!r.historyRelative) return r;
    if (r.historyRelative === 'today') return { ...r, date: todayStr };
    if (r.historyRelative === 'yesterday') return { ...r, date: yesterdayStr };
    return { ...r, date: lastMonthStr };
  });
}

function compactDepartureLabel(departureTime: string): string {
  const t = departureTime.trim();
  if (/12:00\s*NN/i.test(t)) return '12NN';
  let s = t.replace(/\s+/g, '');
  s = s.replace(/:00(?=[AP]M)/i, '');
  return s;
}

function departureSortMinutes(departureTime: string): number {
  const t = departureTime.trim().toUpperCase();
  if (t.includes('NN')) return 12 * 60;
  const isPm = t.includes('PM');
  const core = t.replace(/AM|PM|\s/gi, '');
  const [hRaw, mRaw = '0'] = core.split(':');
  let h = parseInt(hRaw, 10);
  const mins = parseInt(mRaw, 10) || 0;
  if (Number.isNaN(h)) return 0;
  if (isPm && h !== 12) h += 12;
  if (!isPm && h === 12) h = 0;
  return h * 60 + mins;
}

function sortRoutesByDeparture(routes: Route[]): Route[] {
  return [...routes].sort((a, b) => departureSortMinutes(a.departureTime) - departureSortMinutes(b.departureTime));
}

function parseDurationToMinutes(s: string): number {
  let total = 0;
  const hr = s.match(/(\d+)\s*hr/i);
  if (hr) total += parseInt(hr[1], 10) * 60;
  const min = s.match(/(\d+)\s*mins?/i);
  if (min) total += parseInt(min[1], 10);
  return total;
}

function formatSectionTotal(routes: Route[]): string {
  const mins = routes.reduce((acc, r) => acc + parseDurationToMinutes(r.duration), 0);
  if (mins <= 0) return '';
  if (mins < 60) return `${mins}mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}hr${h === 1 ? '' : 's'}`;
  return `${h}hr ${m}mins`;
}

function formatMonthDay(dateKey: string): string {
  const [y, mo, d] = dateKey.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, mo - 1, d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).replace(' ', '');
}

const HistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const sections = useMemo((): GroupedRoute[] => {
    const now = new Date();
    const resolved = resolveHistoryDates(mockRoutes, now);
    const todayKey = toDateKey(now);
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yesterdayKey = toDateKey(y);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const inPrevMonth = (dateKey: string) => {
      const [Y, M, D] = dateKey.split('-').map((x) => parseInt(x, 10));
      const dt = new Date(Y, M - 1, D);
      return dt >= prevMonthStart && dt <= prevMonthEnd;
    };

    const todayRoutes = sortRoutesByDeparture(resolved.filter((r) => r.date === todayKey));
    const yesterdayRoutes = sortRoutesByDeparture(resolved.filter((r) => r.date === yesterdayKey));
    const lastMonthRoutes = sortRoutesByDeparture(resolved.filter((r) => inPrevMonth(r.date)));

    const out: GroupedRoute[] = [];
    if (todayRoutes.length) {
      out.push({
        key: 'today',
        title: 'Today',
        routes: todayRoutes,
        rightLabel: formatSectionTotal(todayRoutes),
      });
    }
    if (yesterdayRoutes.length) {
      out.push({
        key: 'yesterday',
        title: 'Yesterday',
        routes: yesterdayRoutes,
        rightLabel: formatSectionTotal(yesterdayRoutes),
      });
    }
    if (lastMonthRoutes.length) {
      const firstKey = [...lastMonthRoutes].sort((a, b) => a.date.localeCompare(b.date))[0]?.date ?? '';
      out.push({
        key: 'lastMonth',
        title: 'Last month',
        routes: lastMonthRoutes,
        rightLabel: formatMonthDay(firstKey),
      });
    }
    return out;
  }, []);

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
          <Text style={styles.headerTitle} numberOfLines={1} pointerEvents="none">
            History
          </Text>
          <View style={styles.headerIconBtn} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.rightLabel ? (
                <Text style={styles.sectionRight}>{section.rightLabel}</Text>
              ) : null}
            </View>
            {section.routes.map((route) => (
              <TouchableOpacity
                key={route.id}
                activeOpacity={0.7}
                accessibilityLabel={`${route.name}, Departed ${route.departureTime}, Duration ${route.duration}`}
                accessibilityRole="button"
              >
                <View style={styles.routeCard}>
                  <JamIcon ionicon="time-outline" size={24} color={TEAL} />
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeName}>{route.name}</Text>
                    <Text style={styles.routeMeta}>
                      Departed {compactDepartureLabel(route.departureTime)} | {route.duration}
                    </Text>
                  </View>
                  <JamIcon ionicon="chevron-forward" size={18} color={TEAL} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WHITE,
  },
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
  headerTitle: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 20,
    lineHeight: 24,
    color: WHITE,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    lineHeight: 24,
    color: TEAL,
  },
  sectionRight: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    color: MUTED,
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 18,
    paddingVertical: 10,
    paddingLeft: 20,
    paddingRight: 16,
    marginBottom: 8,
    gap: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(122, 120, 120, 0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  routeInfo: {
    flex: 1,
    minWidth: 0,
  },
  routeName: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    lineHeight: 24,
    color: TITLE,
    marginBottom: 2,
  },
  routeMeta: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: MUTED,
  },
});

export default HistoryScreen;
