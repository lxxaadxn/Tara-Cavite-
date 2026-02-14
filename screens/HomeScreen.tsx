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
import { nearbyPlaces } from '../data/mockData';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title=""
        showLogo
        onMenuPress={() => {}}
      />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Search bar - dark teal */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.text.light} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where are you going?"
            placeholderTextColor={Colors.text.light}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Ionicons name="location" size={20} color={Colors.text.light} />
        </View>

        {/* Main content - dark teal background */}
        <View style={styles.mainSection}>
          {/* Terminals & Fare guide cards */}
          <View style={styles.cardsRow}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation.navigate('Terminals' as never)}
              activeOpacity={0.8}
            >
              <Ionicons name="bus" size={40} color={Colors.primary} />
              <Text style={styles.quickCardText}>Terminals</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => {}}
              activeOpacity={0.8}
            >
              <Ionicons name="cash-outline" size={40} color={Colors.primary} />
              <Text style={styles.quickCardText}>Fare guide</Text>
            </TouchableOpacity>
          </View>

          {/* Nearby Places card */}
          <View style={styles.nearbyCard}>
            <Text style={styles.nearbyTitle}>Nearby Places</Text>
            {nearbyPlaces.map((place) => (
              <TouchableOpacity
                key={place.id}
                style={styles.placeRow}
                onPress={() =>
                  navigation.navigate('PlaceDetail' as never, { place } as never)
                }
              >
                <Ionicons name="location" size={20} color={Colors.accent} />
                <View style={styles.placeTextWrap}>
                  <Text style={styles.placeName} numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text style={styles.placeAddress} numberOfLines={1}>
                    {place.address}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm + 4,
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    fontSize: 16,
    color: Colors.white,
  },
  mainSection: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: Theme.borderRadius.lg,
    borderTopRightRadius: Theme.borderRadius.lg,
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
    backgroundColor: Colors.background,
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.card,
  },
  quickCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: Theme.spacing.sm,
  },
  nearbyCard: {
    backgroundColor: Colors.background,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    ...Theme.shadows.card,
  },
  nearbyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Theme.spacing.md,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.text.light + '40',
  },
  placeTextWrap: {
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  placeAddress: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
});

export default HomeScreen;
