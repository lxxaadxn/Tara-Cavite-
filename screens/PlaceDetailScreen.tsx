import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../constants/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Place } from '../data/mockData';

const PlaceDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const place = (route.params as any)?.place as Place || {
    id: '1',
    name: 'Tagaytay Picnic Grove',
    address: 'Tagaytay City, Cavite',
    type: 'Tourist Spot',
    hours: 'Open 24 hours',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title=""
        showBack
        showNotification
        onNotificationPress={() => navigation.navigate('Notifications' as never)}
      />
      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.title}>{place.name}</Text>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <View style={styles.actionItem}>
              <Ionicons name="navigate" size={24} color={Colors.primary} />
              <Text style={styles.actionText}>Directions</Text>
            </View>
            <View style={styles.actionItem}>
              <Ionicons name="bookmark-outline" size={24} color={Colors.primary} />
              <Text style={styles.actionText}>Save</Text>
            </View>
            <View style={styles.actionItem}>
              <Ionicons name="location-outline" size={24} color={Colors.primary} />
              <Text style={styles.actionText}>Nearby</Text>
            </View>
            <View style={styles.actionItem}>
              <Ionicons name="share-outline" size={24} color={Colors.primary} />
              <Text style={styles.actionText}>Share</Text>
            </View>
          </View>

          {/* Image Placeholder */}
          <View style={styles.imageContainer}>
            <Ionicons name="image" size={48} color={Colors.text.light} />
            <Text style={styles.imagePlaceholder}>Place Image</Text>
          </View>

          {/* Details */}
          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <Text style={styles.detailText}>{place.address}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="business" size={20} color={Colors.primary} />
              <Text style={styles.detailText}>{place.type}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time" size={20} color={Colors.primary} />
              <Text style={styles.detailText}>{place.hours}</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="GET DIRECTIONS"
              onPress={() =>
                navigation.navigate('Directions' as never, { place } as never)
              }
            />
          </View>
        </Card>
      </ScrollView>
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
  },
  buttonContainer: {
    marginTop: Theme.spacing.md,
  },
});

export default PlaceDetailScreen;
