import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
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
import { launchGoogleMapsDrivingTo } from '../lib/launchGoogleMapsDirections';
import * as Location from 'expo-location';
import { formatNtdpCategoryTagLabel, getEstablishmentAboutBody } from '../lib/ntdpDisplayLabels';
import { fetchPlaceById, fetchDashboardPlacesPool, haversineDistanceKm } from '../lib/placesFromSupabase';
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
import { fetchPlaceReviews, type PlaceReview } from '../lib/placeReviews';
import { hasQrPlaceVisit } from 'cavitour-shared/placeCheckin';
import { PlaceReviewForm } from '../components/PlaceReviewForm';
import { ReviewCardsList } from '../components/ReviewCardsList';
import { LeafletMapView } from '../components/LeafletMapView';
import type { User } from '@supabase/supabase-js';

const GREEN = '#10A37F';
const TEAL = '#1B8A70';
const TITLE = '#241D13';
const MUTED = '#868686';
const WHITE = '#FFFFFF';
const OLIVE = '#10A37F';
const STAR_FULL = '#FFC012';
const STAR_EMPTY = '#E5E5E5';

function buildReviewStats(ratings: number[]) {
  const list = ratings.map((r) => Math.min(5, Math.max(1, Math.round(Number(r)))));
  const total = list.length;
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const s of list) counts[s as 1 | 2 | 3 | 4 | 5] += 1;
  const avg = total ? list.reduce((a, s) => a + s, 0) / total : 0;
  return {
    total,
    avgRating: Math.round(avg * 10) / 10,
    breakdown: [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      pct: total > 0 ? Math.round((counts[stars as 1 | 2 | 3 | 4 | 5] / total) * 100) : 0,
    })),
  };
}
const PAGE_BG = '#FFFFFF';
const LIST_PAGE_BG = '#F5F5F6';
const CARD_BORDER = 'rgba(229, 229, 229, 0.9)';
const CATEGORY_PILL_BG = 'rgba(16, 163, 127, 0.22)';
const CATEGORY_PILL_TEXT = '#3d4a06';
const NEUTRAL_MUTED = '#737373';

