import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import type { Place } from '../data/mockData';
import { getMapPlacePreviewTags, type MapPreviewTagVariant } from '../lib/mapPlacePreviewTags';
import { sanitizeAddress } from '../lib/placeDisplayHelpers';
import { placeImageSource } from '../lib/placeImageSource';

const GREEN = '#10A37F';
const TEAL = '#1B8A70';
const TITLE = '#241D13';
const MUTED = '#7A7878';
const PLACEHOLDER_URI =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80';

const TAG_PILL: Record<MapPreviewTagVariant, { bg: string; text: string }> = {
  olive: { bg: 'rgba(16, 163, 127, 0.18)', text: GREEN },
  teal: { bg: 'rgba(27, 138, 112, 0.14)', text: TEAL },
  pale: { bg: 'rgba(16, 163, 127, 0.1)', text: '#5C7A0A' },
};

export type MapPlacePreviewCardProps = {
  place: Place;
  flipBelow?: boolean;
  onExplore: () => void;
  onDirections: () => void;
};

export function MapPlacePreviewCard({
  place,
  flipBelow = false,
  onExplore,
  onDirections,
}: MapPlacePreviewCardProps) {
  const tags = useMemo(() => getMapPlacePreviewTags(place), [place]);
  const address = useMemo(() => sanitizeAddress(place.address, place.name), [place.address, place.name]);
  const imageSource = placeImageSource(place.image) ?? { uri: PLACEHOLDER_URI };

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={place.name}
      style={[styles.wrap, flipBelow ? styles.wrapBelow : styles.wrapAbove]}
    >
      {flipBelow ? <View style={[styles.pointer, styles.pointerBelow]} /> : null}
      <View style={styles.card}>
        <Image source={imageSource} style={styles.thumb} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            {place.name}
          </Text>
          <Text style={styles.address} numberOfLines={2}>
            {address}
          </Text>
          {tags.length > 0 ? (
            <View style={styles.tagRow}>
              {tags.map((tag) => {
                const pill = TAG_PILL[tag.variant];
                return (
                  <View key={tag.label} style={[styles.tag, { backgroundColor: pill.bg }]}>
                    <Text style={[styles.tagText, { color: pill.text }]} numberOfLines={1}>
                      {tag.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={onExplore}
              accessibilityRole="button"
              accessibilityLabel={`Explore ${place.name}`}
            >
              <Text style={styles.exploreLabel}>Explore</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.directionsBtn}
              onPress={onDirections}
              accessibilityRole="button"
              accessibilityLabel={`Directions to ${place.name}`}
            >
              <Text style={styles.directionsLabel}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {!flipBelow ? <View style={[styles.pointer, styles.pointerAbove]} /> : null}
    </View>
  );
}

const CARD_WIDTH = 288;

const styles = StyleSheet.create({
  wrap: {
    width: CARD_WIDTH,
    alignItems: 'center',
  },
  wrapAbove: {
    marginTop: -8,
  },
  wrapBelow: {
    marginTop: 12,
  },
  card: {
    width: CARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(229, 229, 229, 0.8)',
    shadowColor: '#1B8A70',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#E8E8E8',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
    color: TITLE,
    marginBottom: 2,
  },
  address: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 15,
    color: MUTED,
    marginBottom: 6,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    maxWidth: '100%',
  },
  tagText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  exploreBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(27, 138, 112, 0.35)',
    alignItems: 'center',
  },
  exploreLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: TEAL,
  },
  directionsBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: GREEN,
    alignItems: 'center',
  },
  directionsLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  pointerAbove: {
    borderTopWidth: 8,
    borderTopColor: 'rgba(255, 255, 255, 0.95)',
    marginTop: -1,
  },
  pointerBelow: {
    borderBottomWidth: 8,
    borderBottomColor: 'rgba(255, 255, 255, 0.95)',
    marginBottom: -1,
  },
});
