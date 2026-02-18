import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../constants/theme';
import { Header } from '../components/Header';
import { trendingSpots, nearbyPlaces, recentSearches } from '../data/mockData';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Navigate to search results or save to recent searches
      navigation.navigate('PlaceDetail' as never, { query: searchQuery.trim() } as never);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title=""
        showLogo
        showNotification
        onMenuPress={() => {}}
        onNotificationPress={() => navigation.navigate('Notifications' as never)}
      />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Search bar - dark teal */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={24} color={Colors.white} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where are you going?"
            placeholderTextColor={Colors.white}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            accessibilityLabel="Search for destinations"
            accessibilityRole="searchbox"
          />
          <TouchableOpacity onPress={handleSearch} accessibilityLabel="Search" accessibilityRole="button">
            <Ionicons name="location" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Main content - dark teal background */}
        <View style={styles.mainSection}>
          {/* Terminals & Categories buttons */}
          <View style={styles.cardsRow}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation.navigate('Terminals' as never)}
              activeOpacity={0.8}
              accessibilityLabel="View terminals"
              accessibilityRole="button"
            >
              <Ionicons name="business" size={45} color={Colors.primary} />
              <Text style={styles.quickCardText}>Terminals</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation.navigate('Categories' as never)}
              activeOpacity={0.8}
              accessibilityLabel="View categories"
              accessibilityRole="button"
            >
              <Ionicons name="list" size={35} color={Colors.primary} />
              <Text style={styles.quickCardText}>Categories</Text>
            </TouchableOpacity>
          </View>

          {/* Trending Tourist Spots card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Trending Tourist Spots</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {trendingSpots.map((spot) => (
                <TouchableOpacity
                  key={spot.id}
                  style={styles.trendingItem}
                  onPress={() =>
                    navigation.navigate('PlaceDetail' as never, { place: spot } as never)
                  }
                  accessibilityLabel={`${spot.name}, ${spot.address}`}
                  accessibilityRole="button"
                >
                  {spot.image ? (
                    <Image
                      source={spot.image}
                      style={styles.trendingImage}
                      resizeMode="cover"
                      accessibilityLabel={`${spot.name} image`}
                    />
                  ) : (
                    <View style={styles.trendingImagePlaceholder}>
                      <Ionicons name="image-outline" size={40} color={Colors.text.light} />
                    </View>
                  )}
                  <Text style={styles.trendingName} numberOfLines={1}>
                    {spot.name}
                  </Text>
                  <Text style={styles.trendingAddress} numberOfLines={1}>
                    {spot.address}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Recent Searches card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            {recentSearches.length === 0 ? (
              <Text style={styles.emptyText}>Recent searches will appear here</Text>
            ) : (
              <View>
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentSearchItem}
                    onPress={() => setSearchQuery(search)}
                    accessibilityLabel={`Search for ${search}`}
                    accessibilityRole="button"
                  >
                    <Ionicons name="time-outline" size={16} color={Colors.text.secondary} />
                    <Text style={styles.recentSearchText}>{search}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Nearby Places card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Nearby Places</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {nearbyPlaces.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  style={styles.nearbyItem}
                  onPress={() =>
                    navigation.navigate('PlaceDetail' as never, { place } as never)
                  }
                  accessibilityLabel={`${place.name}, ${place.address}`}
                  accessibilityRole="button"
                >
                  <View style={styles.nearbyIconCircle}>
                    <Ionicons name="location" size={20} color={Colors.accent} />
                  </View>
                  <Text style={styles.nearbyName} numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text style={styles.nearbyAddress} numberOfLines={1}>
                    {place.address}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scroll: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 21,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 11,
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    fontSize: 13,
    fontFamily: 'Poppins',
    color: Colors.white,
  },
  mainSection: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 44,
    borderTopRightRadius: 44,
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl + 80,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  quickCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 27,
    paddingVertical: Theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 63,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickCardText: {
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: '600',
    color: Colors.primary,
    marginTop: Theme.spacing.xs,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Theme.spacing.md,
  },
  horizontalScroll: {
    paddingRight: Theme.spacing.sm,
  },
  trendingItem: {
    width: 100,
    marginRight: Theme.spacing.md,
    alignItems: 'center',
  },
  trendingImage: {
    width: 100,
    height: 84,
    borderRadius: 16,
    marginBottom: Theme.spacing.xs,
  },
  trendingImagePlaceholder: {
    width: 100,
    height: 84,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xs,
  },
  trendingName: {
    fontSize: 12,
    fontFamily: 'Poppins',
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
    marginTop: Theme.spacing.xs,
  },
  trendingAddress: {
    fontSize: 9,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 9,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingVertical: Theme.spacing.md,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
  },
  recentSearchText: {
    fontSize: 14,
    fontFamily: 'Poppins',
    color: Colors.text.primary,
    marginLeft: Theme.spacing.sm,
  },
  nearbyItem: {
    width: 107,
    marginRight: Theme.spacing.md,
    alignItems: 'center',
  },
  nearbyIconCircle: {
    width: 43,
    height: 43,
    borderRadius: 21.5,
    backgroundColor: '#E9E9E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xs,
  },
  nearbyName: {
    fontSize: 12,
    fontFamily: 'Poppins',
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
    marginTop: Theme.spacing.xs,
  },
  nearbyAddress: {
    fontSize: 9,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 2,
  },
});

export default HomeScreen;
