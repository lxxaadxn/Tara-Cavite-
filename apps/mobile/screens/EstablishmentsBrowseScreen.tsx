import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../components/Header';
import { JamIcon } from '../components/JamIcon';
import { Colors, Theme } from '../constants/theme';
import type { Place } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { fetchAllPlacesFromSupabase, logPlacesFetchError } from '../lib/placesFromSupabase';
import { placeImageSource } from '../lib/placeImageSource';
import { formatNtdpCategoryTagLabel } from '../lib/ntdpDisplayLabels';

const TEAL = '#1F4F59';

export default function EstablishmentsBrowseScreen() {
  const navigation = useNavigation();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchAllPlacesFromSupabase(supabase, 1000);
        if (!cancelled) setPlaces(list);
      } catch (e) {
        if (!cancelled) {
          logPlacesFetchError('EstablishmentsBrowseScreen', e);
          setError(e instanceof Error ? e.message : 'Could not load establishments.');
          setPlaces([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...places].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    if (!q) return sorted;
    return sorted.filter((p) => {
      const hay = `${p.name} ${p.address ?? ''} ${p.city_mun ?? ''} ${p.ntdp_category ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [places, search]);

  const openAbout = (place: Place) => {
    (navigation as { navigate: (name: string, params: object) => void }).navigate('AboutEstablishment', {
      place,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="All establishments"
        showBack
        showNotification
        onNotificationPress={() => navigation.navigate('Notifications' as never)}
      />
      <View style={styles.searchWrap}>
        <JamIcon name="search" size={18} color={Colors.text.light} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, city, category…"
          placeholderTextColor={Colors.text.light}
          accessibilityLabel="Search establishments"
        />
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => openAbout(item)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`About ${item.name}`}
            >
              {placeImageSource(item.image) ? (
                <Image source={placeImageSource(item.image)!} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbPh]}>
                  <JamIcon ionicon="image-outline" size={28} color={Colors.text.light} />
                </View>
              )}
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.meta} numberOfLines={2}>
                  {item.city_mun ? `${item.city_mun} · ` : ''}
                  {item.address}
                </Text>
                {item.ntdp_category ? (
                  <Text style={styles.tag}>{formatNtdpCategoryTagLabel(item.ntdp_category)}</Text>
                ) : null}
              </View>
              <Text style={styles.aboutCta}>About</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No establishments match your search.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#f5f5f5',
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text.primary, padding: 0 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Theme.spacing.lg },
  errorText: { fontSize: 14, color: Colors.text.primary, textAlign: 'center' },
  listContent: { paddingHorizontal: Theme.spacing.md, paddingBottom: Theme.spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#eee' },
  thumbPh: { justifyContent: 'center', alignItems: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600', color: Colors.text.primary },
  meta: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  tag: { marginTop: 4, fontSize: 10, fontWeight: '600', color: TEAL, textTransform: 'uppercase' },
  aboutCta: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  empty: { textAlign: 'center', paddingVertical: 32, color: Colors.text.secondary, fontSize: 14 },
});
