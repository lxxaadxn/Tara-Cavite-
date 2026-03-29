import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import { Colors, Theme } from '../constants/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Place } from '../data/mockData';
import { parsePlaceCoords } from '../lib/placeCoords';
import { supabase } from '../lib/supabase';
import { searchPlacesByText } from '../lib/placesFromSupabase';

const PICNIC_FALLBACK: Place = {
  id: '1',
  name: 'Tagaytay Picnic Grove',
  address: 'Tagaytay City, Cavite',
  type: 'Tourist Spot',
  hours: 'Open 24 hours',
  latitude: 14.1153,
  longitude: 120.9621,
};

type RouteParams = { place?: Place; query?: string };

const PlaceDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as RouteParams | undefined;

  const initialPlace = params?.place;
  const searchQuery = params?.query?.trim() ?? '';

  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Place[]>([]);
  const [picked, setPicked] = useState<Place | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isSearchFlow = !initialPlace && Boolean(searchQuery);

  useEffect(() => {
    if (initialPlace) {
      setCandidates([]);
      setPicked(null);
      setFetchError(null);
      return;
    }
    if (!searchQuery) {
      setCandidates([]);
      setPicked(null);
      setFetchError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    searchPlacesByText(supabase, searchQuery)
      .then((list) => {
        if (cancelled) return;
        setCandidates(list);
        setPicked(null);
      })
      .catch((e: Error) => {
        if (!cancelled) setFetchError(e.message ?? 'Search failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialPlace?.id, searchQuery]);

  const detailPlace = useMemo((): Place | null => {
    if (initialPlace) return initialPlace;
    if (picked) return picked;
    if (candidates.length === 1) return candidates[0];
    if (!initialPlace && !searchQuery) return PICNIC_FALLBACK;
    return null;
  }, [initialPlace, picked, candidates, searchQuery]);

  const showList =
    isSearchFlow && !loading && !fetchError && candidates.length > 1 && !picked;
  const showEmpty =
    isSearchFlow && !loading && !fetchError && candidates.length === 0;
  const showLoading = isSearchFlow && loading;
  const showError = isSearchFlow && !loading && fetchError;

  const place = detailPlace;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title=""
        showBack
        showNotification
        onNotificationPress={() => navigation.navigate('Notifications' as never)}
      />

      {showLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.hint}>Searching places…</Text>
        </View>
      ) : null}

      {showError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{fetchError}</Text>
          <Text style={styles.hint}>Check your connection and try again.</Text>
        </View>
      ) : null}

      {showEmpty ? (
        <View style={styles.centered}>
          <JamIcon ionicon="search-outline" size={48} color={Colors.text.light} />
          <Text style={styles.emptyTitle}>No places found</Text>
          <Text style={styles.hint}>
            Nothing in the map database matched &quot;{searchQuery}&quot;. Try another name or
            address from Dasmariñas STA listings.
          </Text>
        </View>
      ) : null}

      {showList ? (
        <View style={styles.listWrap}>
          <Text style={styles.listHeading}>Results for &quot;{searchQuery}&quot;</Text>
          <FlatList
            data={candidates}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultRow}
                onPress={() => setPicked(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${item.address}`}
              >
                <JamIcon ionicon="location" size={22} color={Colors.primary} />
                <View style={styles.resultTextCol}>
                  <Text style={styles.resultName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.resultAddr} numberOfLines={2}>
                    {item.address}
                  </Text>
                </View>
                <JamIcon ionicon="chevron-forward" size={20} color={Colors.text.light} />
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      {place && !showList && !showEmpty && !showLoading && !showError ? (
        <ScrollView style={styles.content}>
          <Card style={styles.card}>
            <Text style={styles.title}>{place.name}</Text>

            <View style={styles.actions}>
              <View style={styles.actionItem}>
                <JamIcon ionicon="navigate" size={24} color={Colors.primary} />
                <Text style={styles.actionText}>Directions</Text>
              </View>
              <View style={styles.actionItem}>
                <JamIcon ionicon="bookmark-outline" size={24} color={Colors.primary} />
                <Text style={styles.actionText}>Save</Text>
              </View>
              <View style={styles.actionItem}>
                <JamIcon ionicon="location-outline" size={24} color={Colors.primary} />
                <Text style={styles.actionText}>Nearby</Text>
              </View>
              <View style={styles.actionItem}>
                <JamIcon ionicon="share-outline" size={24} color={Colors.primary} />
                <Text style={styles.actionText}>Share</Text>
              </View>
            </View>

            {place.image ? (
              <View style={styles.imageContainer}>
                <Image
                  source={place.image}
                  style={styles.placeImage}
                  resizeMode="cover"
                  accessibilityLabel={`${place.name} image`}
                />
              </View>
            ) : (
              <View style={styles.imageContainer}>
                <JamIcon ionicon="image" size={48} color={Colors.text.light} />
                <Text style={styles.imagePlaceholder}>Place Image</Text>
              </View>
            )}

            <View style={styles.details}>
              <View style={styles.detailRow}>
                <JamIcon ionicon="location" size={20} color={Colors.primary} />
                <Text style={styles.detailText}>{place.address}</Text>
              </View>
              <View style={styles.detailRow}>
                <JamIcon ionicon="business" size={20} color={Colors.primary} />
                <Text style={styles.detailText}>{place.type}</Text>
              </View>
              {place.ntdp_category ? (
                <View style={styles.detailRow}>
                  <JamIcon ionicon="flag-outline" size={20} color={Colors.primary} />
                  <Text style={styles.detailText}>NTDP: {place.ntdp_category}</Text>
                </View>
              ) : null}
              <View style={styles.detailRow}>
                <JamIcon ionicon="time" size={20} color={Colors.primary} />
                <Text style={styles.detailText}>{place.hours}</Text>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title="GET DIRECTIONS"
                onPress={() => {
                  const c = parsePlaceCoords(place);
                  const placeForNav: Place = c
                    ? { ...place, latitude: c.lat, longitude: c.lng }
                    : place;
                  navigation.navigate('Directions' as never, { place: placeForNav } as never);
                }}
              />
            </View>
          </Card>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    gap: Theme.spacing.sm,
  },
  hint: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Theme.spacing.sm,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Theme.spacing.md,
  },
  listWrap: {
    flex: 1,
    paddingHorizontal: Theme.spacing.md,
  },
  listHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
  },
  listContent: {
    paddingBottom: Theme.spacing.xl,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: Theme.borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
    marginBottom: Theme.spacing.sm,
  },
  resultTextCol: {
    flex: 1,
    minWidth: 0,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  resultAddr: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  card: {
    margin: Theme.spacing.md,
    padding: Theme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Theme.spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
  },
  actionItem: {
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: Theme.spacing.xs,
  },
  imageContainer: {
    height: 200,
    backgroundColor: Colors.background,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.lg,
    overflow: 'hidden',
  },
  placeImage: {
    width: '100%',
    height: '100%',
    borderRadius: Theme.borderRadius.md,
  },
  imagePlaceholder: {
    marginTop: Theme.spacing.sm,
    color: Colors.text.light,
    fontSize: 14,
  },
  details: {
    marginBottom: Theme.spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  detailText: {
    marginLeft: Theme.spacing.sm,
    fontSize: 16,
    color: Colors.text.primary,
    flex: 1,
  },
  buttonContainer: {
    marginTop: Theme.spacing.md,
  },
});

export default PlaceDetailScreen;
