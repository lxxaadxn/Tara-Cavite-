import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../constants/theme';

const MAP_FILTERS = [
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'transit', label: 'Transit' },
  { id: 'hotels', label: 'Hotels' },
  { id: 'souvenir', label: 'Souvenir Shops' },
];

const DirectionsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const place = (route.params as any)?.place;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Purple-blue gradient banner */}
      <View style={styles.banner}>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="menu" size={24} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.directionsIconBtn}
          onPress={() => {}}
        >
          <Ionicons name="car" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={Colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Where are you going?"
          placeholderTextColor={Colors.text.light}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Ionicons name="location" size={20} color={Colors.text.secondary} />
      </View>

      <View style={styles.filtersRow}>
        {MAP_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.filterChip,
              selectedFilter === f.id && styles.filterChipActive,
            ]}
            onPress={() =>
              setSelectedFilter(selectedFilter === f.id ? null : f.id)
            }
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === f.id && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Map area */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={64} color={Colors.text.light} />
          <Text style={styles.mapText}>Map with directions</Text>
          {place && (
            <Text style={styles.mapSubtext}>
              Route to {place.name}
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    backgroundColor: Colors.gradient.start,
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionsIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm + 4,
    borderRadius: Theme.borderRadius.md,
    ...Theme.shadows.card,
  },
  searchInput: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    fontSize: 16,
    color: Colors.text.primary,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Colors.white,
    ...Theme.shadows.card,
  },
  filterChipActive: {
    backgroundColor: Colors.primary + '20',
  },
  filterChipText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    margin: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.card,
  },
  mapText: {
    marginTop: Theme.spacing.sm,
    fontSize: 18,
    color: Colors.text.secondary,
  },
  mapSubtext: {
    marginTop: Theme.spacing.xs,
    fontSize: 14,
    color: Colors.text.light,
  },
});

export default DirectionsScreen;
