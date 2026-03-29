import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useRoute, useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import { DirectionsMapView } from '../components/DirectionsMapView';
import { Colors, Theme } from '../constants/theme';
import {
  fetchDrivingRoute,
  formatDistanceM,
  formatDurationS,
  type OsrmRouteResult,
} from '../lib/fetchOsrmRoute';
import { parsePlaceCoords } from '../lib/placeCoords';
import type { DirectionsMapPayload } from '../lib/directionsMapBridge';

const MAP_FILTERS = [
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'transit', label: 'Transit' },
  { id: 'hotels', label: 'Hotels' },
  { id: 'souvenir', label: 'Souvenir Shops' },
];

const DirectionsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const place = (route.params as { place?: Record<string, unknown> })?.place;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const dest = useMemo(
    () => (place ? parsePlaceCoords(place as { latitude?: unknown; longitude?: unknown }) : null),
    [place]
  );

  const [userPt, setUserPt] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [routeResult, setRouteResult] = useState<OsrmRouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') {
        setLocStatus('denied');
        return;
      }
      setLocStatus('granted');
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setUserPt({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        }
      } catch {
        if (!cancelled) setLocStatus('denied');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadRoute = useCallback(async () => {
    if (!dest || !userPt) {
      setRouteResult(null);
      setRouteError(null);
      return;
    }
    setRouteLoading(true);
    setRouteError(null);
    try {
      const r = await fetchDrivingRoute(userPt, dest);
      if (!r) {
        setRouteResult(null);
        setRouteError('No driving route found. Showing a straight line instead.');
        return;
      }
      setRouteResult(r);
    } catch {
      setRouteResult(null);
      setRouteError('Could not load directions. Check your connection.');
    } finally {
      setRouteLoading(false);
    }
  }, [dest, userPt]);

  useEffect(() => {
    loadRoute();
  }, [loadRoute]);

  const mapPayload: DirectionsMapPayload = useMemo(
    () => ({
      userLat: userPt?.lat ?? null,
      userLng: userPt?.lng ?? null,
      destLat: dest?.lat ?? 14.32,
      destLng: dest?.lng ?? 120.97,
      routeGeoJson: routeResult?.geometry ?? null,
    }),
    [userPt, dest, routeResult]
  );

  if (!place || !dest) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.banner}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.goBack()}>
            <JamIcon ionicon="chevron-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.bannerTitle}>Directions</Text>
          <View style={styles.menuBtn} />
        </View>
        <View style={styles.missingWrap}>
          <Text style={styles.missingText}>No destination selected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.banner}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.goBack()}>
          <JamIcon ionicon="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.bannerTitle} numberOfLines={1}>
          {place.name as string}
        </Text>
        <View style={styles.menuBtn} />
      </View>

      <View style={styles.searchBar}>
        <JamIcon ionicon="search" size={20} color={Colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Where are you going?"
          placeholderTextColor={Colors.text.light}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <JamIcon ionicon="location" size={20} color={Colors.text.secondary} />
      </View>

      <View style={styles.filtersRow}>
        {MAP_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, selectedFilter === f.id && styles.filterChipActive]}
            onPress={() => setSelectedFilter(selectedFilter === f.id ? null : f.id)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === f.id && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mapContainer}>
          <DirectionsMapView payload={mapPayload} style={styles.mapInner} />
          {routeLoading ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.mapLoadingText}>Loading route…</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.destAddress} numberOfLines={3}>
            {(place.address as string) || 'Destination'}
          </Text>
          {locStatus === 'denied' && !userPt ? (
            <Text style={styles.hint}>
              Location is off — enable it to see directions from where you are.
            </Text>
          ) : null}
          {userPt && routeResult ? (
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <JamIcon ionicon="navigate" size={18} color={Colors.primary} />
                <Text style={styles.summaryValue}>{formatDistanceM(routeResult.distanceM)}</Text>
                <Text style={styles.summaryLabel}>Distance</Text>
              </View>
              <View style={styles.summaryItem}>
                <JamIcon ionicon="time-outline" size={18} color={Colors.primary} />
                <Text style={styles.summaryValue}>{formatDurationS(routeResult.durationS)}</Text>
                <Text style={styles.summaryLabel}>Driving (est.)</Text>
              </View>
            </View>
          ) : null}
          {routeError ? <Text style={styles.warnText}>{routeError}</Text> : null}
          <Text style={styles.routingNote}>
            Routes use OpenStreetMap data via OSRM (driving). Actual roads and traffic may differ.
          </Text>
        </View>

        {routeResult && routeResult.steps.length > 0 ? (
          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>Turn-by-turn</Text>
            {routeResult.steps.map((s, i) => (
              <View key={i} style={[styles.stepRow, i > 0 && styles.stepRowBorder]}>
                <Text style={styles.stepIndex}>{i + 1}</Text>
                <View style={styles.stepBody}>
                  <Text style={styles.stepInstruction}>{s.instruction}</Text>
                  <Text style={styles.stepMeta}>
                    {formatDistanceM(s.distanceM)} · {formatDurationS(s.durationS)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingHorizontal: Theme.spacing.sm,
    paddingBottom: Theme.spacing.md,
    backgroundColor: Colors.gradient.start,
  },
  bannerTitle: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm + 4,
    borderRadius: Theme.borderRadius.md,
    ...Theme.shadows.card,
  },
  searchInput: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    fontSize: 16,
    color: Colors.text.primary,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Colors.white,
    ...Theme.shadows.card,
  },
  filterChipActive: {
    backgroundColor: Colors.primary + '20',
  },
  filterChipText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  mapContainer: {
    height: 280,
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    ...Theme.shadows.card,
  },
  mapInner: {
    flex: 1,
    borderRadius: Theme.borderRadius.md,
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  summaryCard: {
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.md,
    ...Theme.shadows.card,
  },
  destAddress: {
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  hint: {
    marginTop: 10,
    fontSize: 13,
    color: Colors.text.secondary,
  },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  summaryLabel: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.text.light,
  },
  warnText: {
    marginTop: 10,
    fontSize: 13,
    color: '#b45309',
  },
  routingNote: {
    marginTop: 12,
    fontSize: 11,
    color: Colors.text.light,
    lineHeight: 16,
  },
  stepsCard: {
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.md,
    ...Theme.shadows.card,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  stepRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  stepIndex: {
    width: 26,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    paddingTop: 2,
  },
  stepBody: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  stepMeta: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.text.light,
  },
  missingWrap: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  missingText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});

export default DirectionsScreen;
