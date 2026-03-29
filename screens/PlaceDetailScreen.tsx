import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import { Colors, Theme } from '../constants/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Place } from '../data/mockData';
import { parsePlaceCoords } from '../lib/placeCoords';

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

          {/* Place Image */}
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

          {/* Details */}
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
  },
  buttonContainer: {
    marginTop: Theme.spacing.md,
  },
});

export default PlaceDetailScreen;
