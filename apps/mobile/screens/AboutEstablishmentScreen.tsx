import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import { SaveToListSheet, type SaveToListRow } from '../components/SaveToListSheet';
import { Place, getItineraryEstablishments } from '../data/mockData';
import { parsePlaceCoords } from '../lib/placeCoords';
import { placeImageSource } from '../lib/placeImageSource';
import { formatNtdpCategoryTagLabel, getEstablishmentAboutBody } from '../lib/ntdpDisplayLabels';
import { fetchPlaceById } from '../lib/placesFromSupabase';
import { supabase } from '../lib/supabase';
import {
  isSupabasePlaceId,
  isPlaceSavedByUser,
  removePlaceFromAllUserLists,
  removeItineraryFromAllUserLists,
  addPlaceToSavedList,
  addItineraryToSavedList,
  placeRowExists,
  fetchUserListsForPickerWithCounts,
  findOrCreateListByName,
} from '../lib/savedListItems';
import {
  alertAfterSaveToList,
  SAVE_TO_LIST_CREATE_BUSY_ID,
  suggestedSaveListName,
} from '../lib/saveToListModalHelpers';
import { fetchPlaceCheckinDisplay, recordCheckinByCode } from 'cavitour-shared/placeCheckin';
import { buildMobileCheckinDeepLink, getMobileCheckinWebOrigin } from '../lib/checkinDeepLink';
import { thankYouVisitMessage } from '../lib/confirmCheckin';
import { CheckinScannerModal, ScanCheckinButton } from '../components/CheckinScannerModal';
import { CheckinQrMark } from '../components/CheckinQrMark';
const GREEN = '#7EA00E';
const TEAL = '#1F4F59';
const TITLE = '#241D13';
const MUTED = '#868686';
const WHITE = '#FFFFFF';
const PAGE_BG = '#FFFFFF';
const LIST_PAGE_BG = '#F5F5F6';
const CARD_BORDER = 'rgba(229, 229, 229, 0.9)';
const CATEGORY_PILL_BG = 'rgba(126, 160, 14, 0.22)';
const CATEGORY_PILL_TEXT = '#3d4a06';
const NEUTRAL_MUTED = '#737373';

export type AboutEstablishmentParams = {
  place?: Place;
  placeId?: string;
};

function imageSourceKey(src: ImageSourcePropType): string {
  if (typeof src === 'number') return `n-${src}`;
  if (typeof src === 'object' && src !== null && 'uri' in src) {
    return String((src as { uri?: string }).uri ?? '');
  }
  return '';
}

function collectPhotoSlides(place: Place): ImageSourcePropType[] {
  const seen = new Set<string>();
  const out: ImageSourcePropType[] = [];
  const add = (img: unknown) => {
    const src = placeImageSource(img);
    if (!src) return;
    const key = imageSourceKey(src);
    if (key && seen.has(key)) return;
    if (key) seen.add(key);
    out.push(src);
  };
  add(place.image);
  place.gallery?.forEach(add);
  return out;
}

function getCategoryLabel(place: Place): string {
  const raw = place.ntdp_category?.trim();
  if (raw) return formatNtdpCategoryTagLabel(raw);
  return 'Cavite tourism';
}

