import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { submitPlaceReview, type PlaceReview } from '../lib/placeReviews';
import { supabase } from '../lib/supabase';

const OLIVE = '#7EA00E';
const TEAL = '#1F4F59';
const TITLE = '#241D13';
const MUTED = '#868686';
const WHITE = '#FFFFFF';
const STAR_ON = '#F4C430';
const STAR_OFF = '#F4E2A1';
const BORDER = 'rgba(122, 120, 120, 0.18)';

type Props = {
  placeId: string;
  placeName?: string;
  signedIn: boolean;
  defaultNickname?: string;
  onSubmitted: (review: PlaceReview) => void;
};

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.starsRow} accessibilityRole="adjustable" accessibilityLabel="Your rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onChange(star)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`${star} star${star === 1 ? '' : 's'}`}
          accessibilityState={{ selected: value === star }}
          hitSlop={6}
        >
          <Text style={[styles.starGlyph, { color: star <= value ? STAR_ON : STAR_OFF }]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function PlaceReviewForm({
  placeId,
  placeName,
  signedIn,
  defaultNickname = '',
  onSubmitted,
}: Props) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [nickname, setNickname] = useState(defaultNickname);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setNickname(defaultNickname || '');
  }, [defaultNickname, placeId]);

  useEffect(() => {
    setRating(5);
    setBody('');
  }, [placeId]);

  const handleSubmit = useCallback(async () => {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      Alert.alert('Review', 'Please write a short comment about your visit.');
      return;
    }

    setSubmitting(true);
    try {
      if (signedIn) {
        const saved = await submitPlaceReview(supabase, {
          placeId,
          rating,
          body: trimmedBody,
        });
        onSubmitted(saved);
        setBody('');
        Alert.alert('Thank you', 'Your review was posted.');
      } else {
        const nick = String(nickname ?? '').trim() || 'Guest';
        const review: PlaceReview = {
          id: `session-${Date.now()}`,
          nickname: nick,
          rating,
          text: trimmedBody,
          at: Date.now(),
        };
        onSubmitted(review);
        setBody('');
        Alert.alert(
          'Thank you',
          'Your review is saved on this device for now. Sign in to save it to your account.'
        );
      }
    } catch (err) {
      Alert.alert('Review', err instanceof Error ? err.message : 'Could not post your review.');
    } finally {
      setSubmitting(false);
    }
  }, [body, nickname, onSubmitted, placeId, rating, signedIn]);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Write a review</Text>
      <Text style={styles.hint}>
        {signedIn
          ? `Share your experience at ${placeName || 'this place'}.`
          : 'Post as a guest on this device, or sign in to save your review to your account.'}
      </Text>

      <Text style={styles.label}>Your rating</Text>
      <StarPicker value={rating} onChange={setRating} disabled={submitting} />

      {!signedIn ? (
        <>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="Your name"
            placeholderTextColor={MUTED}
            maxLength={80}
            editable={!submitting}
          />
        </>
      ) : null}

      <Text style={styles.label}>Your review</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={body}
        onChangeText={setBody}
        placeholder="What stood out during your visit?"
        placeholderTextColor={MUTED}
        multiline
        maxLength={4000}
        textAlignVertical="top"
        editable={!submitting}
      />

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitDisabled]}
        onPress={() => void handleSubmit()}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel="Post review"
      >
        {submitting ? (
          <ActivityIndicator color={WHITE} />
        ) : (
          <Text style={styles.submitLabel}>Post review</Text>
        )}
      </TouchableOpacity>

      {!signedIn ? (
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Sign in',
              'Sign in to your Tara, Cavite! account to save reviews permanently across devices.'
            );
          }}
          style={styles.signInLink}
          accessibilityRole="button"
          accessibilityLabel="Sign in to save permanently"
        >
          <Text style={styles.signInLinkText}>Sign in to save permanently</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
  },
  eyebrow: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: MUTED,
  },
  hint: {
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  label: {
    marginTop: 14,
    marginBottom: 8,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: TITLE,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starGlyph: {
    fontSize: 30,
    lineHeight: 34,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: TITLE,
    backgroundColor: WHITE,
  },
  textarea: {
    minHeight: 110,
    paddingTop: 12,
  },
  submitBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 12,
    backgroundColor: OLIVE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    opacity: 0.65,
  },
  submitLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: WHITE,
  },
  signInLink: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  signInLinkText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: TEAL,
  },
});
