import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { JamIcon } from '../components/JamIcon';
import { SaveToListSheet, type SaveToListRow } from '../components/SaveToListSheet';
import { Place, type Terminal } from '../data/mockData';
import { parsePlaceCoords } from '../lib/placeCoords';
import { placeImageSource } from '../lib/placeImageSource';
import { formatNtdpCategoryTagLabel } from '../lib/ntdpDisplayLabels';
import {
  fetchDrivingRoute,
  fetchFootRoute,
  formatDistanceM,
  formatDurationS,
  type OsrmRouteResult,
  type RouteStepUi,
} from '../lib/fetchOsrmRoute';
import {
  buildCommuterNarrativeFromOsrmSteps,
  commuterDirectStepInstruction,
} from '../lib/commuterRouteNarration';
import type { DirectionsMapPayload } from '../lib/directionsMapBridge';
import { supabase } from '../lib/supabase';
import {
  isSupabasePlaceId,
  isPlaceSavedByUser,
  isTerminalSavedByUser,
  isItinerarySavedByUser,
  removePlaceFromAllUserLists,
  removeTerminalFromAllUserLists,
  removeItineraryFromAllUserLists,
  addPlaceToSavedList,
  addTerminalToSavedList,
  addItineraryToSavedList,
  placeRowExists,
  fetchUserListsForPicker,
} from '../lib/savedListItems';
import {
  planNearestTerminalsForPlaceCommute,
  fetchNearestTerminalForUser,
  type TerminalTransitPlan,
} from '../lib/terminalTransitPlanner';
import { recordDestinationReached } from '../lib/destinationReachedActivity';
import { haversineDistanceKm } from '../lib/placesFromSupabase';

const GREEN = '#7EA00E';
const TEAL = '#1F4F59';
const OLIVE = '#213502';
const TITLE = '#241D13';
const MUTED = '#868686';
const WHITE = '#FFFFFF';
const PAGE_BG = '#FAFAF8';
const CARD_BORDER = 'rgba(122, 120, 120, 0.18)';
/** Shown above route content — commuters are the primary audience. */
const COMMUTER_DISCLAIMER =
  'Steps follow the mapped road (OSRM / OpenStreetMap), not live transit schedules. Confirm signs, fares, and stops with operators.';

const COMMUTER_FOOTNOTE = 'Roads and stops change — double-check locally, especially if you drive.';

const PILL_STYLES = {
  green: { bg: 'rgba(126, 160, 14, 0.5)', text: GREEN },
  teal: { bg: 'rgba(31, 79, 89, 0.5)', text: TEAL },
} as const;

type PillVariant = keyof typeof PILL_STYLES;

export type DirectionsScreenParams = {
  place: Place;
  /** Live GPS updates on the map while this screen is open (foreground). */
  caviTrip?: boolean;
};

function buildTags(place: Place): { label: string; variant: PillVariant }[] {
  const out: { label: string; variant: PillVariant }[] = [];
  if (place.type) out.push({ label: place.type, variant: 'green' });
  if (place.ntdp_category) {
    out.push({ label: formatNtdpCategoryTagLabel(place.ntdp_category), variant: 'teal' });
  } else if (!place.ntdp_category && place.type !== 'Terminal') {
    out.push({ label: 'Alfresco', variant: 'teal' });
  }
  return out;
}

function buildNarrativeGuide(steps: RouteStepUi[], destinationLabel: string): string {
  return buildCommuterNarrativeFromOsrmSteps(steps, destinationLabel);
}

function commuterStepHint(index: number, total: number, stepDistanceM: number): string {
  if (total <= 0 || stepDistanceM < 200) return '';
  if (index === total - 1) {
    return 'PUVs may stop before narrow streets — ask to alight at a main corner if needed.';
  }
  return 'If your ride leaves this road, transfer at a crossing or terminal.';
}

/** Minimal `Terminal` for navigation — detail screen loads routes by id. */
function placeImageUriForActivity(place: Place): string | undefined {
  const img = place.image as unknown;
  if (img == null) return undefined;
  if (typeof img === 'number') return undefined;
  if (typeof img === 'object' && img !== null && 'uri' in img) {
    return String((img as { uri: string }).uri);
  }
  return undefined;
}

function terminalPlanNodeToStub(node: TerminalTransitPlan['originTerminal']): Terminal {
  return {
    id: node.id,
    name: node.name,
    municipality: node.municipality,
    addressLine: `${node.municipality}, Cavite`,
    category: 'other',
    transportTypes: ['Jeepney'],
    status: 'OPEN',
    operatingHours: 'See terminal',
    averageFare: '—',
    paymentType: 'Cash',
    primaryRoutes: [],
    reminders: [],
    latitude: node.latitude,
    longitude: node.longitude,
  };
}

/**
 * Route & map flow: same green chrome as establishment details (no legacy purple header).
 * Opened from “Get directions” with `{ place }`.
 */
const DirectionsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const raw = route.params as DirectionsScreenParams | undefined;
  const place = raw?.place;
  const caviTrip = Boolean(raw?.caviTrip);

  const isTerminal = place?.type === 'Terminal';
  const isItinerary = place?.type === 'Itinerary';
  /** Show boarding + near-destination terminal hints (no T2T graph). */
  const showPlaceOrItineraryTerminalHints = Boolean(place) && !isTerminal;
  const destCoords = useMemo(() => (place ? parsePlaceCoords(place) : null), [place]);

  const [tab, setTab] = useState<'routeSteps' | 'stepGuide' | 'viaTerminals'>('routeSteps');
  const [userPt, setUserPt] = useState<{ lat: number; lng: number } | null>(null);
  /** Updated while CaviTrip is on — map dot follows you; route stays from the first fix. */
  const [liveUserPt, setLiveUserPt] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [routeDriving, setRouteDriving] = useState<OsrmRouteResult | null>(null);
  const [routeFoot, setRouteFoot] = useState<OsrmRouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [terminalPlan, setTerminalPlan] = useState<TerminalTransitPlan | null>(null);
  const [terminalPlanLoading, setTerminalPlanLoading] = useState(false);
  /** When the destination is a terminal: nearest hub from the user's GPS (e.g. first mile / going home). */
  const [nearestTerminalFromUser, setNearestTerminalFromUser] = useState<
    TerminalTransitPlan['originTerminal'] | null
  >(null);

  const [saved, setSaved] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [pickLists, setPickLists] = useState<SaveToListRow[]>([]);
  const [saveListBusyId, setSaveListBusyId] = useState<string | null>(null);
  const [checkingSaved, setCheckingSaved] = useState(false);
  const [destinationReachedBusy, setDestinationReachedBusy] = useState(false);

  const tags = useMemo(() => (place ? buildTags(place) : []), [place]);
  const commuteFromLabel = userPt ? 'Your current location' : 'Current location';

  useEffect(() => {
    if (!place) return;
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
          const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserPt(pt);
          if (caviTrip) setLiveUserPt(pt);
        }
      } catch {
        if (!cancelled) setLocStatus('denied');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [place, caviTrip]);

  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!place || !caviTrip || locStatus !== 'granted') {
      locationWatchRef.current?.remove();
      locationWatchRef.current = null;
      return;
    }
    let cancelled = false;
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 8000,
        distanceInterval: 35,
      },
      (loc) => {
        if (!cancelled) {
          setLiveUserPt({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      }
    )
      .then((sub) => {
        if (cancelled) {
          sub.remove();
          return;
        }
        locationWatchRef.current?.remove();
        locationWatchRef.current = sub;
      })
      .catch(() => {
        /* keep last live position */
      });
    return () => {
      cancelled = true;
      locationWatchRef.current?.remove();
      locationWatchRef.current = null;
    };
  }, [place, caviTrip, locStatus]);

  useEffect(() => {
    if (!place || !destCoords || !userPt) {
      setRouteDriving(null);
      setRouteFoot(null);
      setRouteLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setRouteLoading(true);
      setRouteError(null);
      try {
        const [d, f] = await Promise.all([
          fetchDrivingRoute(userPt, destCoords),
          fetchFootRoute(userPt, destCoords),
        ]);
        if (cancelled) return;
        setRouteDriving(d);
        setRouteFoot(f);
        if (!d) {
          setRouteError(
            'No road corridor found between you and this place. Open the full map to plan transfers or walk links manually.'
          );
        }
      } catch {
        if (!cancelled) {
          setRouteDriving(null);
          setRouteFoot(null);
          setRouteError('Could not load this corridor. Check your connection and try again.');
        }
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [place, destCoords, userPt]);

  useEffect(() => {
    if (!userPt) {
      setTerminalPlan(null);
      setNearestTerminalFromUser(null);
      setTerminalPlanLoading(false);
      return;
    }
    if (!place) {
      setTerminalPlan(null);
      setNearestTerminalFromUser(null);
      setTerminalPlanLoading(false);
      return;
    }

    let cancelled = false;
    setTerminalPlanLoading(true);
    (async () => {
      try {
        if (isTerminal) {
          const nt = await fetchNearestTerminalForUser(supabase, userPt);
          if (!cancelled) {
            setTerminalPlan(null);
            setNearestTerminalFromUser(nt);
          }
          return;
        }
        if (!destCoords) {
          if (!cancelled) {
            setTerminalPlan(null);
            setNearestTerminalFromUser(null);
          }
          return;
        }
        const plan = await planNearestTerminalsForPlaceCommute(supabase, userPt, destCoords);
        if (!cancelled) {
          setTerminalPlan(plan);
          setNearestTerminalFromUser(null);
        }
      } catch {
        if (!cancelled) {
          setTerminalPlan(null);
          setNearestTerminalFromUser(null);
        }
      } finally {
        if (!cancelled) {
          setTerminalPlanLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userPt, destCoords, isTerminal, place]);

  const mapUserPt = caviTrip ? liveUserPt ?? userPt : userPt;

  const mapPayload: DirectionsMapPayload = useMemo(
    () => ({
      userLat: mapUserPt?.lat ?? null,
      userLng: mapUserPt?.lng ?? null,
      destLat: destCoords?.lat ?? 0,
      destLng: destCoords?.lng ?? 0,
      routeGeoJson: routeDriving?.geometry ?? routeFoot?.geometry ?? null,
      routeSegmentsGeoJson: null,
    }),
    [mapUserPt, destCoords, routeDriving, routeFoot]
  );

  const refreshSavedState = useCallback(async () => {
    if (!place) {
      setSaved(false);
      setCheckingSaved(false);
      return;
    }
    setCheckingSaved(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaved(false);
        return;
      }
      if (isItinerary) {
        const yes = await isItinerarySavedByUser(supabase, user.id, place.id);
        setSaved(yes);
        return;
      }
      if (isTerminal) {
        const yes = await isTerminalSavedByUser(supabase, user.id, place.id);
        setSaved(yes);
        return;
      }
      if (!isSupabasePlaceId(place.id)) {
        setSaved(false);
        return;
      }
      const yes = await isPlaceSavedByUser(supabase, user.id, place.id);
      setSaved(yes);
    } catch {
      setSaved(false);
    } finally {
      setCheckingSaved(false);
    }
  }, [place, isItinerary, isTerminal]);

  useEffect(() => {
    refreshSavedState();
  }, [refreshSavedState]);

  useFocusEffect(
    useCallback(() => {
      refreshSavedState();
    }, [refreshSavedState])
  );

  const onShare = async () => {
    if (!place) return;
    try {
      await Share.share({
        message: `${place.name}\n${place.address}`,
        title: place.name,
      });
    } catch {
      /* ignore */
    }
  };

  const openSaveToListPicker = async () => {
    if (!place) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Sign in', 'Sign in to save to your lists.');
      return;
    }

    if (isItinerary) {
      try {
        const lists = await fetchUserListsForPicker(supabase, user.id);
        if (!lists.length) {
          Alert.alert(
            'No saved lists yet',
            'Create a list first from your profile under Saved list, then come back here.'
          );
          return;
        }
        setPickLists(lists);
        setSaveModalVisible(true);
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Could not load lists.');
      }
      return;
    }

    if (isTerminal) {
      try {
        const lists = await fetchUserListsForPicker(supabase, user.id);
        if (!lists.length) {
          Alert.alert(
            'No saved lists yet',
            'Create a list first from your profile under Saved list, then come back here.'
          );
          return;
        }
        setPickLists(lists);
        setSaveModalVisible(true);
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Could not load lists.');
      }
      return;
    }

    if (!isSupabasePlaceId(place.id)) {
      Alert.alert(
        'Can’t save this place',
        'Only catalog locations with a database id can be added to a saved list.'
      );
      return;
    }
    const exists = await placeRowExists(supabase, place.id);
    if (!exists) {
      Alert.alert('Place not found', 'This location is not in the catalog yet and can’t be saved.');
      return;
    }
    try {
      const lists = await fetchUserListsForPicker(supabase, user.id);
      if (!lists.length) {
        Alert.alert(
          'No saved lists yet',
          'Create a list first from your profile under Saved list, then come back here.'
        );
        return;
      }
      setPickLists(lists);
      setSaveModalVisible(true);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not load lists.');
    }
  };

  const onConfirmRemoveSave = () => {
    if (!place) return;
    Alert.alert('Remove from saved lists?', 'This removes the item from every list it’s in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
              setSaved(false);
              return;
            }
            if (isItinerary) {
              await removeItineraryFromAllUserLists(supabase, user.id, place.id);
            } else if (isTerminal) {
              await removeTerminalFromAllUserLists(supabase, user.id, place.id);
            } else if (isSupabasePlaceId(place.id)) {
              await removePlaceFromAllUserLists(supabase, user.id, place.id);
            }
            setSaved(false);
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not update saved lists.');
          }
        },
      },
    ]);
  };

  const onPressSaveFab = () => {
    if (saved) onConfirmRemoveSave();
    else openSaveToListPicker();
  };

  const onPickList = async (list: SaveToListRow) => {
    if (!place) return;
    setSaveListBusyId(list.id);
    try {
      if (isItinerary) {
        const res = await addItineraryToSavedList(supabase, list.id, place.id);
        if (res.ok) {
          setSaveModalVisible(false);
          setSaved(true);
          Alert.alert('Saved', `Added to “${list.name}”.`);
          return;
        }
        if (res.duplicate) {
          setSaveModalVisible(false);
          setSaved(true);
          Alert.alert('Already in list', `“${place.name}” is already in “${list.name}”.`);
          return;
        }
        Alert.alert('Error', res.message ?? 'Could not save to this list.');
        return;
      }
      if (isTerminal) {
        const res = await addTerminalToSavedList(supabase, list.id, place.id);
        if (res.ok) {
          setSaveModalVisible(false);
          setSaved(true);
          Alert.alert('Saved', `Added to “${list.name}”.`);
          return;
        }
        if (res.duplicate) {
          setSaveModalVisible(false);
          setSaved(true);
          Alert.alert('Already in list', `“${place.name}” is already in “${list.name}”.`);
          return;
        }
        Alert.alert('Error', res.message ?? 'Could not save to this list.');
        return;
      }
      if (!isSupabasePlaceId(place.id)) return;
      const res = await addPlaceToSavedList(supabase, list.id, place.id);
      if (res.ok) {
        setSaveModalVisible(false);
        setSaved(true);
        Alert.alert('Saved', `Added to “${list.name}”.`);
        return;
      }
      if (res.duplicate) {
        setSaveModalVisible(false);
        setSaved(true);
        Alert.alert('Already in list', `“${place.name}” is already in “${list.name}”.`);
        return;
      }
      Alert.alert('Error', res.message ?? 'Could not save to this list.');
    } finally {
      setSaveListBusyId(null);
    }
  };

  const openFullMap = () => {
    if (!destCoords) {
      Alert.alert('Map unavailable', 'This destination does not have map coordinates yet.');
      return;
    }
    (navigation as { navigate: (name: string, params: object) => void }).navigate('FullRouteMap', {
      mapPayload,
    });
  };

  const onDestinationReached = useCallback(async () => {
    if (!place?.id) return;
    if (!isSupabasePlaceId(place.id)) {
      Alert.alert('Not available', 'Only catalog places can be counted toward Activity this month.');
      return;
    }
    setDestinationReachedBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Sign in', 'Sign in to add this trip to your monthly activity.');
        return;
      }
      await recordDestinationReached(user.id, place.id, {
        name: place.name,
        image: placeImageUriForActivity(place),
      });
      Alert.alert('', 'Thank You and Enjoy your trip');
    } finally {
      setDestinationReachedBusy(false);
    }
  }, [place]);

  if (!place) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24, backgroundColor: PAGE_BG }]}>
        <Text style={styles.missingText}>No destination selected.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.missingBack}>
          <Text style={styles.missingBackLabel}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: PAGE_BG }]}>
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
            {place.name}
          </Text>
          <View style={styles.headerIconBtn} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          {placeImageSource(place.image) ? (
            <Image
              source={placeImageSource(place.image)!}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityLabel={`${place.name} photo`}
            />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <JamIcon ionicon="image-outline" size={48} color={MUTED} />
            </View>
          )}
        </View>

        <Text style={styles.placeName}>{place.name}</Text>

        {caviTrip && locStatus === 'granted' ? (
          <View style={styles.caviTripBanner}>
            <JamIcon ionicon="navigate" size={18} color={TEAL} />
            <Text style={styles.caviTripBannerText}>
              CaviTrip is on — your blue dot on the map updates as you move. Keep this screen open for live GPS
              (foreground).
            </Text>
          </View>
        ) : null}

        <View style={styles.tagsAndActionsRow}>
          <View style={styles.pillRow}>
            {tags.map((t) => {
              const ps = PILL_STYLES[t.variant];
              return (
                <View key={`${t.label}-${t.variant}`} style={[styles.pill, { backgroundColor: ps.bg }]}>
                  <Text style={[styles.pillText, { color: ps.text }]}>{t.label}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.actionPair}>
            <TouchableOpacity
              style={[styles.fab, styles.fabSave, saved && styles.fabSaveActive]}
              onPress={onPressSaveFab}
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Remove save' : 'Save'}
              activeOpacity={0.82}
              disabled={checkingSaved}
            >
              {checkingSaved ? (
                <ActivityIndicator size="small" color={saved ? WHITE : GREEN} />
              ) : (
                <JamIcon ionicon="bookmark-outline" size={20} color={saved ? WHITE : GREEN} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fab, styles.fabShare]}
              onPress={onShare}
              accessibilityRole="button"
              accessibilityLabel="Share"
              activeOpacity={0.82}
            >
              <JamIcon ionicon="share-outline" size={20} color={TEAL} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.segmentWrap} accessibilityRole="tablist">
          <Pressable
            onPress={() => setTab('routeSteps')}
            style={[styles.segmentSlot, tab === 'routeSteps' && styles.segmentSlotActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'routeSteps' }}
          >
            <Text
              style={[
                styles.segmentLabel,
                styles.segmentLabelCompact,
                tab === 'routeSteps' ? styles.segmentLabelOn : styles.segmentLabelOff,
              ]}
              numberOfLines={2}
            >
              Commute steps
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('stepGuide')}
            style={[styles.segmentSlot, tab === 'stepGuide' && styles.segmentSlotActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'stepGuide' }}
          >
            <Text
              style={[
                styles.segmentLabel,
                styles.segmentLabelCompact,
                tab === 'stepGuide' ? styles.segmentLabelOn : styles.segmentLabelOff,
              ]}
              numberOfLines={2}
            >
              Commuter guide
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('viaTerminals')}
            style={[styles.segmentSlot, tab === 'viaTerminals' && styles.segmentSlotActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'viaTerminals' }}
          >
            <Text
              style={[
                styles.segmentLabel,
                styles.segmentLabelCompact,
                tab === 'viaTerminals' ? styles.segmentLabelOn : styles.segmentLabelOff,
              ]}
              numberOfLines={2}
            >
              Via Terminals
            </Text>
          </Pressable>
        </View>

        {tab === 'routeSteps' ? (
          <View style={styles.routeCard}>
            <View style={styles.mapsPlannerCard}>
              <View style={styles.mapsModeRow}>
                <View style={[styles.mapsModeChip, styles.mapsModeChipActive]}>
                  <JamIcon ionicon="checkmark-circle" size={14} color={TEAL} />
                  <Text style={styles.mapsModeChipText}>Best</Text>
                </View>
                <View style={styles.mapsModeChip}>
                  <JamIcon ionicon="bus" size={14} color={TEAL} />
                </View>
                <View style={styles.mapsModeChip}>
                  <JamIcon ionicon="walk" size={14} color={TEAL} />
                </View>
              </View>

              <View style={styles.mapsInputCard}>
                <View style={styles.mapsInputRow}>
                  <JamIcon ionicon="radio-button-off-outline" size={16} color={TITLE} />
                  <Text style={styles.mapsInputText} numberOfLines={1}>
                    {commuteFromLabel}
                  </Text>
                </View>
                <View style={styles.mapsInputDivider} />
                <View style={styles.mapsInputRow}>
                  <JamIcon ionicon="location" size={16} color="#d22b2b" />
                  <Text style={styles.mapsInputText} numberOfLines={1}>
                    {place.name}
                  </Text>
                </View>
              </View>
              {routeDriving ? (
                <View style={styles.routeTripSummaryBox}>
                  <Text style={styles.routeTripSummaryLabel}>Trip length (driving route)</Text>
                  <Text style={styles.routeTripSummaryValue}>
                    {formatDistanceM(routeDriving.distanceM)}
                    {routeDriving.durationS ? ` · ~${formatDurationS(routeDriving.durationS)}` : ''} from your location
                    to {place.name}
                  </Text>
                </View>
              ) : routeLoading && userPt && destCoords ? (
                <Text style={styles.routeTripSummaryLoading}>Calculating road distance…</Text>
              ) : userPt && destCoords ? (
                <View style={styles.routeTripSummaryBox}>
                  <Text style={styles.routeTripSummaryLabel}>Straight-line hint</Text>
                  <Text style={styles.routeTripSummaryValue}>
                    ~{formatDistanceM(haversineDistanceKm(userPt.lat, userPt.lng, destCoords.lat, destCoords.lng) * 1000)}{' '}
                    as the crow flies — open Commute steps when the road route loads
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.commuterBadge}>
              <Text style={styles.commuterBadgeLabel}>Commuter-first</Text>
            </View>
            <Text style={styles.routeOsrmDisclaimer}>{COMMUTER_DISCLAIMER}</Text>
            <Text style={styles.routeFootnote}>{COMMUTER_FOOTNOTE}</Text>
            {routeLoading ? <ActivityIndicator style={styles.routeSpinner} color={GREEN} /> : null}
            {routeError ? <Text style={styles.routeErrorText}>{routeError}</Text> : null}
            {!userPt && locStatus === 'denied' ? (
              <Text style={styles.routeHint}>
                Location is off — turn it on to load segments from where you are. You can still open the full map to
                plan transfers and walking.
              </Text>
            ) : null}
            {routeDriving && routeDriving.steps.length > 0 ? (
              <>
                <Text style={styles.routeSummaryLabel}>Whole corridor (road length)</Text>
                <Text style={styles.routeSummary}>
                  {formatDistanceM(routeDriving.distanceM)} · {formatDurationS(routeDriving.durationS)} if driven
                  end-to-end — commute time depends on waits and transfers
                </Text>
                {routeFoot ? (
                  <Text style={styles.routeFootHint}>
                    Walking-only reference (same endpoints): {formatDistanceM(routeFoot.distanceM)} ·{' '}
                    {formatDurationS(routeFoot.durationS)} — use for short links between rides, not as a full commute
                    time
                  </Text>
                ) : null}
                {routeDriving.steps.map((step, index) => {
                  const stepHint = commuterStepHint(index, routeDriving.steps.length, step.distanceM);
                  return (
                    <View key={`corridor-${index}-${Math.round(step.distanceM)}`} style={styles.routeStepRow}>
                      <Text style={styles.routeStepNum}>{index + 1}</Text>
                      <View style={styles.routeStepBody}>
                        <Text style={styles.routeStepInstruction}>
                          {commuterDirectStepInstruction(step, index, routeDriving.steps.length, place.name)}
                        </Text>
                        <Text style={styles.routeStepMeta}>
                          {formatDistanceM(step.distanceM)} · ~{formatDurationS(step.durationS)} driving reference
                        </Text>
                        {stepHint ? <Text style={styles.commuterStepHint}>{stepHint}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </>
            ) : !routeLoading && userPt ? (
              <Text style={styles.routeHint}>No segments returned for this corridor — try the map or another nearby road.</Text>
            ) : null}
          </View>
        ) : tab === 'stepGuide' ? (
          <View style={styles.routeCard}>
            <View style={styles.commuterBadge}>
              <Text style={styles.commuterBadgeLabel}>Commuter-first</Text>
            </View>
            <Text style={styles.routeOsrmDisclaimer}>{COMMUTER_DISCLAIMER}</Text>
            <Text style={styles.routeFootnote}>{COMMUTER_FOOTNOTE}</Text>
            <Text style={styles.guideBody}>{buildNarrativeGuide(routeDriving?.steps ?? [], place.name)}</Text>
          </View>
        ) : (
          <View style={styles.routeCard}>
            <Text style={styles.viaScreenTitle}>Via Terminals</Text>
            <Text style={styles.viaScreenLead}>
              Nearest public terminals and how to use them with this trip. Always confirm routes, signboards, and fares
              at the terminal or with the driver.
            </Text>

            {showPlaceOrItineraryTerminalHints && userPt && terminalPlan ? (
              <View style={styles.viaStepsBlock}>
                {terminalPlan.originTerminal.id === terminalPlan.destinationTerminal.id ? (
                  <>
                    <View style={styles.viaStepRow}>
                      <Text style={styles.viaStepNum}>1</Text>
                      <Text style={styles.viaStepText}>
                        <Text style={styles.viaStepBold}>{terminalPlan.originTerminal.name}</Text> is the closest major
                        terminal to both your area and {place.name}. Open it below for routes, gates, and reminders.
                      </Text>
                    </View>
                    <View style={styles.viaStepRow}>
                      <Text style={styles.viaStepNum}>2</Text>
                      <Text style={styles.viaStepText}>
                        Ride toward {place.name} (or its municipality), then use <Text style={styles.viaStepBold}>Commute steps</Text>{' '}
                        or a tricycle for the last leg.
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.viaStepRow}>
                      <Text style={styles.viaStepNum}>1</Text>
                      <Text style={styles.viaStepText}>
                        Go to <Text style={styles.viaStepBold}>{terminalPlan.originTerminal.name}</Text>
                        {userPt
                          ? ` (~${haversineDistanceKm(userPt.lat, userPt.lng, terminalPlan.originTerminal.latitude, terminalPlan.originTerminal.longitude).toFixed(1)} km from your start)`
                          : ''}{' '}
                        to board jeepneys, buses, or vans toward the general direction of {place.name}.
                      </Text>
                    </View>
                    <View style={styles.viaStepRow}>
                      <Text style={styles.viaStepNum}>2</Text>
                      <Text style={styles.viaStepText}>
                        Stay on lines that serve <Text style={styles.viaStepBold}>{terminalPlan.destinationTerminal.municipality}</Text> or
                        corridors leading to {place.name}. Ask the driver or konduktor before boarding.
                      </Text>
                    </View>
                    <View style={styles.viaStepRow}>
                      <Text style={styles.viaStepNum}>3</Text>
                      <Text style={styles.viaStepText}>
                        Alight near <Text style={styles.viaStepBold}>{terminalPlan.destinationTerminal.name}</Text>
                        {destCoords
                          ? ` (~${haversineDistanceKm(destCoords.lat, destCoords.lng, terminalPlan.destinationTerminal.latitude, terminalPlan.destinationTerminal.longitude).toFixed(1)} km from ${place.name})`
                          : ''}
                        , then follow <Text style={styles.viaStepBold}>Commute steps</Text> or local rides to the exact
                        spot.
                      </Text>
                    </View>
                  </>
                )}
              </View>
            ) : isTerminal && userPt && nearestTerminalFromUser ? (
              <View style={styles.viaStepsBlock}>
                <View style={styles.viaStepRow}>
                  <Text style={styles.viaStepNum}>1</Text>
                  <Text style={styles.viaStepText}>
                    From your GPS, the nearest hub is <Text style={styles.viaStepBold}>{nearestTerminalFromUser.name}</Text>
                    {userPt
                      ? ` (~${haversineDistanceKm(userPt.lat, userPt.lng, nearestTerminalFromUser.latitude, nearestTerminalFromUser.longitude).toFixed(1)} km)`
                      : ''}. Use it for connections toward {place.name}.
                  </Text>
                </View>
                <View style={styles.viaStepRow}>
                  <Text style={styles.viaStepNum}>2</Text>
                  <Text style={styles.viaStepText}>
                    Open the terminal below for route boards, typical vehicles, and safety reminders before you travel.
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.tripTerminalsHint}>
                {!userPt
                  ? 'Turn on location to load terminal suggestions for this trip.'
                  : terminalPlanLoading
                    ? 'Loading terminals…'
                    : 'No terminal match is available yet for this area. Try the Terminals tab in the app or ask locally for the nearest jeepney or bus stop.'}
              </Text>
            )}

            {isTerminal ? (
              <View style={styles.tripTerminalsSection}>
                <Text style={styles.tripTerminalsTitle}>Suggested terminal</Text>
                {!userPt ? (
                  <Text style={styles.tripTerminalsHint}>Turn on location to see the terminal closest to you.</Text>
                ) : terminalPlanLoading ? (
                  <View style={styles.tripTerminalsLoadingRow}>
                    <ActivityIndicator size="small" color={TEAL} />
                    <Text style={styles.tripTerminalsHint}>Finding nearest terminal…</Text>
                  </View>
                ) : nearestTerminalFromUser ? (
                  <View style={styles.tripTerminalCards}>
                    <TouchableOpacity
                      style={styles.tripTerminalCard}
                      activeOpacity={0.88}
                      onPress={() =>
                        (navigation as { navigate: (name: string, params: object) => void }).navigate('TerminalDetail', {
                          terminal: terminalPlanNodeToStub(nearestTerminalFromUser),
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${nearestTerminalFromUser.name}`}
                    >
                      <Text style={styles.tripTerminalCardKicker}>Nearest terminal to you</Text>
                      <Text style={styles.tripTerminalCardName} numberOfLines={2}>
                        {nearestTerminalFromUser.name}
                      </Text>
                      <Text style={styles.tripTerminalCardMeta}>
                        {nearestTerminalFromUser.municipality}
                        {userPt
                          ? ` · ~${haversineDistanceKm(userPt.lat, userPt.lng, nearestTerminalFromUser.latitude, nearestTerminalFromUser.longitude).toFixed(1)} km away`
                          : ''}
                      </Text>
                      <Text style={styles.tripTerminalCardCta}>Terminal details</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.tripTerminalsHint}>No terminal data for this area right now.</Text>
                )}
              </View>
            ) : showPlaceOrItineraryTerminalHints ? (
              <View style={styles.tripTerminalsSection}>
                <Text style={styles.tripTerminalsTitle}>Terminals on this trip</Text>
                {!userPt ? (
                  <Text style={styles.tripTerminalsHint}>Turn on location to load terminals.</Text>
                ) : terminalPlanLoading ? (
                  <View style={styles.tripTerminalsLoadingRow}>
                    <ActivityIndicator size="small" color={TEAL} />
                    <Text style={styles.tripTerminalsHint}>Finding nearest terminals…</Text>
                  </View>
                ) : terminalPlan ? (
                  <View style={styles.tripTerminalCards}>
                    {terminalPlan.originTerminal.id === terminalPlan.destinationTerminal.id ? (
                      <TouchableOpacity
                        style={[styles.tripTerminalCard, { flex: 1 }]}
                        activeOpacity={0.88}
                        onPress={() =>
                          (navigation as { navigate: (name: string, params: object) => void }).navigate('TerminalDetail', {
                            terminal: terminalPlanNodeToStub(terminalPlan.originTerminal),
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${terminalPlan.originTerminal.name}`}
                      >
                        <Text style={styles.tripTerminalCardKicker}>Nearest terminal (you & destination)</Text>
                        <Text style={styles.tripTerminalCardName} numberOfLines={2}>
                          {terminalPlan.originTerminal.name}
                        </Text>
                        <Text style={styles.tripTerminalCardMeta}>
                          {terminalPlan.originTerminal.municipality}
                          {userPt && destCoords
                            ? ` · ~${haversineDistanceKm(userPt.lat, userPt.lng, terminalPlan.originTerminal.latitude, terminalPlan.originTerminal.longitude).toFixed(1)} km from you · ~${haversineDistanceKm(destCoords.lat, destCoords.lng, terminalPlan.originTerminal.latitude, terminalPlan.originTerminal.longitude).toFixed(1)} km from ${place.name}`
                            : ''}
                        </Text>
                        <Text style={styles.tripTerminalCardCta}>Terminal details</Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.tripTerminalCard}
                          activeOpacity={0.88}
                          onPress={() =>
                            (navigation as { navigate: (name: string, params: object) => void }).navigate('TerminalDetail', {
                              terminal: terminalPlanNodeToStub(terminalPlan.originTerminal),
                            })
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${terminalPlan.originTerminal.name}`}
                        >
                          <Text style={styles.tripTerminalCardKicker}>Board near you</Text>
                          <Text style={styles.tripTerminalCardName} numberOfLines={2}>
                            {terminalPlan.originTerminal.name}
                          </Text>
                          <Text style={styles.tripTerminalCardMeta}>
                            {terminalPlan.originTerminal.municipality}
                            {userPt
                              ? ` · ~${haversineDistanceKm(userPt.lat, userPt.lng, terminalPlan.originTerminal.latitude, terminalPlan.originTerminal.longitude).toFixed(1)} km away`
                              : ''}
                          </Text>
                          <Text style={styles.tripTerminalCardCta}>Terminal details</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.tripTerminalCard}
                          activeOpacity={0.88}
                          onPress={() =>
                            (navigation as { navigate: (name: string, params: object) => void }).navigate('TerminalDetail', {
                              terminal: terminalPlanNodeToStub(terminalPlan.destinationTerminal),
                            })
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${terminalPlan.destinationTerminal.name}`}
                        >
                          <Text style={styles.tripTerminalCardKicker}>Near {place.name}</Text>
                          <Text style={styles.tripTerminalCardName} numberOfLines={2}>
                            {terminalPlan.destinationTerminal.name}
                          </Text>
                          <Text style={styles.tripTerminalCardMeta}>
                            {terminalPlan.destinationTerminal.municipality}
                            {destCoords
                              ? ` · ~${haversineDistanceKm(destCoords.lat, destCoords.lng, terminalPlan.destinationTerminal.latitude, terminalPlan.destinationTerminal.longitude).toFixed(1)} km from destination`
                              : ''}
                          </Text>
                          <Text style={styles.tripTerminalCardCta}>Terminal details</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ) : (
                  <Text style={styles.tripTerminalsHint}>No terminal data for this area right now.</Text>
                )}
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.destinationReachedWrap}>
          <Text style={styles.destinationReachedHint}>
            After you arrive, tap Destination Reached below to record this visit. Opening See full map does not count
            toward Activity this month.
          </Text>
          <TouchableOpacity
            onPress={onDestinationReached}
            style={[styles.destinationReachedButton, destinationReachedBusy && styles.destinationReachedButtonDisabled]}
            activeOpacity={0.92}
            accessibilityRole="button"
            accessibilityLabel="Destination Reached"
            disabled={destinationReachedBusy}
          >
            {destinationReachedBusy ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <Text style={styles.destinationReachedButtonLabel}>Destination Reached</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={openFullMap}
          style={styles.directionsButton}
          activeOpacity={0.92}
          accessibilityRole="button"
          accessibilityLabel="See full map"
        >
          <Text style={styles.directionsButtonLabel}>See full map</Text>
        </TouchableOpacity>
      </ScrollView>

      <SaveToListSheet
        visible={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
        hint={`Choose a list to add “${place.name}”.`}
        lists={pickLists}
        onSelectList={onPickList}
        busyListId={saveListBusyId}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  missingText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: TITLE,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  missingBack: {
    marginTop: 20,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  missingBackLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: GREEN,
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
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  heroWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: '#E8E8E8',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeName: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 20,
    lineHeight: 24,
    color: TITLE,
    marginBottom: 12,
  },
  caviTripBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(31, 79, 89, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(31, 79, 89, 0.12)',
    marginBottom: 14,
  },
  caviTripBannerText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: TITLE,
  },
  tagsAndActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  pillRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    minWidth: 0,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    maxWidth: '100%',
    alignSelf: 'flex-start',
  },
  pillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    lineHeight: 15,
  },
  actionPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabSave: {
    backgroundColor: 'rgba(126, 160, 14, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(126, 160, 14, 0.45)',
  },
  fabSaveActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  fabShare: {
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: 'rgba(31, 79, 89, 0.28)',
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(126, 160, 14, 0.12)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(126, 160, 14, 0.22)',
  },
  segmentSlot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 11,
    minWidth: 0,
  },
  segmentSlotActive: {
    backgroundColor: WHITE,
    shadowColor: OLIVE,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 18,
  },
  segmentLabelCompact: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  segmentLabelOn: {
    color: GREEN,
    fontFamily: 'Inter_700Bold',
  },
  segmentLabelOff: {
    color: MUTED,
  },
  routeCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: OLIVE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 4,
  },
  mapsPlannerCard: {
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(31, 79, 89, 0.15)',
    backgroundColor: '#fff',
    padding: 10,
  },
  routeTripSummaryBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(31, 79, 89, 0.12)',
  },
  routeTripSummaryLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  routeTripSummaryValue: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: TITLE,
  },
  routeTripSummaryLoading: {
    marginTop: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: MUTED,
  },
  viaScreenTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: TEAL,
    marginBottom: 8,
  },
  viaScreenLead: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: MUTED,
    marginBottom: 16,
  },
  viaStepsBlock: {
    marginBottom: 16,
    gap: 14,
  },
  viaStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  viaStepNum: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: GREEN,
    width: 22,
    textAlign: 'center',
  },
  viaStepText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: TITLE,
  },
  viaStepBold: {
    fontFamily: 'Inter_700Bold',
    color: TITLE,
  },
  tripTerminalsSection: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(31, 79, 89, 0.15)',
    backgroundColor: '#f5faf8',
  },
  tripTerminalsTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: TEAL,
  },
  tripTerminalsSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
    marginTop: 4,
    marginBottom: 10,
  },
  tripTerminalsHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
  },
  tripTerminalsLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tripTerminalCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tripTerminalCard: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
    padding: 12,
    borderRadius: 12,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: 'rgba(31, 79, 89, 0.18)',
  },
  tripTerminalCardKicker: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    lineHeight: 14,
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  tripTerminalCardName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 19,
    color: TITLE,
  },
  tripTerminalCardMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
    color: MUTED,
    marginTop: 4,
  },
  tripTerminalCardCta: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: TEAL,
    marginTop: 10,
  },
  routeModeSection: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(126, 160, 14, 0.28)',
    backgroundColor: 'rgba(126, 160, 14, 0.06)',
  },
  routeModeSectionTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: TEAL,
  },
  routeModeSectionHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
    color: MUTED,
    marginTop: 4,
    marginBottom: 10,
  },
  routeModeToggle: {
    gap: 10,
  },
  routeModeOption: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(31, 79, 89, 0.2)',
    backgroundColor: WHITE,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  routeModeOptionOn: {
    borderColor: GREEN,
    backgroundColor: 'rgba(126, 160, 14, 0.12)',
  },
  routeModeOptionText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: TITLE,
  },
  routeModeOptionTextOn: {
    color: GREEN,
  },
  routeModeOptionSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 15,
    color: MUTED,
    marginTop: 4,
  },
  mapsModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  mapsModeChip: {
    minHeight: 28,
    minWidth: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(31, 79, 89, 0.2)',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  mapsModeChipActive: {
    backgroundColor: 'rgba(118, 214, 255, 0.35)',
    borderColor: 'rgba(31, 79, 89, 0.3)',
  },
  mapsModeChipText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    color: TITLE,
  },
  mapsInputCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(31, 79, 89, 0.18)',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  mapsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  mapsInputText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: TITLE,
  },
  mapsInputDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(122, 120, 120, 0.35)',
    marginHorizontal: 10,
  },
  transportChoiceTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    lineHeight: 18,
    color: TEAL,
    marginBottom: 8,
  },
  transportChoiceRow: {
    gap: 8,
    paddingBottom: 10,
  },
  transportChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(31, 79, 89, 0.22)',
    backgroundColor: WHITE,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  transportChipActive: {
    backgroundColor: 'rgba(126, 160, 14, 0.18)',
    borderColor: GREEN,
  },
  transportChipText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: TEAL,
  },
  transportChipTextActive: {
    color: GREEN,
    fontFamily: 'Poppins_700Bold',
  },
  commuterBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(126, 160, 14, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  commuterBadgeLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    lineHeight: 14,
    color: GREEN,
    letterSpacing: 0.3,
  },
  routeOsrmDisclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: TITLE,
    marginBottom: 10,
  },
  routeFootnote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
    marginBottom: 14,
  },
  routeSpinner: {
    marginVertical: 12,
  },
  routeErrorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#b45309',
    marginBottom: 10,
  },
  routeHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: MUTED,
    marginBottom: 8,
  },
  routeSummaryLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 16,
    color: TEAL,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  routeSummary: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    lineHeight: 22,
    color: TITLE,
    marginBottom: 8,
  },
  routeFootHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: TEAL,
    marginBottom: 14,
  },
  routeStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(122, 120, 120, 0.2)',
    gap: 12,
  },
  routeStepNum: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    lineHeight: 22,
    color: GREEN,
    width: 22,
  },
  routeStepBody: {
    flex: 1,
    minWidth: 0,
  },
  routeStepInstruction: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: TITLE,
  },
  routeStepMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
    marginTop: 4,
  },
  commuterStepHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: TEAL,
    marginTop: 8,
    fontStyle: 'italic',
  },
  guideBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 24,
    color: TITLE,
  },
  destinationReachedWrap: {
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  destinationReachedHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
    marginBottom: 10,
  },
  destinationReachedButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: TEAL,
  },
  destinationReachedButtonDisabled: {
    opacity: 0.7,
  },
  destinationReachedButtonLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: WHITE,
  },
  directionsButton: {
    marginTop: 20,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    minHeight: 54,
    borderRadius: 9999,
    backgroundColor: GREEN,
  },
  directionsButtonLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 17,
    lineHeight: 22,
    color: WHITE,
    textAlign: 'center',
  },
});

export default DirectionsScreen;
