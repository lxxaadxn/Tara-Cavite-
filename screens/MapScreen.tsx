import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { JamIcon } from '../components/JamIcon';
import { LeafletMapView } from '../components/LeafletMapView';
import { useNavigation } from '@react-navigation/native';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Place } from '../data/mockData';
import { mockTerminals } from '../data/mockData';
import { rowToPlace, type PlaceRow } from '../lib/placesFromSupabase';

const H_PAD = 16;
const OVERLAY_TOP = 10;
const GREEN = '#7EA00E';
const TEAL = '#1F4F59';
const MUTED = '#7A7878';
const MAP_BG = '#E8E8E8';

export default function MapScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [placesById, setPlacesById] = useState<Map<string, Place>>(new Map());
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('places')
        .select('id, name, address, type, hours, latitude, longitude, image_url, description, ntdp_category')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (cancelled) return;
      if (error) {
        console.warn('[MapScreen] places fetch', error.message);
        return;
      }
      const next = new Map<string, Place>();
      for (const row of data ?? []) {
        const place = rowToPlace(row as PlaceRow);
        if (place) next.set(place.id, place);
      }
      setPlacesById(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      try {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          lat: current.coords.latitude,
          lng: current.coords.longitude,
        });
      } catch {
        /* ignore */
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 20,
        },
        (loc) => {
          setUserLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          });
        }
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, []);

  const leafletMarkers = useMemo(() => {
    return Array.from(placesById.values()).map((p) => ({
      id: p.id,
      name: p.name,
      lat: p.latitude,
      lng: p.longitude,
    }));
  }, [placesById]);

  const terminalMarkers = useMemo(
    () =>
      mockTerminals.map((t) => ({
        id: `terminal-${t.id}`,
        name: t.name,
        lat: t.latitude,
        lng: t.longitude,
      })),
    []
  );

  const onMarkerPress = useCallback(
    (id: string) => {
      if (id.startsWith('terminal-')) {
        const rawId = id.replace(/^terminal-/, '');
        const terminal = mockTerminals.find((t) => String(t.id) === rawId);
        if (terminal) {
          // Prefer same-stack screen (reliable); avoids depending on tab `getParent()`.
          navigation.navigate('TerminalDetail', { terminal });
        }
        return;
      }
      const place = placesById.get(id);
      if (place) {
        navigation.navigate('PlaceDetail', { place });
      }
    },
    [navigation, placesById]
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={styles.mapFrame} accessibilityLabel="Map">
          <LeafletMapView
            style={styles.mapLayer}
            markers={leafletMarkers}
            terminals={terminalMarkers}
            userLocation={userLocation}
            onMarkerPress={onMarkerPress}
          />

          <View
            style={[styles.frameOverlay, { paddingTop: OVERLAY_TOP, paddingHorizontal: H_PAD }]}
            pointerEvents="box-none"
          >
            <View
              style={styles.wordmarkRow}
              accessible
              accessibilityRole="header"
              accessibilityLabel="CaviTour"
              pointerEvents="none"
            >
              <Text style={styles.wordmarkC}>C</Text>
              <Text style={styles.wordmarkAvi}>avi</Text>
              <Text style={styles.wordmarkTour}>Tour</Text>
            </View>

            <View style={styles.searchWrap} accessibilityRole="search" pointerEvents="auto">
              <View style={styles.searchPill}>
                <JamIcon name="search" size={17} color={MUTED} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Where are you going?"
                  placeholderTextColor={MUTED}
                  style={styles.searchInput}
                  accessibilityLabel="Search map destinations"
                  returnKeyType="search"
                  onSubmitEditing={() => {
                    if (query.trim()) {
                      navigation.navigate('PlaceDetail', { query: query.trim() });
                    }
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MAP_BG,
  },
  safeTop: {
    flex: 1,
    backgroundColor: MAP_BG,
  },
  mapFrame: {
    flex: 1,
    width: '100%',
    backgroundColor: MAP_BG,
  },
  mapLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: MAP_BG,
  },
  frameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 10,
  },
  wordmarkC: {
    fontFamily: 'Pacifico_400Regular',
    fontSize: 34,
    lineHeight: 40,
    color: GREEN,
  },
  wordmarkAvi: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 34,
    lineHeight: 40,
    color: GREEN,
  },
  wordmarkTour: {
    fontFamily: 'Pacifico_400Regular',
    fontSize: 34,
    lineHeight: 40,
    color: TEAL,
  },
  searchWrap: {
    borderRadius: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 3,
    alignSelf: 'stretch',
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(122, 120, 120, 0.35)',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#000000',
  },
});