function formatProximityKm(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return '';
  if (km < 0.1) return 'Nearby';
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export type AboutEstablishmentParams = {
  place?: Place;
  placeId?: string;
  confirmArrival?: boolean;
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
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [reviewNickname, setReviewNickname] = useState('');
  const [publishedReviews, setPublishedReviews] = useState<PlaceReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [canWriteReview, setCanWriteReview] = useState(false);
  const [userPt, setUserPt] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<Array<Place & { distanceKm: number }>>([]);
  const [overviewExpanded, setOverviewExpanded] = useState(false);

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
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setAuthUser(user);
      if (!user) {
        setReviewNickname('');
        return;
      }
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      setReviewNickname(
        profile?.username?.trim() || user.email?.split('@')[0] || 'Traveler'
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [place?.id]);

  useEffect(() => {
    const id = place?.id;
    if (!id || isItinerary || !isSupabasePlaceId(id)) {
      setPublishedReviews([]);
      setReviewsError('');
      return;
    }
    let cancelled = false;
    setReviewsLoading(true);
    setReviewsError('');
    void (async () => {
      try {
        const rows = await fetchPlaceReviews(supabase, id);
        if (cancelled) return;
        setPublishedReviews(rows);
      } catch (err) {
        if (!cancelled) {
          setPublishedReviews([]);
          setReviewsError(err instanceof Error ? err.message : 'Could not load reviews.');
        }
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [place?.id, isItinerary]);

  const refreshCanWriteReview = useCallback(async () => {
    const id = place?.id;
    if (!id || isItinerary || !isSupabasePlaceId(id) || !authUser) {
      setCanWriteReview(false);
      return;
    }
    const visited = await hasQrPlaceVisit(supabase, id);
    setCanWriteReview(visited);
  }, [place?.id, isItinerary, authUser]);

  useEffect(() => {
    void refreshCanWriteReview();
  }, [refreshCanWriteReview]);

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

  const placeCoords = useMemo(() => (place ? parsePlaceCoords(place) : null), [place]);
  const distanceKm = useMemo(() => {
    if (!userPt || !placeCoords) return null;
    return haversineDistanceKm(userPt.lat, userPt.lng, placeCoords.lat, placeCoords.lng);
  }, [userPt, placeCoords]);
  const distanceLabel = formatProximityKm(distanceKm);
  const highlightCards = useMemo(() => {
    if (!place) return [];
    return [
      { key: 'type', label: 'Type', value: String(place.ta_category || place.type_code || place.type || '').trim() || '—' },
      { key: 'category', label: 'Category', value: categoryLabel || '—' },
      { key: 'municipality', label: 'Municipality', value: String(place.city_mun || '').trim() || '—' },
    ];
  }, [place, categoryLabel]);
  const overviewNeedsToggle = bodyText.length > 220;
  const overviewText =
    overviewNeedsToggle && !overviewExpanded ? `${bodyText.slice(0, 220).trim()}…` : bodyText;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setUserPt({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!placeCoords || isItinerary) {
      setNearbyPlaces([]);
      return;
    }
    let cancelled = false;
    void fetchDashboardPlacesPool(supabase, 400)
      .then((pool) => {
        if (cancelled) return;
        const ranked = pool
          .filter((p) => p.id !== place?.id)
          .map((p) => {
            const c = parsePlaceCoords(p);
            if (!c) return null;
            return {
              ...p,
              distanceKm: haversineDistanceKm(placeCoords.lat, placeCoords.lng, c.lat, c.lng),
            };
          })
          .filter((p): p is Place & { distanceKm: number } => p != null && Number.isFinite(p.distanceKm))
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, 4);
        setNearbyPlaces(ranked);
      })
      .catch(() => {
        if (!cancelled) setNearbyPlaces([]);
      });
    return () => {
      cancelled = true;
    };
  }, [place?.id, placeCoords?.lat, placeCoords?.lng, isItinerary]);

  const visitorReviews = useMemo(
    () => [...publishedReviews].sort((a, b) => b.at - a.at),
    [publishedReviews]
  );

  const reviewStats = useMemo(
    () => buildReviewStats(visitorReviews.map((r) => r.rating)),
    [visitorReviews]
  );

  const handleReviewSubmitted = useCallback(async () => {
    if (!place?.id) return;
    try {
      const rows = await fetchPlaceReviews(supabase, place.id);
      setPublishedReviews(rows);
      setReviewsError('');
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : 'Could not load reviews.');
    }
  }, [place?.id]);

  const refreshSavedState = useCallback(async () => {
    if (!place || isItinerary) {
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
  }, [place?.id, isItinerary, place]);

  useEffect(() => {
    void refreshSavedState();
  }, [refreshSavedState]);

  useFocusEffect(
    useCallback(() => {
      void refreshSavedState();
    }, [refreshSavedState])
  );

  const scrollRef = useRef<ScrollView>(null);
  const confirmArrivalShownRef = useRef(false);

  const openArrivalCheckinOptions = useCallback(() => {
    if (!place) return;
    Alert.alert(
      'Destination reached',
      `To record a visit at ${place.name}, use Scan on the bottom bar and scan the poster QR.`,
      [{ text: 'OK' }]
    );
  }, [place]);

  useEffect(() => {
    confirmArrivalShownRef.current = false;
  }, [place?.id]);

  useEffect(() => {
    if (!routeParams.confirmArrival || !place?.id || confirmArrivalShownRef.current) return;
    confirmArrivalShownRef.current = true;
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
      openArrivalCheckinOptions();
    }, 450);
    return () => clearTimeout(t);
  }, [routeParams.confirmArrival, place?.id, openArrivalCheckinOptions]);

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

    const goInApp = () => {
      (navigation as { navigate: (name: string, params: object) => void }).navigate('Directions', {
        place: placeForNav,
        caviTrip: true,
      });
    };

    const openGoogleMaps = async () => {
      await launchGoogleMapsDrivingTo(c.lat, c.lng);
      goInApp();
    };

    Alert.alert(
      'Start CaviTrip',
      `Open Google Maps with directions from your location to ${place.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stay in app', onPress: goInApp },
        { text: 'Open Google Maps', onPress: () => void openGoogleMaps() },
      ]
    );
  };

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
        ref={scrollRef}
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
            <Text style={styles.descriptionLabel}>Overview</Text>
            {profileLoading ? (
              <ActivityIndicator style={{ marginTop: 12 }} color={GREEN} />
            ) : (
              <>
                <Text style={styles.bodyText}>{overviewText}</Text>
                {overviewNeedsToggle ? (
                  <TouchableOpacity onPress={() => setOverviewExpanded((v) => !v)} accessibilityRole="button">
                    <Text style={styles.readMore}>{overviewExpanded ? 'Read less' : 'Read more'}</Text>
                  </TouchableOpacity>
                ) : null}
              </>
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

        {distanceLabel ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>Distance</Text>
            <Text style={styles.distanceValue}>{distanceLabel}</Text>
          </View>
        ) : null}

        {highlightCards.length > 0 ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>Highlights</Text>
            <View style={styles.highlightRow}>
              {highlightCards.map((item) => (
                <View key={item.key} style={styles.highlightCard}>
                  <Text style={styles.highlightLabel}>{item.label}</Text>
                  <Text style={styles.highlightValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {placeCoords ? (
          <View style={styles.sectionBlock}>
            <View style={styles.locationHead}>
              <Text style={styles.sectionHeading}>Location</Text>
              <TouchableOpacity
                onPress={() => {
                  void launchGoogleMapsDrivingTo(placeCoords.lat, placeCoords.lng, userPt);
                }}
                style={styles.directionsChip}
                accessibilityRole="button"
                accessibilityLabel="Directions"
              >
                <Text style={styles.directionsChipText}>Directions</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.mapWrap}>
              <LeafletMapView
                markers={[{ id: place.id, name: place.name, lat: placeCoords.lat, lng: placeCoords.lng }]}
                userLocation={userPt}
                style={styles.mapInner}
              />
            </View>
          </View>
        ) : null}

        {nearbyPlaces.length > 0 ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>Nearby</Text>
            <View style={styles.nearbyGrid}>
              {nearbyPlaces.map((p) => {
                const img = placeImageSource(p.image);
                const dist = formatProximityKm(p.distanceKm);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.nearbyCard}
                    onPress={() =>
                      (navigation as { push?: (n: string, p: object) => void; navigate: (n: string, p: object) => void }).push
                        ? (navigation as { push: (n: string, p: object) => void }).push('AboutEstablishment', { place: p })
                        : (navigation as { navigate: (n: string, p: object) => void }).navigate('AboutEstablishment', { place: p })
                    }
                    accessibilityRole="button"
                  >
                    {img ? <Image source={img} style={styles.nearbyImg} /> : <View style={[styles.nearbyImg, styles.nearbyImgFallback]} />}
                    <Text style={styles.nearbyName} numberOfLines={2}>
                      {p.name}
                    </Text>
                    <Text style={styles.nearbyMeta} numberOfLines={1}>
                      {dist ? `${dist} away` : p.city_mun || p.address}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {!isItinerary ? (
          <View style={styles.reviewsSection}>
            <Text style={styles.reviewsTitle}>Reviews</Text>
            <Text style={styles.reviewsSubtitle}>
              Reviews from visitors who posted about this establishment.
            </Text>

            {reviewsError ? <Text style={styles.reviewsError}>{reviewsError}</Text> : null}

            {reviewStats.total > 0 ? (
              <View style={styles.reviewStatsCard}>
                <View style={styles.reviewOverall}>
                  <Text style={styles.reviewOverallValue}>{reviewStats.avgRating.toFixed(1)}</Text>
                  <View style={styles.reviewOverallStars}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Text
                        key={i}
                        style={{
                          color: i <= Math.round(reviewStats.avgRating) ? STAR_FULL : STAR_EMPTY,
                          fontSize: 16,
                        }}
                      >
                        ★
                      </Text>
                    ))}
                  </View>
                  <Text style={styles.reviewOverallCount}>
                    {reviewStats.total} review{reviewStats.total === 1 ? '' : 's'}
                  </Text>
                </View>
                <View style={styles.reviewBreakdown}>
                  {reviewStats.breakdown.map((row) => (
                    <View key={row.stars} style={styles.reviewBreakdownRow}>
                      <Text style={styles.reviewBreakdownLabel}>{row.stars}</Text>
                      <View style={styles.reviewBreakdownTrack}>
                        <View
                          style={[styles.reviewBreakdownFill, { width: `${row.pct}%` }]}
                        />
                      </View>
                      <Text style={styles.reviewBreakdownPct}>{row.pct}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {reviewsLoading ? (
              <ActivityIndicator style={{ marginTop: 16 }} color={OLIVE} />
            ) : (
              <View style={{ marginTop: 16 }}>
                <ReviewCardsList
                  placeName={place.name}
                  ntdpCategory={place.ntdp_category}
                  reviews={visitorReviews}
                  emptyAsSamples={false}
                />
              </View>
            )}

            {isSupabasePlaceId(place.id) ? (
              <View style={{ marginTop: 16 }}>
                {canWriteReview ? (
                  <PlaceReviewForm
                    placeId={place.id}
                    placeName={place.name}
                    signedIn={Boolean(authUser)}
                    defaultNickname={reviewNickname}
                    onSubmitted={() => void handleReviewSubmitted()}
                    onSignIn={() => navigation.navigate('SignIn' as never)}
                  />
                ) : (
                  <View style={styles.visitReviewNote}>
                    <Text style={styles.visitReviewTitle}>Visit to leave a review</Text>
                    <Text style={styles.visitReviewBody}>
                      Use Scan on the bottom bar to scan the poster QR. After your visit is counted, you can post a review.
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.actionsBlock}>
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
  readMore: {
    marginTop: 8,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: GREEN,
  },
  sectionBlock: {
    marginTop: 22,
  },
  sectionEyebrow: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#A3A3A3',
  },
  distanceValue: {
    marginTop: 4,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: TITLE,
  },
  sectionHeading: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: TITLE,
  },
  highlightRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  highlightCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: WHITE,
    padding: 12,
  },
  highlightLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#A3A3A3',
  },
  highlightValue: {
    marginTop: 6,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: TITLE,
  },
  locationHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  directionsChip: {
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  directionsChipText: {
    color: WHITE,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  mapWrap: {
    marginTop: 12,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  mapInner: {
    flex: 1,
  },
  nearbyGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  nearbyCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: WHITE,
  },
  nearbyImg: {
    width: '100%',
    height: 96,
    backgroundColor: '#F3F4F6',
  },
  nearbyImgFallback: {
    backgroundColor: '#E5E7EB',
  },
  nearbyName: {
    paddingHorizontal: 8,
    paddingTop: 8,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: TITLE,
  },
  nearbyMeta: {
    paddingHorizontal: 8,
    paddingBottom: 10,
    marginTop: 2,
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: MUTED,
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
    color: '#1B8A70',
    textDecorationLine: 'underline',
  },
  actionsBlock: {
    marginTop: 20,
    gap: 12,
  },
  reviewsSection: {
    marginTop: 22,
    gap: 12,
  },
  reviewsTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: TITLE,
  },
  reviewsSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
    marginBottom: 4,
  },
  reviewsError: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#B42318',
  },
  reviewStatsCard: {
    marginTop: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(122, 120, 120, 0.18)',
    backgroundColor: WHITE,
    padding: 16,
    gap: 16,
  },
  reviewOverall: {
    alignItems: 'center',
    gap: 6,
  },
  reviewOverallValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 36,
    color: OLIVE,
  },
  reviewOverallStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewOverallCount: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: MUTED,
  },
  reviewBreakdown: {
    gap: 8,
  },
  reviewBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewBreakdownLabel: {
    width: 14,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: MUTED,
  },
  reviewBreakdownTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
  },
  reviewBreakdownFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: OLIVE,
  },
  reviewBreakdownPct: {
    width: 36,
    textAlign: 'right',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: MUTED,
  },
  qrCard: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(27, 138, 112, 0.2)',
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
  visitReviewNote: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(122, 120, 120, 0.18)',
    padding: 18,
  },
  visitReviewTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: TITLE,
  },
  visitReviewBody: {
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
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
