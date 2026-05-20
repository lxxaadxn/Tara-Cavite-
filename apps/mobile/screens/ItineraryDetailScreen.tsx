import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { JamIcon } from '../components/JamIcon';
import { SaveToListSheet, type SaveToListRow } from '../components/SaveToListSheet';
import { publishedItineraries } from '../data/publishedItineraries';
import type { Place } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { fetchDashboardPlacesPool, logPlacesFetchError } from '../lib/placesFromSupabase';
import { formatRouteLine } from '../lib/itineraryFormat';
import {
  buildEnrichedItinerary,
  resolveEstablishment,
  type EnrichedItinerary,
} from '../lib/itineraryPlaces';
import { placeImageSource } from '../lib/placeImageSource';
import {
  addItineraryToSavedList,
  fetchUserListsForPickerWithCounts,
  findOrCreateListByName,
  isItinerarySavedByUser,
  removeItineraryFromAllUserLists,
} from '../lib/savedListItems';
import {
  alertAfterSaveToList,
  SAVE_TO_LIST_CREATE_BUSY_ID,
} from '../lib/saveToListModalHelpers';

const HEADER_GREEN = '#7EA00E';
const TEAL = '#1F4F59';
const TITLE = '#241D13';
const MUTED = '#7A7878';
const PAGE_BG = '#F0F2EC';
const WHITE = '#FFFFFF';
const H_PAD = 16;
const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = Math.round(SCREEN_W * 0.52);

export type ItineraryDetailParams = {
  itineraryId: string;
};