function normalizeExternalUrl(url: string): string {
  const t = url.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function AboutBackBar({ onBack, topInset }: { onBack: () => void; topInset: number }) {
  return (
    <View style={[styles.backBar, { paddingTop: topInset + 10 }]}>
      <TouchableOpacity
        style={styles.backBarBtn}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        activeOpacity={0.75}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.backBarIconWrap}>
          <JamIcon ionicon="arrow-back" size={22} color={TITLE} />
        </View>
        <Text style={styles.backBarLabel}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

function EstablishmentPhotoCarousel({
  slides,
  placeName,
}: {
  slides: ImageSourcePropType[];
  placeName: string;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const slideWidth = screenWidth - 36;
  const [activeIndex, setActiveIndex] = useState(0);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / slideWidth);
    setActiveIndex(Math.max(0, Math.min(idx, Math.max(slides.length - 1, 0))));
  };

  return (
    <View style={styles.carouselWrap}>
      {slides.length > 0 ? (
        <>
          <FlatList
            data={slides}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => `photo-${i}`}
            onMomentumScrollEnd={onScrollEnd}
            snapToInterval={slideWidth}
            decelerationRate="fast"
            getItemLayout={(_, index) => ({
              length: slideWidth,
              offset: slideWidth * index,
              index,
            })}
            renderItem={({ item, index }) => (
              <Image
                source={item}
                style={[styles.carouselSlide, { width: slideWidth }]}
                resizeMode="cover"
                accessibilityLabel={`${placeName} photo ${index + 1}`}
              />
            )}
          />
          {slides.length > 1 ? (
            <View style={styles.carouselDots} accessibilityLabel={`Photo ${activeIndex + 1} of ${slides.length}`}>
              {slides.map((_, i) => (
                <View
                  key={`dot-${i}`}
                  style={[styles.carouselDot, i === activeIndex && styles.carouselDotActive]}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <View style={[styles.carouselSlide, styles.heroPlaceholder, { width: slideWidth }]}>
          <JamIcon ionicon="image-outline" size={48} color={MUTED} />
        </View>
      )}
    </View>
  );
}

export default function AboutEstablishmentScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = (route.params ?? {}) as AboutEstablishmentParams;
  const routePlace = routeParams.place;
  const routePlaceId = routeParams.placeId ?? routePlace?.id;

  const [displayPlace, setDisplayPlace] = useState<Place | null>(routePlace ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const place = displayPlace;
  const isItinerary = routePlace?.type === 'Itinerary' || place?.type === 'Itinerary';
  const itineraryStops = useMemo(
    () => (place ? getItineraryEstablishments(place.id, []) : []),
    [place?.id]
  );

  const [profileLoading, setProfileLoading] = useState(!routePlace && Boolean(routePlaceId));
  const [saved, setSaved] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [pickLists, setPickLists] = useState<SaveToListRow[]>([]);
  const [listNameDraft, setListNameDraft] = useState('');
  const [saveListBusyId, setSaveListBusyId] = useState<string | null>(null);
  const [checkingSaved, setCheckingSaved] = useState(false);
  const [checkinInfo, setCheckinInfo] = useState<{
    code: string;
    qrValue: string;
    checkinUrl: string;
  } | null>(null);
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (routePlace) {
      setDisplayPlace(routePlace);
      setLoadError(null);
    }
  }, [routePlace?.id]);

  useEffect(() => {
    if (!routePlaceId || isItinerary) return;
    if (routePlace && routePlaceId) {
      let cancelled = false;
      setProfileLoading(true);
      fetchPlaceById(supabase, routePlace.id)
        .then((full) => {
          if (!cancelled && full) setDisplayPlace(full);
        })
        .finally(() => {
          if (!cancelled) setProfileLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }
    if (!routePlace && routePlaceId) {
      let cancelled = false;
      setProfileLoading(true);
      setLoadError(null);
      fetchPlaceById(supabase, routePlaceId)
        .then((full) => {
          if (cancelled) return;
          if (full) setDisplayPlace(full);
          else setLoadError('Establishment not found in the catalog.');
        })
        .catch(() => {
          if (!cancelled) setLoadError('Could not load this establishment.');
        })
        .finally(() => {
          if (!cancelled) setProfileLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [routePlace?.id, routePlaceId, isItinerary]);

  useEffect(() => {
    const id = place?.id;
    if (!id || isItinerary || !isSupabasePlaceId(id)) {
      setCheckinInfo(null);
      return;
    }
    let cancelled = false;
    const origin = getMobileCheckinWebOrigin();
    void fetchPlaceCheckinDisplay(supabase, id, origin)
      .then((info) => {
        if (cancelled || !info) {
          if (!cancelled) setCheckinInfo(null);
          return;
        }
        // Poster QR encodes deep link / web URL. Same-phone check-in uses Check in here (no camera).
        const deep = buildMobileCheckinDeepLink(info.code);
        setCheckinInfo({
          code: info.code,
          checkinUrl: info.checkinUrl,
          qrValue: deep || info.checkinUrl || info.code,
        });
      })
      .catch(() => {
        if (!cancelled) setCheckinInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [place?.id, isItinerary]);

  const onCheckinHere = useCallback(async () => {
    if (!checkinInfo?.code) {
      Alert.alert('Check-in', 'No QR for this establishment yet. Run the check-in SQL in Supabase.');
      return;
    }
    setCheckinBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Sign in', 'Sign in to check in at this establishment.');
        return;
      }
      const result = await recordCheckinByCode(supabase, checkinInfo.code, 'qr');
      Alert.alert(
        result.alreadyCheckedIn ? 'Already checked in' : 'Thank you for visiting!',
        thankYouVisitMessage(result.placeName, result.alreadyCheckedIn)
      );
    } catch (e) {
      Alert.alert('Check-in', e instanceof Error ? e.message : 'Could not check in.');
    } finally {
      setCheckinBusy(false);
    }
  }, [checkinInfo?.code]);

  const categoryLabel = useMemo(() => (place ? getCategoryLabel(place) : ''), [place]);
  const photoSlides = useMemo(() => (place ? collectPhotoSlides(place) : []), [place]);
  const bodyText = useMemo(() => (place ? getEstablishmentAboutBody(place).trim() : ''), [place]);
  const addressLine = useMemo(() => {
    if (!place) return '';
    const addr = place.address?.trim();
    if (addr) return addr;
    return place.city_mun?.trim() ?? '';
  }, [place]);
  const hasContact = Boolean(
    place?.phone ||
      place?.email ||
      place?.website ||
      place?.social_facebook ||
      place?.social_instagram ||
      place?.social_twitter
  );

  if (!place && profileLoading) {
    return (
      <View style={[styles.root, { backgroundColor: PAGE_BG, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={{ marginTop: 12, color: MUTED }}>Loading establishment…</Text>
      </View>
    );
  }

  if (!place) {
    return (
      <View style={[styles.root, { backgroundColor: PAGE_BG, padding: 24, justifyContent: 'center' }]}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: TITLE }}>Establishment unavailable</Text>
        <Text style={{ marginTop: 8, color: MUTED }}>{loadError ?? 'Missing place data.'}</Text>
        <TouchableOpacity
          style={{ marginTop: 20 }}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={{ color: TEAL, fontWeight: '600' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const openContactLink = (url: string) => {
    Linking.openURL(normalizeExternalUrl(url)).catch(() => {
      Alert.alert('Could not open link', 'This link could not be opened on your device.');
    });
  };

  const openStartCaviTrip = () => {
    const c = parsePlaceCoords(place);
    if (!c) {
      Alert.alert('Can’t start trip', 'This place does not have map coordinates yet.');
      return;
    }
    const placeForNav: Place = { ...place, latitude: c.lat, longitude: c.lng };
    (navigation as { navigate: (name: string, params: object) => void }).navigate('Directions', {
      place: placeForNav,
      caviTrip: true,
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

  const saveItemToList = async (listId: string, listName: string) => {
    if (isItinerary) {
      return addItineraryToSavedList(supabase, listId, place.id);
    }
    if (!isSupabasePlaceId(place.id)) {
      return { ok: false as const, duplicate: false, message: 'Invalid place id.' };
    }
    return addPlaceToSavedList(supabase, listId, place.id);
  };

  const openSaveToListPicker = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Sign in', 'Sign in to save places to your lists.');
      return;
    }

    if (!isItinerary) {
      if (!isSupabasePlaceId(place.id)) {
        Alert.alert(
          'Can’t save this place',
          'Only places from the Tara, Cavite! catalog (with a database id) can be added to a saved list. Try opening this spot from search or the map.'
        );
        return;
      }
      const exists = await placeRowExists(supabase, place.id);
      if (!exists) {
        Alert.alert('Place not found', 'This location is not in the catalog yet and can’t be saved.');
        return;
      }
    }

    try {
      const lists = await fetchUserListsForPickerWithCounts(supabase, user.id);
      setListNameDraft(suggestedSaveListName(place.ntdp_category));
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
      const res = await saveItemToList(list.id, list.name);
      alertAfterSaveToList(res, place.name, list.name, () => {
        setSaveModalVisible(false);
        setSaved(true);
      });
    } finally {
      setSaveListBusyId(null);
    }
  };

  const onCreateList = async () => {
    const trimmed = listNameDraft.trim();
    if (!trimmed) return;
    setSaveListBusyId(SAVE_TO_LIST_CREATE_BUSY_ID);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const list = await findOrCreateListByName(supabase, user.id, trimmed);
      if (!list) return;
      const res = await saveItemToList(list.id, list.name);
      alertAfterSaveToList(res, place.name, list.name, () => {
        setSaveModalVisible(false);
        setSaved(true);
      });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not create list.');
    } finally {
      setSaveListBusyId(null);
    }
  };

  const goBack = () => navigation.goBack();

  const openEstablishment = (p: Place) => {
    (navigation as { navigate: (name: string, params: object) => void }).navigate('AboutEstablishment', {
      place: p,
    });
  };

  if (isItinerary) {
    const itinerarySlides = collectPhotoSlides(place);
    return (
      <View style={[styles.root, { backgroundColor: LIST_PAGE_BG }]}>
        <View style={styles.itineraryCarouselPad}>
          <AboutBackBar onBack={goBack} topInset={insets.top} />
          <EstablishmentPhotoCarousel slides={itinerarySlides} placeName={place.name} />
        </View>
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
              <Text style={styles.eyebrow}>About establishment</Text>
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AboutBackBar onBack={goBack} topInset={insets.top} />
        <EstablishmentPhotoCarousel slides={photoSlides} placeName={place.name} />

        <View style={[styles.titleBlock, { width: screenWidth - 36 }]}>
          <View style={styles.titleTextCol}>
            <Text style={styles.eyebrow}>About establishment</Text>
            <Text style={styles.placeName}>{place.name}</Text>
            {addressLine ? (
              <Text style={styles.addressLine} numberOfLines={3}>
                {addressLine}
              </Text>
            ) : null}
            <View style={styles.categoryPillRow}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{categoryLabel}</Text>
              </View>
            </View>
          </View>
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
        </View>

        <View style={styles.aboutPanel}>
          <View style={styles.aboutPanelInner}>
            <Text style={styles.descriptionLabel}>About this establishment</Text>
            {profileLoading ? (
              <ActivityIndicator style={{ marginTop: 12 }} color={GREEN} />
            ) : (
              <Text style={styles.bodyText}>{bodyText}</Text>
            )}
            {place.hours?.trim() ? (
              <Text style={styles.hoursLine}>
                <Text style={styles.hoursLabel}>Hours: </Text>
                {place.hours.trim()}
              </Text>
            ) : null}
            {hasContact ? (
              <View style={styles.contactBox}>
                <Text style={[styles.descriptionLabel, styles.contactSectionTitle]}>Contact</Text>
                {place.phone ? (
                  <Text style={styles.contactLine}>
                    <Text style={styles.contactLabel}>Phone: </Text>
                    {place.phone}
                  </Text>
                ) : null}
                {place.email ? (
                  <Text style={styles.contactLine}>
                    <Text style={styles.contactLabel}>Email: </Text>
                    {place.email}
                  </Text>
                ) : null}
                {place.website ? (
                  <TouchableOpacity
                    onPress={() => openContactLink(place.website!)}
                    activeOpacity={0.7}
                    style={styles.contactTapRow}
                  >
                    <Text style={styles.contactLine}>
                      <Text style={styles.contactLabel}>Website: </Text>
                      <Text style={styles.contactLink}>{place.website}</Text>
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {place.social_facebook ? (
                  <TouchableOpacity
                    onPress={() => openContactLink(place.social_facebook!)}
                    activeOpacity={0.7}
                    style={styles.contactTapRow}
                  >
                    <Text style={styles.contactLine}>
                      <Text style={styles.contactLabel}>Facebook: </Text>
                      <Text style={styles.contactLink}>{place.social_facebook}</Text>
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {place.social_instagram ? (
                  <TouchableOpacity
                    onPress={() => openContactLink(place.social_instagram!)}
                    activeOpacity={0.7}
                    style={styles.contactTapRow}
                  >
                    <Text style={styles.contactLine}>
                      <Text style={styles.contactLabel}>Instagram: </Text>
                      <Text style={styles.contactLink}>{place.social_instagram}</Text>
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {place.social_twitter ? (
                  <TouchableOpacity
                    onPress={() => openContactLink(place.social_twitter!)}
                    activeOpacity={0.7}
                    style={styles.contactTapRow}
                  >
                    <Text style={styles.contactLine}>
                      <Text style={styles.contactLabel}>X: </Text>
                      <Text style={styles.contactLink}>{place.social_twitter}</Text>
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.actionsBlock}>
          {checkinInfo ? (
            <View style={styles.qrCard}>
              <Text style={styles.qrTitle}>Check in at this place</Text>
              <Text style={styles.qrHint}>
                You are already on this establishment. Tap Check in here to count your visit — the camera
                cannot scan a QR on this same phone screen.
              </Text>
              <TouchableOpacity
                onPress={() => void onCheckinHere()}
                disabled={checkinBusy}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Tap to check in at this establishment"
                style={{ alignSelf: 'center' }}
              >
                <CheckinQrMark value={checkinInfo.qrValue} size={200} />
              </TouchableOpacity>
              <Text style={styles.qrCodeText}>{checkinInfo.code}</Text>
              <TouchableOpacity
                onPress={() => void onCheckinHere()}
                style={styles.checkinButton}
                activeOpacity={0.92}
                disabled={checkinBusy}
                accessibilityRole="button"
                accessibilityLabel="Check in at this establishment"
              >
                {checkinBusy ? (
                  <ActivityIndicator color={TEAL} />
                ) : (
                  <Text style={styles.checkinButtonLabel}>CHECK IN HERE</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.qrPosterHint}>
                Have a printed poster for a different place? Use Scan poster QR below.
              </Text>
              <ScanCheckinButton onPress={() => setScannerOpen(true)} label="Scan poster QR" />
            </View>
          ) : (
            <View style={styles.qrCard}>
              <Text style={styles.qrTitle}>Check in with QR</Text>
              <Text style={styles.qrHint}>
                Point your camera at a printed establishment poster QR. Scanning the QR on this phone
                screen will not work — open that place and tap Check in here instead.
              </Text>
              <ScanCheckinButton onPress={() => setScannerOpen(true)} label="Scan poster QR" />
            </View>
          )}
          <TouchableOpacity
            onPress={openStartCaviTrip}
            style={styles.caviTripButton}
            activeOpacity={0.92}
            accessibilityRole="button"
            accessibilityLabel="Start CaviTrip"
          >
            <Text style={styles.caviTripButtonLabel}>START CAVITRIP</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SaveToListSheet
        visible={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
        itemLabel={place.name}
        lists={pickLists}
        listNameDraft={listNameDraft}
        onListNameChange={setListNameDraft}
        onSelectList={onPickList}
        onCreateList={onCreateList}
        busyListId={saveListBusyId}
        countLabel={isItinerary ? 'items' : 'places'}
      />
      <CheckinScannerModal visible={scannerOpen} onClose={() => setScannerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 0,
  },
  backBar: {
    marginBottom: 10,
  },
  backBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    minHeight: 44,
    paddingRight: 12,
  },
  backBarIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.08)',
  },
  backBarLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: TITLE,
  },
  carouselWrap: {
    marginTop: 4,
    marginBottom: 20,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#E8E8E8',
  },
  carouselSlide: {
    aspectRatio: 4 / 3,
    backgroundColor: '#E8E8E8',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselDots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  carouselDotActive: {
    backgroundColor: WHITE,
    width: 18,
  },
  eyebrow: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: GREEN,
    marginBottom: 4,
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  titleTextCol: {
    flex: 1,
    minWidth: 0,
  },
  placeName: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 20,
    lineHeight: 26,
    color: TITLE,
    letterSpacing: -0.2,
  },
  addressLine: {
    marginTop: 8,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: NEUTRAL_MUTED,
  },
  categoryPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: CATEGORY_PILL_BG,
    maxWidth: '100%',
    alignSelf: 'flex-start',
  },
  categoryPillText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
    color: CATEGORY_PILL_TEXT,
  },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  fabSave: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: 'rgba(212, 212, 212, 1)',
  },
  fabSaveActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  aboutPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: WHITE,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  aboutPanelInner: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 245, 245, 1)',
  },
  descriptionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    lineHeight: 14,
    color: NEUTRAL_MUTED,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 0,
  },
  bodyText: {
    marginTop: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#404040',
    letterSpacing: 0.1,
  },
  hoursLine: {
    marginTop: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#404040',
  },
  hoursLabel: {
    fontFamily: 'Inter_600SemiBold',
    color: TITLE,
  },
  contactBox: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  contactSectionTitle: {
    marginBottom: 4,
  },
  contactTapRow: {
    minHeight: 44,
    justifyContent: 'center',
  },
  contactLine: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#404040',
    marginTop: 8,
  },
  contactLabel: {
    fontFamily: 'Inter_600SemiBold',
    color: TITLE,
  },
  contactLink: {
    fontFamily: 'Inter_400Regular',
    color: '#6B8E23',
    textDecorationLine: 'underline',
  },
  actionsBlock: {
    marginTop: 20,
    gap: 12,
  },
  qrCard: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(31, 79, 89, 0.2)',
    backgroundColor: '#F8FAFB',
    padding: 16,
    alignItems: 'center',
  },
  qrTitle: {
    alignSelf: 'stretch',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: MUTED,
  },
  qrHint: {
    alignSelf: 'stretch',
    marginTop: 6,
    marginBottom: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#525252',
  },
  qrImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qrCodeText: {
    marginTop: 10,
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    letterSpacing: 1,
    color: TITLE,
  },
  qrPosterHint: {
    marginTop: 14,
    marginBottom: 2,
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: '#6b7280',
  },
  checkinButton: {
    marginTop: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: TEAL,
  },
  checkinButtonLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    letterSpacing: 0.8,
    color: TEAL,
  },
  caviTripButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: TEAL,
    borderWidth: 2,
    borderColor: TEAL,
  },
  caviTripButtonLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    letterSpacing: 0.8,
    color: WHITE,
  },
  itineraryCarouselPad: {
    paddingHorizontal: 18,
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
