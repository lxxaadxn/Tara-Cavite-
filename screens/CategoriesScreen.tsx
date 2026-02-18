import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../constants/theme';
import { Header } from '../components/Header';

interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

const categories: Category[] = [
  { id: '1', name: 'Historical Sites', icon: 'library', count: 12 },
  { id: '2', name: 'Parks & Nature', icon: 'leaf', count: 8 },
  { id: '3', name: 'Museums', icon: 'library-outline', count: 5 },
  { id: '4', name: 'Beaches', icon: 'water', count: 6 },
  { id: '5', name: 'Restaurants', icon: 'restaurant', count: 15 },
  { id: '6', name: 'Shopping', icon: 'bag', count: 10 },
  { id: '7', name: 'Cafes', icon: 'cafe', count: 9 },
  { id: '8', name: 'Churches', icon: 'business', count: 7 },
  { id: '9', name: 'Entertainment', icon: 'musical-notes', count: 4 },
  { id: '10', name: 'Hotels', icon: 'bed', count: 11 },
];

const CategoriesScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleCategoryPress = (category: Category) => {
    // Navigate to filtered places by category
    navigation.navigate('PlaceDetail' as never, { category: category.name } as never);
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => handleCategoryPress(item)}
      activeOpacity={0.7}
      accessibilityLabel={`${item.name}, ${item.count} places`}
      accessibilityRole="button"
    >
      <View style={styles.categoryIconContainer}>
        <Ionicons name={item.icon as any} size={32} color={Colors.primary} />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
      <Text style={styles.categoryCount}>{item.count} places</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Categories"
        showBack
        showNotification
        darkBackground
        onNotificationPress={() => navigation.navigate('Notifications' as never)}
      />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mainSection}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          <Text style={styles.sectionSubtitle}>
            Explore tourist destinations organized by type
          </Text>
          
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.categoriesGrid}
            columnWrapperStyle={styles.categoryRow}
          />
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
  content: {
    flex: 1,
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
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Poppins',
    fontWeight: '700',
    color: Colors.white,
    marginBottom: Theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins',
    fontWeight: '400',
    color: Colors.white,
    opacity: 0.9,
    marginBottom: Theme.spacing.lg,
  },
  categoriesGrid: {
    paddingBottom: Theme.spacing.md,
  },
  categoryRow: {
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Theme.spacing.md,
    alignItems: 'center',
    marginHorizontal: Theme.spacing.xs,
    minHeight: 140,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.sm,
  },
  categoryName: {
    fontSize: 14,
    fontFamily: 'Poppins',
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  categoryCount: {
    fontSize: 12,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});

export default CategoriesScreen;
