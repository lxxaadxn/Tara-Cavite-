import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import { DirectionsMapView } from '../components/DirectionsMapView';
import type { DirectionsMapPayload } from '../lib/directionsMapBridge';

const GREEN = '#10A37F';
const TITLE = '#241D13';
const WHITE = '#FFFFFF';
const PAGE_BG = '#F5F5F6';

export type MapCommuteDetailParams = {
  destinationName: string;
  detailSteps: string[];
  destLat: number;
  destLng: number;
  userLat?: number | null;
  userLng?: number | null;
};

/**
 * Full “step-by-step” commuter view from the map flow (green header, map strip, numbered steps).
 */
export default function MapCommuteDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const p = route.params as MapCommuteDetailParams | undefined;

  const mapPayload: DirectionsMapPayload = useMemo(
    () => ({
      userLat: p?.userLat ?? null,
      userLng: p?.userLng ?? null,
      destLat: p?.destLat ?? 14.32,
      destLng: p?.destLng ?? 120.94,
      routeGeoJson: null,
    }),
    [p]
  );

  if (!p) {
    return (
      <View style={[styles.fallback, { paddingTop: insets.top }]}>
        <Text style={styles.fallbackText}>Missing route details.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.fallbackLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <JamIcon ionicon="chevron-back" size={26} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Directions
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mapPreview}>
          <DirectionsMapView payload={mapPayload} style={styles.mapInner} />
        </View>

        <Text style={styles.sectionKicker}>Step-by-step</Text>

        <View style={styles.stepsCard}>
          {p.detailSteps.map((line, i) => (
            <View key={`step-${i}`} style={styles.stepRow}>
              <Text style={styles.stepNum}>{i + 1}</Text>
              <Text style={styles.stepBody}>{line}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back to directions"
        >
          <Text style={styles.primaryBtnLabel}>Back to directions</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: PAGE_BG,
  },
  fallbackText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: TITLE,
    marginBottom: 12,
  },
  fallbackLink: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: GREEN,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GREEN,
    paddingBottom: 12,
    paddingHorizontal: 4,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 18,
    color: WHITE,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  mapPreview: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 200,
    marginBottom: 20,
    backgroundColor: '#dfe6e9',
  },
  mapInner: {
    flex: 1,
    borderRadius: 16,
    minHeight: 200,
  },
  sectionKicker: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: GREEN,
    marginBottom: 12,
  },
  stepsCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(122, 120, 120, 0.2)',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(122, 120, 120, 0.2)',
  },
  stepNum: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: GREEN,
    width: 24,
    lineHeight: 22,
  },
  stepBody: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: TITLE,
  },
  primaryBtn: {
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 17,
    color: WHITE,
  },
});
