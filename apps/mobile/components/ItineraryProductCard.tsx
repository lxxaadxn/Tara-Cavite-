import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { Colors } from '../constants/Colors';
import type { EnrichedItinerary } from '../lib/itineraryPlaces';
import { itineraryCardChips, itineraryGalleryUrls } from '../lib/itineraryPlaces';
import { placeImageSource } from '../lib/placeImageSource';
import type { PublishedItinerary } from '../data/publishedItineraries';

type Props = {
  itinerary: PublishedItinerary | EnrichedItinerary;
  onPress: () => void;
};

export function ItineraryProductCard({ itinerary, onPress }: Props) {
  const images = itineraryGalleryUrls(itinerary);
  const chips = itineraryCardChips(itinerary);
  const slides = images.length > 0 ? images : [null];
  const [index, setIndex] = useState(0);
  const [carouselW, setCarouselW] = useState(0);
  const [carouselH, setCarouselH] = useState(0);

  const onCarouselLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCarouselW(Math.round(width));
    setCarouselH(Math.round(height));
  };

  const onCarouselScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!carouselW) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / carouselW);
    setIndex(next);
  };

  return (
    <View style={styles.card}>
      <View style={styles.carousel} onLayout={onCarouselLayout}>
        {carouselW > 0 && carouselH > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onCarouselScroll}
            onScroll={onCarouselScroll}
            scrollEventThrottle={16}
          >
            {slides.map((src, i) => {
              const img = src ? placeImageSource(src) : undefined;
              return (
                <View key={src || `empty-${i}`} style={{ width: carouselW, height: carouselH }}>
                  {img ? (
                    <Image source={img} style={styles.slideImage} resizeMode="cover" accessibilityLabel="" />
                  ) : (
                    <View style={styles.slideImage} />
                  )}
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.slideImage} />
        )}
        {images.length > 1 ? (
          <View style={styles.dots} pointerEvents="none">
            {images.map((_, i) => (
              <View key={`dot-${i}`} style={i === index ? styles.dotActive : styles.dot} />
            ))}
          </View>
        ) : null}
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
        {itinerary.summary ? (
          <Text style={styles.summary} numberOfLines={2}>
            {itinerary.summary}
          </Text>
        ) : null}
        {chips.length > 0 ? (
          <View style={styles.chips}>
            {chips.map((chip) => (
              <View key={chip} style={styles.chip}>
                <Text style={styles.chipText}>{chip}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.cta}>
          <Text style={styles.ctaLabel}>View route</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const PALE_GREEN = 'rgba(16, 163, 127, 0.16)';

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card.background,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  carousel: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: Colors.primary,
  },
  slideImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primary,
  },
  dots: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(241, 247, 246, 0.45)',
  },
  dotActive: {
    width: 16,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.background,
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.text.primary,
  },
  durationPill: {
    backgroundColor: 'rgba(16, 163, 127, 0.18)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  durationText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.cta,
  },
  summary: {
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: Colors.text.primary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  chip: {
    backgroundColor: PALE_GREEN,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: Colors.text.light,
  },
  cta: {
    marginTop: 12,
    backgroundColor: Colors.cta,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: Colors.white,
  },
});
