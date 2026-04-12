import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { JamIcon } from './JamIcon';

const GREEN = '#7EA00E';
const TITLE = '#241D13';
const MUTED = '#868686';
const WHITE = '#FFFFFF';
const STAR_FULL = '#FFC012';
const STAR_EMPTY = '#E5E5E5';
const AVATAR_BG = '#6B6B6B';
const CARD_BORDER = 'rgba(122, 120, 120, 0.18)';

const REVIEW_PLACEHOLDER_BODY =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Nunc vitae turpis sed ipsum ultricies sagittis vel sit amet neque.';

export type MockReview = {
  id: string;
  username: string;
  rating: number;
  metaLine: string;
  body: string;
};

export const MOCK_REVIEWS: MockReview[] = [
  {
    id: 'r1',
    username: 'Username',
    rating: 4,
    metaLine: 'Ratings 4.5 | 1.3k votes',
    body: REVIEW_PLACEHOLDER_BODY,
  },
  {
    id: 'r2',
    username: 'Username',
    rating: 4,
    metaLine: 'Ratings 4.5 | 1.3k votes',
    body: REVIEW_PLACEHOLDER_BODY,
  },
];

export function ReviewCardsList() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <View style={styles.reviewsList}>
      {MOCK_REVIEWS.map((rev) => {
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
    </View>
  );
}

const styles = StyleSheet.create({
  reviewsList: {
    gap: 14,
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
});
