import React, { useMemo, useState, useCallback, useEffect } from 'react';
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
import { Place } from '../data/mockData';
import { parsePlaceCoords } from '../lib/placeCoords';
import { formatNtdpCategoryTagLabel } from '../lib/ntdpDisplayLabels';
import {
  fetchDrivingRoute,
  fetchFootRoute,
  formatDistanceM,
  formatDurationS,
  type OsrmRouteResult,
  type RouteStepUi,
} from '../lib/fetchOsrmRoute';
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
  'Built for commuters: use each step as a corridor along public roads where jeepneys, buses, UV Express vans, and modern jeepney routes commonly run. The path uses OpenStreetMap via OSRM (car-style geometry) to trace those roads—it is not a live transit schedule, fare, or official route name. Confirm signboards and “para po” stops with the driver.';

const COMMUTER_FOOTNOTE =
  'One-way streets, traffic, and terminal locations change often. If you drive, the same corridor still helps—adjust for parking and access.';

const PILL_STYLES = {
  green: { bg: 'rgba(126, 160, 14, 0.5)', text: GREEN },
  teal: { bg: 'rgba(31, 79, 89, 0.5)', text: TEAL },
} as const;

type PillVariant = keyof typeof PILL_STYLES;

export type DirectionsScreenParams = {
  place: Place;
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
  if (!steps.length) {
    return `Turn on location to build segments from where you are standing.\n\nYou can still open the full map to find ${destinationLabel} and eyeball nearby terminals or jeepney lines—even without steps here.`;
  }
  const head =
    `You’re planning a commute toward ${destinationLabel}.\n\n` +
    'Read the steps in order: each one is a stretch of road. Prefer rides that stay on that stretch; if your jeepney or bus turns off earlier, get off at a safe corner and catch another line along the next stretch, or walk short links. Tricycles can help for the last few hundred meters when allowed.\n\n' +
    'Driving? Use the same roads; watch for passenger stops and one-way signs.';
  const body = steps
    .map((s, i) => {
      const dist = formatDistanceM(s.distanceM);
      const dur = formatDurationS(s.durationS);
      const n = i + 1;
      const last = i === steps.length - 1;
      const segHint = last
        ? `Final approach (~${dist}, ~${dur}): ask to alight where it’s safe and walk in if the spot is inside a complex or side street.`
        : `This segment (~${dist}, ~${dur}): stay on this corridor in your ride when the signboard matches; if not, transfer at a crossing or terminal before the road changes.`;
      return `${n}. ${s.instruction}\n   ${segHint}`;
    })
    .join('\n\n');
  return `${head}\n\n${body}`;
}

function commuterStepHint(index: number, total: number): string {
  if (total <= 0) return '';
  if (index === total - 1) {
    return 'Last leg — alight before this corner if your ride won’t enter the side street; walk the rest if needed.';
  }
  return 'Stay on this road with a matching ride when you can; transfer before the turn if your line branches off.';
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

  const isTerminal = place?.type === 'Terminal';
  const isItinerary = place?.type === 'Itinerary';
  const destCoords = useMemo(() => (place ? parsePlaceCoords(place) : null), [place]);

  const [tab, setTab] = useState<'routeSteps' | 'stepGuide'>('routeSteps');
  const [userPt, setUserPt] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [routeDriving, setRouteDriving] = useState<OsrmRouteResult | null>(null);
  const [routeFoot, setRouteFoot] = useState<OsrmRouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [saved, setSaved] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [pickLists, setPickLists] = useState<SaveToListRow[]>([]);
  const [saveListBusyId, setSaveListBusyId] = useState<string | null>(null);
  const [checkingSaved, setCheckingSaved] = useState(false);

  const tags = useMemo(() => (place ? buildTags(place) : []), [place]);

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
          setUserPt({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch {
        if (!cancelled) setLocStatus('denied');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [place]);

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

  const mapPayload: DirectionsMapPayload = useMemo(
    () => ({
      userLat: userPt?.lat ?? null,
      userLng: userPt?.lng ?? null,
      destLat: destCoords?.lat ?? 0,
      destLng: destCoords?.lng ?? 0,
      routeGeoJson: routeDriving?.geometry ?? null,
    }),
    [userPt, destCoords, routeDriving]
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
          {place.image ? (
            <Image
              source={place.image}
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
        </View>

        {tab === 'routeSteps' ? (
          <View style={styles.routeCard}>
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
                {routeDriving.steps.map((step, index) => (
                  <View key={`${index}-${step.instruction.slice(0, 24)}`} style={styles.routeStepRow}>
                    <Text style={styles.routeStepNum}>{index + 1}</Text>
                    <View style={styles.routeStepBody}>
                      <Text style={styles.routeStepInstruction}>{step.instruction}</Text>
                      <Text style={styles.routeStepMeta}>
                        {formatDistanceM(step.distanceM)} · {formatDurationS(step.durationS)} along this road
                      </Text>
                      <Text style={styles.commuterStepHint}>
                        {commuterStepHint(index, routeDriving.steps.length)}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            ) : !routeLoading && userPt ? (
              <Text style={styles.routeHint}>No segments returned for this corridor — try the map or another nearby road.</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.routeCard}>
            <View style={styles.commuterBadge}>
              <Text style={styles.commuterBadgeLabel}>Commuter-first</Text>
            </View>
            <Text style={styles.routeOsrmDisclaimer}>{COMMUTER_DISCLAIMER}</Text>
            <Text style={styles.routeFootnote}>{COMMUTER_FOOTNOTE}</Text>
            <Text style={styles.guideBody}>{buildNarrativeGuide(routeDriving?.steps ?? [], place.name)}</Text>
          </View>
        )}

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
    paddingVertical: 12,
    borderRadius: 11,
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
    fontSize: 12,
    lineHeight: 16,
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
