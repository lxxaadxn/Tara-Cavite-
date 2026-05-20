import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import { MapPlacePreviewCard } from '../components/MapPlacePreviewCard';
import { LeafletMapView } from '../components/LeafletMapView';
import type { LeafletMarker } from '../components/LeafletMapView';
import type { LeafletPreviewPoint } from '../components/leafletMapTypes';
import { placeToMapSpot, type CommuteLegKind } from '../data/mapBrowseSpots';
import { getMainFloatingTabBarStyle } from '../lib/mainTabBarStyle';
import { supabase } from '../lib/supabase';
import { fetchTrendingPlacesFromSupabase, logPlacesFetchError } from '../lib/placesFromSupabase';
import { fetchTerminalsFromSupabase } from '../lib/terminalsFromSupabase';
import { mockTerminals, type Place, type Terminal } from '../data/mockData';

const H_PAD = 16;
const OVERLAY_TOP = 10;
const GREEN = '#7EA00E';
const TEAL = '#1F4F59';
const MUTED = '#7A7878';
const MAP_BG = '#E8E8E8';
const TITLE = '#241D13';
const STAR = '#FFC012';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_PEEK_RATIO = 0.6;
const SHEET_ROUTE_RATIO = 0.6;
const PREVIEW_CARD_HALF_W = 144;
const PREVIEW_ABOVE_OFFSET = 168;
const PREVIEW_BELOW_OFFSET = 14;
const PREVIEW_FLIP_TOP_THRESHOLD = 170;

function legIonicon(kind: CommuteLegKind): string {
  switch (kind) {
    case 'bus':
      return 'bus-outline';
    case 'tricycle':
      return 'bicycle';
    case 'walk':
      return 'walk-outline';
    case 'terminal':
      return 'business-outline';
    case 'destination':
    default:
      return 'location-outline';
  }
}