export default function ItineraryDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { itineraryId } = route.params as ItineraryDetailParams;

  const template = useMemo(
    () => publishedItineraries.find((x) => x.id === itineraryId),
    [itineraryId]
  );

  const [catalogPlaces, setCatalogPlaces] = useState<Place[]>([]);
  const [saved, setSaved] = useState(false);
  const [checkingSaved, setCheckingSaved] = useState(true);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [pickLists, setPickLists] = useState<SaveToListRow[]>([]);
  const [listNameDraft, setListNameDraft] = useState('My list');
  const [saveListBusyId, setSaveListBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchDashboardPlacesPool(supabase, 2000);
        if (!cancelled) setCatalogPlaces(list);
      } catch (err) {
        logPlacesFetchError('ItineraryDetailScreen.fetchDashboardPlacesPool', err);
        if (!cancelled) setCatalogPlaces([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enriched = useMemo(
    () => (template ? buildEnrichedItinerary(template, catalogPlaces) : null),
    [template, catalogPlaces]
  );

  const detail = enriched ?? template;

  const stops = enriched?.stopList ?? [];

  const linkedPlaces = useMemo(() => {
    return stops
      .map((stop) => stop.place)
      .filter((place): place is NonNullable<typeof place> => Boolean(place?.id))
      .filter((place, index, list) => list.findIndex((x) => x.id === place.id) === index);
  }, [stops]);

  const refreshSavedState = useCallback(async () => {
    if (!template) return;
    setCheckingSaved(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaved(false);
        return;
      }
      setSaved(await isItinerarySavedByUser(supabase, user.id, template.id));
    } catch {
      setSaved(false);
    } finally {
      setCheckingSaved(false);
    }
  }, [template]);

  useEffect(() => {
    refreshSavedState();
  }, [refreshSavedState]);

  useFocusEffect(
    useCallback(() => {
      refreshSavedState();
    }, [refreshSavedState])
  );

  const onBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as { navigate: (n: string) => void }).navigate('ItinerariesMain');
    }
  };

  const openPlace = (placeId: string) => {
    const place = resolveEstablishment({ placeId }, catalogPlaces);
    if (!place) {
      Alert.alert('Not in catalog', 'This stop is not available in the catalog yet.');
      return;
    }
    (navigation as { navigate: (n: string, o: object) => void }).navigate('AboutEstablishment', {
      place,
    });
  };

  const openSaveToListPicker = async () => {
    if (!template) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Sign in', 'Sign in to save itineraries to your lists.');
      return;
    }
    try {
      const lists = await fetchUserListsForPickerWithCounts(supabase, user.id);
      setListNameDraft(detail?.tags?.[0] || 'My list');
      setPickLists(lists);
      setSaveModalVisible(true);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not load lists.');
    }
  };

  const onConfirmRemoveSave = () => {
    if (!template) return;
    Alert.alert('Remove from saved lists?', 'This removes this itinerary from every list it’s in.', [
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
            await removeItineraryFromAllUserLists(supabase, user.id, template.id);
            setSaved(false);
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not update saved lists.');
          }
        },
      },
    ]);
  };

  const onPickList = async (list: SaveToListRow) => {
    if (!template) return;
    setSaveListBusyId(list.id);
    try {
      const res = await addItineraryToSavedList(supabase, list.id, template.id);
      alertAfterSaveToList(res, detail?.title ?? 'Itinerary', list.name, () => {
        setSaveModalVisible(false);
        setSaved(true);
      });
    } finally {
      setSaveListBusyId(null);
    }
  };

  const onCreateList = async () => {
    if (!template) return;
    const trimmed = listNameDraft.trim();
    if (!trimmed) return;
    setSaveListBusyId(SAVE_TO_LIST_CREATE_BUSY_ID);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const list = await findOrCreateListByName(supabase, user.id, trimmed);
      if (!list) return;
      const res = await addItineraryToSavedList(supabase, list.id, template.id);
      alertAfterSaveToList(res, detail?.title ?? 'Itinerary', list.name, () => {
        setSaveModalVisible(false);
        setSaved(true);
      });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not create list.');
    } finally {
      setSaveListBusyId(null);
    }
  };

  if (!template) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <StatusBar barStyle="light-content" backgroundColor={HEADER_GREEN} />
        <View style={[styles.greenHeader, { paddingTop: insets.top + 8, paddingBottom: 14 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={onBack}
              style={styles.headerSide}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <JamIcon name="chevron-left" size={26} color={WHITE} />
            </TouchableOpacity>
            <Text style={styles.headerTitleCenter}>Itinerary</Text>
            <View style={styles.headerSide} />
          </View>
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Not found</Text>
          <Text style={styles.emptyBody}>This itinerary is no longer available.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onBack} accessibilityRole="button">
            <Text style={styles.primaryBtnText}>Back to itineraries</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stopTotal = stops.length > 0 ? stops.length : detail?.stops;
  const heroImg = placeImageSource(detail?.image);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_GREEN} />
      <View style={[styles.greenHeader, { paddingTop: insets.top + 8, paddingBottom: 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.headerSide}
            accessibilityLabel="Back to itineraries"
            accessibilityRole="button"
          >
            <JamIcon name="chevron-left" size={26} color={WHITE} />
          </TouchableOpacity>
          <Text style={styles.headerTitleCenter} numberOfLines={1}>
            Itineraries
          </Text>
          <TouchableOpacity
            onPress={saved ? onConfirmRemoveSave : openSaveToListPicker}
            style={styles.headerSide}
            disabled={checkingSaved}
            accessibilityLabel={saved ? 'Remove from saved lists' : 'Save to list'}
            accessibilityRole="button"
          >
            <JamIcon
              ionicon={saved ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={WHITE}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          {heroImg ? (
            <Image source={heroImg} style={styles.heroImg} resizeMode="cover" accessibilityLabel="" />
          ) : (
            <View style={[styles.heroImg, styles.heroImgPlaceholder]} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.35)']}
            style={styles.heroGradient}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['#fbfcf7', '#f7faef', '#e8efd8']}
            style={styles.heroCopy}
          >
            {detail?.tags?.length ? (
              <View style={styles.tagRow}>
                {detail.tags.map((tag) => (
                  <View key={tag} style={styles.heroTag}>
                    <Text style={styles.heroTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Text style={styles.heroTitle}>{detail?.title}</Text>
            <Text style={styles.heroRoute}>{formatRouteLine(detail!)}</Text>
            <View style={styles.pillRow}>
              {!!stopTotal && (
                <View style={[styles.heroPill, styles.heroPillDark]}>
                  <Text style={styles.heroPillTextDark}>
                    {stopTotal} {stopTotal === 1 ? 'stop' : 'stops'}
                  </Text>
                </View>
              )}
              {detail?.durationLabel ? (
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>{detail.durationLabel}</Text>
                </View>
              ) : null}
              {detail?.bestTime ? (
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText} numberOfLines={1}>
                    {detail.bestTime}
                  </Text>
                </View>
              ) : null}
            </View>
          </LinearGradient>
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={saved ? onConfirmRemoveSave : openSaveToListPicker}
          disabled={checkingSaved}
          accessibilityRole="button"
          accessibilityLabel="Save itinerary to list"
        >
          <JamIcon ionicon="bookmark-outline" size={18} color={WHITE} />
          <Text style={styles.saveBtnText}>Save to list</Text>
        </TouchableOpacity>

        {detail?.summary ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.body}>{detail.summary}</Text>
            {detail.highlights?.length ? (
              <View style={styles.highlightList}>
                {detail.highlights.map((h) => (
                  <View key={h} style={styles.highlightRow}>
                    <JamIcon ionicon="checkmark" size={16} color={HEADER_GREEN} />
                    <Text style={styles.highlightText}>{h}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {stops.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Route & stops</Text>
              <Text style={styles.sectionSub}>Follow in order — each stop builds on the last.</Text>
            </View>
            <View style={styles.timeline}>
              <View style={styles.timelineLine} accessibilityElementsHidden />
              {stops.map((stop, index) => (
                <View key={`${stop.name}-${index}`} style={styles.stopRow}>
                  <View style={styles.stopNum}>
                    <Text style={styles.stopNumText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stopContent}>
                    <Text style={styles.stopName}>{stop.name}</Text>
                    <Text style={styles.stopDesc}>{stop.description}</Text>
                    {stop.place?.id ? (
                      <TouchableOpacity
                        style={styles.featuredRow}
                        activeOpacity={0.88}
                        onPress={() => openPlace(stop.place!.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${stop.place.name}`}
                      >
                        {stop.place.image ? (
                          <Image
                            source={placeImageSource(stop.place.image)!}
                            style={styles.featuredThumb}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.featuredThumb, styles.featuredThumbPlaceholder]}>
                            <JamIcon ionicon="location" size={22} color={TEAL} />
                          </View>
                        )}
                        <View style={styles.featuredTextCol}>
                          <Text style={styles.featuredLabel}>Featured spot</Text>
                          <Text style={styles.featuredName} numberOfLines={2}>
                            {stop.place.name}
                          </Text>
                          {stop.place.address ? (
                            <Text style={styles.featuredAddr} numberOfLines={2}>
                              {stop.place.address}
                            </Text>
                          ) : null}
                        </View>
                        <JamIcon ionicon="chevron-forward" size={18} color={MUTED} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {detail?.tips?.length ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tips</Text>
            {detail.tips.map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {linkedPlaces.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Places on this route</Text>
            <Text style={styles.sectionSub}>Quick list of named stops with addresses.</Text>
            {linkedPlaces.map((place) => (
              <TouchableOpacity
                key={place.id}
                style={styles.placeRow}
                activeOpacity={0.85}
                onPress={() => openPlace(place.id)}
                accessibilityRole="button"
                accessibilityLabel={place.name}
              >
                <View style={styles.placeDot} />
                <View style={styles.placeTextCol}>
                  <Text style={styles.placeName} numberOfLines={2}>
                    {place.name}
                  </Text>
                  {place.address ? (
                    <Text style={styles.placeAddr} numberOfLines={2}>
                      {place.address}
                    </Text>
                  ) : null}
                </View>
                <JamIcon ionicon="chevron-forward" size={18} color={MUTED} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <SaveToListSheet
        visible={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
        title="Save itinerary"
        itemLabel={detail?.title}
        lists={pickLists}
        listNameDraft={listNameDraft}
        onListNameChange={setListNameDraft}
        onSelectList={onPickList}
        onCreateList={onCreateList}
        busyListId={saveListBusyId}
        countLabel="items"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAGE_BG },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: H_PAD, paddingTop: 12 },
  greenHeader: {
    backgroundColor: HEADER_GREEN,
    paddingHorizontal: H_PAD,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSide: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitleCenter: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: WHITE,
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: H_PAD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: TITLE,
    marginBottom: 8,
  },
  emptyBody: { fontSize: 15, color: MUTED, textAlign: 'center', marginBottom: 20 },
  primaryBtn: {
    backgroundColor: TEAL,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
  primaryBtnText: { color: WHITE, fontFamily: 'Poppins_500Medium', fontSize: 15 },
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: WHITE,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dfe8d3',
    shadowColor: '#1F4F59',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  heroImg: { width: '100%', height: HERO_H },
  heroImgPlaceholder: { backgroundColor: '#e8ebe6' },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: HERO_H,
  },
  heroCopy: {
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  heroTag: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#cfe0b0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroTagText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: '#3d5210',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    lineHeight: 30,
    color: TITLE,
  },
  heroRoute: {
    fontSize: 15,
    lineHeight: 22,
    color: '#525252',
    marginTop: 8,
    fontFamily: 'Inter_400Regular',
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  heroPill: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: 'rgba(31,79,89,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroPillDark: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  heroPillText: {
    fontSize: 12,
    color: TITLE,
    fontFamily: 'Poppins_600SemiBold',
  },
  heroPillTextDark: {
    fontSize: 12,
    color: WHITE,
    fontFamily: 'Poppins_600SemiBold',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEAL,
    paddingVertical: 14,
    borderRadius: 999,
    marginBottom: 16,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  saveBtnText: {
    color: WHITE,
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(31,79,89,0.1)',
  },
  sectionHead: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(31,79,89,0.08)',
    paddingBottom: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: TITLE,
  },
  sectionSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: MUTED,
    marginTop: 4,
  },
  body: { fontSize: 14, lineHeight: 22, color: MUTED, fontFamily: 'Inter_400Regular' },
  highlightList: { marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(31,79,89,0.08)' },
  highlightRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  highlightText: { flex: 1, fontSize: 14, color: TITLE, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  timeline: { position: 'relative' },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: 'rgba(126, 160, 14, 0.35)',
  },
  stopRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  stopNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: HEADER_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  stopNumText: { color: WHITE, fontFamily: 'Poppins_700Bold', fontSize: 14 },
  stopContent: { flex: 1, minWidth: 0, paddingTop: 2 },
  stopName: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: TITLE },
  stopDesc: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 21,
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
  },
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: PAGE_BG,
    borderWidth: 1,
    borderColor: 'rgba(31,79,89,0.1)',
  },
  featuredThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(31,79,89,0.08)',
  },
  featuredThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  featuredTextCol: { flex: 1, minWidth: 0 },
  featuredLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: HEADER_GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  featuredName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: TITLE },
  featuredAddr: { fontSize: 12, color: MUTED, marginTop: 2, fontFamily: 'Inter_400Regular' },
  tipRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: HEADER_GREEN,
    marginTop: 7,
  },
  tipText: { flex: 1, fontSize: 14, color: TITLE, lineHeight: 21, fontFamily: 'Inter_400Regular' },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(31,79,89,0.1)',
  },
  placeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(126, 160, 14, 0.7)',
    marginTop: 4,
  },
  placeTextCol: { flex: 1 },
  placeName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: TITLE },
  placeAddr: { fontSize: 12, color: MUTED, marginTop: 2, fontFamily: 'Inter_400Regular' },
});
