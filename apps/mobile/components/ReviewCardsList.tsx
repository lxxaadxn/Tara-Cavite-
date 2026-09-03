import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Pressable } from 'react-native';
import { JamIcon } from './JamIcon';
import { getPreviewReviewEntries } from '../lib/ntdpDisplayLabels';
import type { PlaceReview } from '../lib/placeReviews';

const GREEN = '#10A37F';
const TITLE = '#241D13';
const MUTED = '#868686';
const WHITE = '#FFFFFF';
const STAR_FULL = '#FFC012';
const STAR_EMPTY = '#E5E5E5';
const AVATAR_BG = '#6B6B6B';
const CARD_BORDER = 'rgba(122, 120, 120, 0.18)';

export type ReviewCardItem = {
  id: string;
  username: string;
  rating: number;
  metaLine: string;
  body: string;
  photoUrls: string[];
};

function buildMockReviews(placeName: string, ntdpCategory?: string | null): ReviewCardItem[] {
  const entries = getPreviewReviewEntries(placeName, ntdpCategory);
  return entries.map((e, i) => ({
    id: `r${i + 1}`,
    username: e.name,
    rating: e.rating,
    metaLine: i === 0 ? 'Sample · reviews coming soon' : 'Sample · not from guests',
    body: e.text,
    photoUrls: [],
  }));
}

function formatReviewMeta(at: number): string {
  try {
    return new Date(at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Guest review';
  }
}

export function mapPlaceReviewsToCards(reviews: PlaceReview[]): ReviewCardItem[] {
  return reviews.map((r) => ({
    id: r.id,
    username: r.nickname,
    rating: r.rating,
    metaLine: formatReviewMeta(r.at),
    body: r.text,
    photoUrls: Array.isArray(r.photoUrls) ? r.photoUrls : [],
  }));
}

export type ReviewCardsListProps = {
  placeName?: string;
  ntdpCategory?: string | null;
  reviews?: PlaceReview[] | null;
  emptyAsSamples?: boolean;
};

export function ReviewCardsList({
  placeName = 'This place',
  ntdpCategory,
  reviews,
  emptyAsSamples = false,
}: ReviewCardsListProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [viewer, setViewer] = useState<{ images: string[]; index: number } | null>(null);
  const cards = useMemo(() => {
    if (reviews && reviews.length > 0) return mapPlaceReviewsToCards(reviews);
    if (emptyAsSamples) return buildMockReviews(placeName, ntdpCategory);
    return [];
  }, [reviews, placeName, ntdpCategory, emptyAsSamples]);

  if (cards.length === 0) {
    return (
      <Text style={styles.emptyHint}>No reviews yet. Be the first to share your visit.</Text>
    );
  }

  return (
    <View style={styles.reviewsList}>
      {cards.map((rev) => {
        const isOpen = !!expanded[rev.id];
        return (
          <View key={rev.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewAvatar} accessibilityLabel="Reviewer avatar">
                <JamIcon ionicon="person" size={22} color={WHITE} />
              </View>
              <View style={styles.reviewHeaderMain}>
                <Text style={styles.reviewUsername}>{rev.username}</Text>
                <View style={styles.reviewStarsRow}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Text
                      key={i}
                      style={[styles.reviewStarGlyph, { color: i <= rev.rating ? STAR_FULL : STAR_EMPTY }]}
                    >
                      ★
                    </Text>
                  ))}
                  <Text style={styles.reviewMeta}> {rev.metaLine}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.reviewBody} numberOfLines={isOpen ? undefined : 5}>
              {rev.body}
            </Text>
            {rev.photoUrls.length > 0 ? (
              <View style={styles.photoRow}>
                {rev.photoUrls.map((url, photoIndex) => (
                  <TouchableOpacity
                    key={`${rev.id}-${url}`}
                    onPress={() => setViewer({ images: rev.photoUrls, index: photoIndex })}
                    accessibilityRole="button"
                    accessibilityLabel="Open review photo"
                  >
                    <Image source={{ uri: url }} style={styles.photoThumb} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            <TouchableOpacity
              onPress={() => setExpanded((prev) => ({ ...prev, [rev.id]: !prev[rev.id] }))}
              accessibilityRole="button"
              accessibilityLabel={isOpen ? 'Show less review text' : 'Show more review text'}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={styles.reviewSeeMore}>{isOpen ? 'See less' : 'See more'}</Text>
            </TouchableOpacity>
          </View>
        );
      })}
      <Modal visible={Boolean(viewer)} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewer(null)}>
          {viewer?.images[viewer.index] ? (
            <Image source={{ uri: viewer.images[viewer.index] }} style={styles.viewerImage} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  reviewsList: {
    gap: 14,
  },
  emptyHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  reviewCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  reviewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AVATAR_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  reviewHeaderMain: {
    flex: 1,
    minWidth: 0,
  },
  reviewUsername: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: TITLE,
    marginBottom: 6,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  reviewStarGlyph: {
    fontSize: 15,
    lineHeight: 18,
    marginRight: 2,
    includeFontPadding: false,
  },
  reviewMeta: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
    flexShrink: 1,
  },
  reviewBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 24,
    color: TITLE,
    marginBottom: 10,
  },
  reviewSeeMore: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    lineHeight: 22,
    color: GREEN,
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#F3F3F3',
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  viewerImage: {
    width: '100%',
    height: '80%',
  },
});
