import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import type { EnrichedItinerary } from '../lib/itineraryPlaces';
import { itineraryCardChips, itineraryGalleryUrls } from '../lib/itineraryPlaces';
import { placeImageSource } from '../lib/placeImageSource';
import type { PublishedItinerary } from '../data/publishedItineraries';

type Props = {
  itinerary: PublishedItinerary | EnrichedItinerary;
  onPress: () => void;
};

const TAG_PALETTE = [
  { bg: 'rgba(16, 163, 127, 0.16)', text: Colors.cta },
  { bg: 'rgba(27, 138, 112, 0.16)', text: Colors.primary },
  { bg: 'rgba(22, 143, 122, 0.16)', text: Colors.primaryLight },
];

export function ItineraryProductCard({ itinerary, onPress }: Props) {
  const coverUrl = itineraryGalleryUrls(itinerary)[0] || null;
  const cover = coverUrl ? placeImageSource(coverUrl) : undefined;
  const chips = itineraryCardChips(itinerary).slice(0, 3);
  const route = String(itinerary?.route || itinerary?.subtitle || '').trim();

  return (
    <View style={styles.card}>
      <View style={styles.cover}>
        {cover ? (
          <Image source={cover} style={styles.coverImage} resizeMode="cover" accessibilityLabel="" />
        ) : (
          <View style={styles.coverImage} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(22,53,46,0.32)']}
          style={styles.coverFade}
          pointerEvents="none"
        />
      </View>

      <TouchableOpacity
        style={styles.body}
        onPress={onPress}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel={`View route ${itinerary.title}`}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {itinerary.title}
          </Text>
          {itinerary.durationLabel ? (
            <View style={styles.durationPill}>
              <Text style={styles.durationText}>{itinerary.durationLabel}</Text>
            </View>
          ) : null}
        </View>

        {route ? (
          <Text style={styles.route} numberOfLines={1}>
            {route}
          </Text>
        ) : null}

        {chips.length > 0 ? (
          <View style={styles.chips}>
            {chips.map((chip, i) => {
              const palette = TAG_PALETTE[i % TAG_PALETTE.length];
              return (
                <View key={chip} style={[styles.chip, { backgroundColor: palette.bg }]}>
                  <Text style={[styles.chipText, { color: palette.text }]}>{chip}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.cta}>
          <Text style={styles.ctaLabel}>View route</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card.background,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(22, 53, 46, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: Colors.primary,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primary,
  },
  coverFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 14,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    flex: 1,
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: Colors.text.primary,
  },
  durationPill: {
    backgroundColor: 'rgba(16, 163, 127, 0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(16, 163, 127, 0.28)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  durationText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.cta,
  },
  route: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    lineHeight: 19,
    color: Colors.text.primary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  cta: {
    marginTop: 2,
    backgroundColor: Colors.cta,
    borderRadius: 999,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: Colors.white,
  },
});
