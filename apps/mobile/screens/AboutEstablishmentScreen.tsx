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
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import { SaveToListSheet, type SaveToListRow } from '../components/SaveToListSheet';
import { ReviewCardsList } from '../components/ReviewCardsList';
import { Place, getItineraryEstablishments } from '../data/mockData';
import { parsePlaceCoords } from '../lib/placeCoords';
import { formatNtdpCategoryTagLabel } from '../lib/ntdpDisplayLabels';
import { supabase } from '../lib/supabase';
import {
  isSupabasePlaceId,
  isPlaceSavedByUser,
  removePlaceFromAllUserLists,
  removeItineraryFromAllUserLists,
  addPlaceToSavedList,
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
const LIST_PAGE_BG = '#F5F5F6';
const CARD_BORDER = 'rgba(122, 120, 120, 0.18)';

const PILL_STYLES = {
  green: { bg: 'rgba(126, 160, 14, 0.5)', text: GREEN },
  teal: { bg: 'rgba(31, 79, 89, 0.5)', text: TEAL },
} as const;

type PillVariant = keyof typeof PILL_STYLES;

export type AboutEstablishmentParams = {
  place: Place;
};

const PLACEHOLDER_DESCRIPTION =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper.';

function buildTags(place: Place): { label: string; variant: PillVariant }[] {
  const out: { label: string; variant: PillVariant }[] = [];
  if (place.type) out.push({ label: place.type, variant: 'green' });
  if (place.ntdp_category) {
    out.push({ label: formatNtdpCategoryTagLabel(place.ntdp_category), variant: 'teal' });
  } else {
    out.push({ label: 'Alfresco', variant: 'teal' });
  }
  return out;
}

export default function AboutEstablishmentScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { place } = route.params as AboutEstablishmentParams;
  const isItinerary = place.type === 'Itinerary';
  const itineraryStops = useMemo(() => getItineraryEstablishments(place.id), [place.id]);

  const [tab, setTab] = useState<'description' | 'reviews'>('description');
  const [saved, setSaved] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [pickLists, setPickLists] = useState<SaveToListRow[]>([]);
  const [saveListBusyId, setSaveListBusyId] = useState<string | null>(null);
  const [checkingSaved, setCheckingSaved] = useState(false);

  const tags = useMemo(() => buildTags(place), [place]);
  const bodyText = (place.description?.trim() ? place.description : PLACEHOLDER_DESCRIPTION).trim();

  const onShare = async () => {
    try {
      await Share.share({
        message: `${place.name}\n${place.address}`,
        title: place.name,
      });
    } catch {
      /* ignore */
    }
  };

  const openDirections = () => {
    const c = parsePlaceCoords(place);
    const placeForNav: Place = c ? { ...place, latitude: c.lat, longitude: c.lng } : place;
    (navigation as { navigate: (name: string, params: object) => void }).navigate('Directions', {
      place: placeForNav,
    });
  };

  const refreshSavedState = useCallback(async () => {
    if (isItinerary) {
      setSaved(false);
      setCheckingSaved(false);
      return;
    }
    setCheckingSaved(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSaved(false);
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
  }, [place.id, isItinerary]);

  useEffect(() => {
    refreshSavedState();
  }, [refreshSavedState]);

  useFocusEffect(
    useCallback(() => {
      refreshSavedState();
    }, [refreshSavedState])
  );

  const openSaveToListPicker = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Sign in', 'Sign in to save places to your lists.');
      return;
    }

    if (isItinerary) {
      try {
        const lists = await fetchUserListsForPicker(supabase, user.id);
        if (!lists.length) {
          Alert.alert(
            'No saved lists yet',
            'Create a list first from your profile under Saved list, then come back here to add this itinerary.'
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
        'Only places from the CaviTour catalog (with a database id) can be added to a saved list. Try opening this spot from search or the map.'
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
          'Create a list first from your profile under Saved list, then come back here to add this place.'
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
    Alert.alert(
      'Remove from saved lists?',
      isItinerary
        ? 'This removes this itinerary from every list it’s in.'
        : 'This removes the place from every list it’s in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                setSaved(false);
                return;
              }
              if (isItinerary) {
                await removeItineraryFromAllUserLists(supabase, user.id, place.id);
              } else if (isSupabasePlaceId(place.id)) {
                await removePlaceFromAllUserLists(supabase, user.id, place.id);
              }
              setSaved(false);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not update saved lists.');
            }
          },
        },
      ]
    );
  };

  const onPressSaveFab = () => {
    if (saved) onConfirmRemoveSave();
    else openSaveToListPicker();
  };

  const onPickList = async (list: SaveToListRow) => {
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

  const greenHeader = (
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
  );

  const openEstablishment = (p: Place) => {
    (navigation as { navigate: (name: string, params: object) => void }).navigate('AboutEstablishment', {
      place: p,
    });
  };

  if (isItinerary) {
    return (
      <View style={[styles.root, { backgroundColor: LIST_PAGE_BG }]}>
        {greenHeader}
        <FlatList
          data={itineraryStops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.itineraryListContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.itineraryHeaderBlock}>
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
              <Text style={styles.itineraryTitleBelowHero}>{place.name}</Text>
              <Text style={styles.establishmentsHeading}>Establishments</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.establishmentRow}
              onPress={() => openEstablishment(item)}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={item.name}
            >
              <View style={styles.establishmentRowIcon}>
                <JamIcon ionicon="business" size={24} color={TEAL} />
              </View>
              <Text style={styles.establishmentRowTitle} numberOfLines={2}>
                {item.name}
              </Text>
              <JamIcon ionicon="chevron-forward" size={18} color={MUTED} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.itineraryEmpty}>
              No establishments are linked to this itinerary yet.
            </Text>
          }
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: PAGE_BG }]}>
      {greenHeader}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          {place.image ? (
            <Image source={place.image} style={styles.heroImage} resizeMode="cover" accessibilityLabel={`${place.name} photo`} />
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
              accessibilityLabel={saved ? 'Remove save' : 'Save place'}
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
            onPress={() => setTab('description')}
            style={[styles.segmentSlot, tab === 'description' && styles.segmentSlotActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'description' }}
          >
            <Text style={[styles.segmentLabel, tab === 'description' ? styles.segmentLabelOn : styles.segmentLabelOff]}>
              Description
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('reviews')}
            style={[styles.segmentSlot, tab === 'reviews' && styles.segmentSlotActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'reviews' }}
          >
            <Text style={[styles.segmentLabel, tab === 'reviews' ? styles.segmentLabelOn : styles.segmentLabelOff]}>
              Reviews
            </Text>
          </Pressable>
        </View>

        {tab === 'description' ? (
          <>
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionLabel}>About this place</Text>
              <Text style={styles.bodyText}>{bodyText}</Text>
            </View>
            <TouchableOpacity
              onPress={openDirections}
              style={styles.directionsButton}
              activeOpacity={0.92}
              accessibilityRole="button"
              accessibilityLabel="Get directions"
            >
              <Text style={styles.directionsButtonLabel}>Get directions</Text>
            </TouchableOpacity>
          </>
        ) : (
          <ReviewCardsList />
        )}
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
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
  segmentLabelOn: {
    color: GREEN,
    fontFamily: 'Inter_700Bold',
  },
  segmentLabelOff: {
    color: MUTED,
  },
  descriptionCard: {
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
  },
  descriptionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: TEAL,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  bodyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 26,
    color: TITLE,
    letterSpacing: 0.15,
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
  itineraryListContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  itineraryHeaderBlock: {
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: LIST_PAGE_BG,
  },
  itineraryTitleBelowHero: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 20,
    lineHeight: 24,
    color: TITLE,
    marginBottom: 16,
  },
  establishmentsHeading: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: TITLE,
    marginBottom: 10,
  },
  establishmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(122, 120, 120, 0.12)',
  },
  establishmentRowIcon: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  establishmentRowTitle: {
    flex: 1,
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: TITLE,
    minWidth: 0,
  },
  itineraryEmpty: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
});