export default function MapScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetMode, setSheetMode] = useState<'preview' | 'routes'>('preview');
  const [previewSpotId, setPreviewSpotId] = useState<string | null>(null);
  const [previewPoint, setPreviewPoint] = useState<LeafletPreviewPoint | null>(null);
  const [dbMarkers, setDbMarkers] = useState<LeafletMarker[]>([]);
  const [dbPlaces, setDbPlaces] = useState<Place[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>(mockTerminals);

  const selectedSpot = useMemo(() => {
    if (!selectedId) return undefined;
    const place = dbPlaces.find((p) => p.id === selectedId);
    return place ? placeToMapSpot(place) : undefined;
  }, [selectedId, dbPlaces]);

  const previewPlace = useMemo(() => {
    if (!previewSpotId) return undefined;
    return dbPlaces.find((p) => p.id === previewSpotId);
  }, [previewSpotId, dbPlaces]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const places = await fetchTrendingPlacesFromSupabase(supabase, 600);
        setDbPlaces(places);
        const m: LeafletMarker[] = places.map((p) => ({
          id: p.id,
          name: p.name,
          lat: p.latitude,
          lng: p.longitude,
        }));
        if (!cancelled) setDbMarkers(m);
      } catch (err) {
        logPlacesFetchError('fetchTrendingPlacesFromSupabase', err);
        if (!cancelled) {
          setDbPlaces([]);
          setDbMarkers([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const terminalMarkers = useMemo(
    () =>
      terminals.map((t) => ({
        id: `terminal-${t.id}`,
        name: t.name,
        lat: t.latitude,
        lng: t.longitude,
      })),
    [terminals]
  );

  const combinedMarkers = dbMarkers;

  const sheetHeight =
    selectedSpot == null
      ? 0
      : sheetMode === 'preview'
        ? Math.round(SCREEN_H * SHEET_PEEK_RATIO)
        : Math.round(SCREEN_H * SHEET_ROUTE_RATIO);

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

  const hideTabWhileSheetOpen = selectedSpot != null;
  const insetsBottomRef = useRef(insets.bottom);
  insetsBottomRef.current = insets.bottom;

  useLayoutEffect(() => {
    const tabNav = navigation.getParent();
    if (!tabNav) return;

    if (hideTabWhileSheetOpen) {
      tabNav.setOptions({ tabBarStyle: { display: 'none' } });
    } else {
      tabNav.setOptions({ tabBarStyle: getMainFloatingTabBarStyle(insets.bottom) });
    }
  }, [hideTabWhileSheetOpen, navigation, insets.bottom]);

  useEffect(() => {
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: getMainFloatingTabBarStyle(insetsBottomRef.current),
      });
    };
  }, [navigation]);

  const clearPreview = () => {
    setPreviewSpotId(null);
    setPreviewPoint(null);
  };

  const openTerminal = (id: string) => {
    if (!id.startsWith('terminal-')) return;
    clearPreview();
    const terminalId = id.replace('terminal-', '');
    const terminal = terminals.find((t) => t.id === terminalId);
    if (terminal) {
      navigation.navigate('TerminalDetail' as never, { terminal } as never);
    }
  };

  const openDirectionsSheet = (id: string) => {
    clearPreview();
    setSelectedId(id);
    setSheetMode('preview');
  };

  const closeSheet = () => {
    setSelectedId(null);
    setSheetMode('preview');
  };

  const openCommuteDetail = () => {
    if (!selectedSpot) return;
    navigation.navigate(
      'MapCommuteDetail' as never,
      {
        destinationName: selectedSpot.name,
        detailSteps: selectedSpot.mapCommute.detailSteps,
        destLat: selectedSpot.latitude,
        destLng: selectedSpot.longitude,
        userLat: userLocation?.lat ?? null,
        userLng: userLocation?.lng ?? null,
      } as never
    );
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={styles.mapFrame} accessibilityLabel="Map">
          <LeafletMapView
            style={styles.mapLayer}
            markers={combinedMarkers}
            terminals={terminalMarkers}
            userLocation={userLocation}
            onMarkerPress={openTerminal}
            onMarkerPreview={(id, point) => {
              if (id.startsWith('terminal-')) return;
              setPreviewSpotId(id);
              setPreviewPoint(point);
            }}
            onMarkerPreviewEnd={clearPreview}
          />

          {previewPlace && previewPoint ? (
            <View
              style={[
                styles.previewAnchor,
                {
                  left: previewPoint.x,
                  top: previewPoint.y,
                  transform: [
                    { translateX: -PREVIEW_CARD_HALF_W },
                    {
                      translateY:
                        previewPoint.y < PREVIEW_FLIP_TOP_THRESHOLD
                          ? PREVIEW_BELOW_OFFSET
                          : -PREVIEW_ABOVE_OFFSET,
                    },
                  ],
                },
              ]}
              pointerEvents="box-none"
            >
              <MapPlacePreviewCard
                place={previewPlace}
                flipBelow={previewPoint.y < PREVIEW_FLIP_TOP_THRESHOLD}
                onExplore={() => {
                  clearPreview();
                  navigation.navigate('AboutEstablishment' as never, { place: previewPlace } as never);
                }}
                onDirections={() => openDirectionsSheet(previewPlace.id)}
              />
            </View>
          ) : null}

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
                      navigation.navigate('PlaceDetail' as never, { query: query.trim() } as never);
                    }
                  }}
                />
              </View>
            </View>
          </View>

          {selectedSpot ? (
            <Pressable style={styles.sheetBackdrop} onPress={closeSheet} accessibilityLabel="Dismiss" />
          ) : null}

          {selectedSpot ? (
            <View
              style={[
                styles.sheet,
                {
                  height: sheetHeight,
                  paddingBottom: Math.max(insets.bottom, 12),
                },
              ]}
            >
              <View style={styles.sheetHandle} accessibilityLabel="Sheet" />

              {sheetMode === 'preview' ? (
                <ScrollView
                  style={styles.sheetScroll}
                  contentContainerStyle={styles.sheetScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {selectedSpot.image ? (
                    <Image
                      source={selectedSpot.image}
                      style={styles.previewImage}
                      resizeMode="cover"
                      accessibilityLabel={`${selectedSpot.name} photo`}
                    />
                  ) : (
                    <View style={[styles.previewImage, styles.previewImagePh]}>
                      <JamIcon ionicon="image-outline" size={40} color={MUTED} />
                    </View>
                  )}
                  <Text style={styles.previewTitle}>{selectedSpot.name}</Text>
                  <View style={styles.previewRatingRow}>
                    <JamIcon ionicon="star" size={16} color={STAR} />
                    <Text style={styles.previewRatingText}>
                      {selectedSpot.rating ?? '—'}
                      {selectedSpot.ratingCount ? ` (${selectedSpot.ratingCount})` : ''}
                    </Text>
                  </View>
                  <Text style={styles.previewAddress}>{selectedSpot.address}</Text>
                  <View style={styles.previewStatusRow}>
                    <View style={styles.openPill}>
                      <Text style={styles.openPillText}>Open</Text>
                    </View>
                    <Text style={styles.closesText}>{selectedSpot.closesAtLabel ?? selectedSpot.hours}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.aboutCta}
                    onPress={() => {
                      closeSheet();
                      navigation.navigate('AboutEstablishment' as never, { place: selectedSpot } as never);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="About establishment"
                  >
                    <Text style={styles.aboutCtaLabel}>ABOUT ESTABLISHMENT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.directionsCta}
                    onPress={() => setSheetMode('routes')}
                    accessibilityRole="button"
                    accessibilityLabel="Directions"
                  >
                    <Text style={styles.directionsCtaLabel}>DIRECTIONS</Text>
                  </TouchableOpacity>
                </ScrollView>
              ) : (
                <View style={styles.sheetRoutesBody}>
                  <TouchableOpacity
                    style={styles.sheetBackRow}
                    onPress={() => setSheetMode('preview')}
                    accessibilityRole="button"
                    accessibilityLabel="Back to place details"
                  >
                    <Text style={styles.sheetBackChevron}>{'>'}</Text>
                    <Text style={styles.sheetBackText}>Back</Text>
                  </TouchableOpacity>
                  <Text style={styles.routeSheetTitle}>Route steps</Text>
                  <ScrollView
                    style={styles.sheetScrollRoutes}
                    contentContainerStyle={styles.sheetScrollRoutesContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <View style={styles.timeline}>
                      {selectedSpot.mapCommute.legs.map((leg, index) => {
                        const last = index === selectedSpot.mapCommute.legs.length - 1;
                        return (
                          <View key={leg.id} style={styles.timelineRow}>
                            <View style={styles.timelineRail}>
                              <View style={styles.timelineDot} />
                              {!last ? <View style={styles.timelineLine} /> : null}
                            </View>
                            <View style={styles.timelineCard}>
                              <View style={styles.legIconWrap}>
                                <JamIcon ionicon={legIonicon(leg.kind)} size={20} color={GREEN} />
                              </View>
                              <View style={styles.timelineTextCol}>
                                <Text style={styles.legTitle}>{leg.title}</Text>
                                {leg.subtitle ? <Text style={styles.legSubtitle}>{leg.subtitle}</Text> : null}
                                {leg.badge ? (
                                  <View style={styles.legBadge}>
                                    <Text style={styles.legBadgeText}>{leg.badge}</Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.viewMoreCta}
                    onPress={openCommuteDetail}
                    accessibilityRole="button"
                    accessibilityLabel="View more step by step"
                  >
                    <Text style={styles.viewMoreCtaLabel}>VIEW MORE</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}
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
  previewAnchor: {
    position: 'absolute',
    zIndex: 4,
    width: 288,
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
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
    zIndex: 2,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    zIndex: 3,
    paddingHorizontal: H_PAD,
    paddingTop: 8,
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(122,120,120,0.35)',
    marginBottom: 8,
  },
  sheetBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  sheetBackChevron: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 20,
    lineHeight: 22,
    color: TEAL,
    marginTop: -2,
  },
  sheetBackText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: TEAL,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetRoutesBody: {
    flex: 1,
    minHeight: 0,
  },
  sheetScrollRoutes: {
    flex: 1,
    minHeight: 0,
  },
  sheetScrollRoutesContent: {
    paddingBottom: 12,
    flexGrow: 1,
  },
  sheetScrollContent: {
    paddingBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 14,
    backgroundColor: '#E8E8E8',
    marginBottom: 12,
  },
  previewImagePh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    lineHeight: 26,
    color: TITLE,
    marginBottom: 6,
  },
  previewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  previewRatingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: MUTED,
  },
  previewAddress: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
    marginBottom: 12,
  },
  previewStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  openPill: {
    backgroundColor: 'rgba(31, 79, 89, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  openPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: TEAL,
  },
  closesText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: MUTED,
    flex: 1,
  },
  aboutCta: {
    marginBottom: 10,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: TEAL,
    backgroundColor: '#FFFFFF',
  },
  aboutCtaLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: TEAL,
    letterSpacing: 0.4,
  },
  directionsCta: {
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  directionsCtaLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  routeSheetTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: TITLE,
    marginBottom: 12,
  },
  timeline: {
    marginBottom: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  timelineRail: {
    width: 22,
    alignItems: 'center',
    marginRight: 10,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GREEN,
    marginTop: 14,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(126, 160, 14, 0.35)',
    minHeight: 24,
    marginVertical: 2,
  },
  timelineCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8F8F6',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(122, 120, 120, 0.15)',
  },
  legIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(126, 160, 14, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineTextCol: {
    flex: 1,
    minWidth: 0,
  },
  legTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    lineHeight: 22,
    color: TITLE,
  },
  legSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: MUTED,
    marginTop: 4,
  },
  legBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: 'rgba(126, 160, 14, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  legBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: GREEN,
  },
  viewMoreCta: {
    alignSelf: 'center',
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 28,
    alignItems: 'center',
    marginBottom: 4,
  },
  viewMoreCtaLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.45,
  },
});
