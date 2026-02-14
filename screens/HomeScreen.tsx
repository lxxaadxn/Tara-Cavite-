import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../constants/Theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { categories, mockPlaces } from '../data/mockData';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState<string>('1');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="" showBack={false} showNotification={false} />
      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where are you going?"
            placeholderTextColor={Colors.text.light}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Ionicons name="location" size={20} color={Colors.primary} />
        </View>

        {/* Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Ionicons
                name={category.icon as any}
                size={18}
                color={selectedCategory === category.id ? Colors.primary : Colors.text.secondary}
              />
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Map View Placeholder */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={48} color={Colors.text.light} />
            <Text style={styles.mapPlaceholderText}>Map View</Text>
            <Text style={styles.mapPlaceholderSubtext}>
              Map integration would go here
            </Text>
          </View>
        </View>

        {/* Nearby Places Card */}
        <Card style={styles.nearbyCard}>
          <Text style={styles.nearbyTitle}>Nearby Places</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.placesContent}
          >
            {mockPlaces.map((place) => (
              <TouchableOpacity
                key={place.id}
                style={styles.placeItem}
                onPress={() =>
                  navigation.navigate('PlaceDetail' as never, { place } as never)
                }
              >
                <View style={styles.placeIcon}>
                  <Ionicons name="location" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.placeName} numberOfLines={1}>
                  {place.name}
                </Text>
                <Text style={styles.placeAddress} numberOfLines={1}>
                  {place.address}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>
      </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    ...Theme.shadows.card,
  },
  searchInput: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    fontSize: 16,
    color: Colors.text.primary,
  },
  categoriesContainer: {
    marginVertical: Theme.spacing.md,
  },
  categoriesContent: {
    paddingHorizontal: Theme.spacing.md,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    marginRight: Theme.spacing.sm,
    ...Theme.shadows.card,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary + '10',
  },
  categoryText: {
    marginLeft: Theme.spacing.xs,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  categoryTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
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
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: Theme.spacing.sm,
  },
  mapPlaceholderSubtext: {
    fontSize: 12,
    color: Colors.text.light,
    marginTop: Theme.spacing.xs,
  },
  nearbyCard: {
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  nearbyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Theme.spacing.md,
  },
  placesContent: {
    paddingRight: Theme.spacing.md,
  },
  placeItem: {
    width: 120,
    marginRight: Theme.spacing.md,
    alignItems: 'center',
  },
  placeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.sm,
  },
  placeName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  placeAddress: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});

export default HomeScreen;
