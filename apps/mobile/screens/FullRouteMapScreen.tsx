import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import { DirectionsMapView } from '../components/DirectionsMapView';
import type { DirectionsMapPayload } from '../lib/directionsMapBridge';

const TEAL = '#1F4F59';
const ACCENT = '#7EA00E';
const TITLE = '#241D13';

export type FullRouteMapParams = {
  mapPayload: DirectionsMapPayload;
};

/**
 * Full-screen route map (Leaflet / OSM) with CaviTour wordmark — opened from establishment details.
 */
export default function FullRouteMapScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { mapPayload } = route.params as FullRouteMapParams;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <DirectionsMapView payload={mapPayload} style={styles.map} />
      <View style={[styles.overlay, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 8 }]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <View style={styles.backCircle}>
            <JamIcon ionicon="chevron-back" size={24} color={TITLE} />
          </View>
        </TouchableOpacity>
        <View style={styles.wordmarkBadge} accessibilityRole="header" accessibilityLabel="CaviTour">
          <Text style={styles.wmC}>C</Text>
          <Text style={styles.wmAvi}>avi</Text>
          <Text style={styles.wmTour}>Tour</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#dfe6e9',
  },
  map: {
    flex: 1,
    borderRadius: 0,
    minHeight: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  backBtn: {
    position: 'absolute',
    left: 12,
    zIndex: 2,
  },
  backCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  wordmarkBadge: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  wmC: {
    fontFamily: 'Pacifico_400Regular',
    fontSize: 22,
    color: ACCENT,
  },
  wmAvi: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 22,
    color: ACCENT,
  },
  wmTour: {
    fontFamily: 'Pacifico_400Regular',
    fontSize: 22,
    color: TEAL,
  },
});
