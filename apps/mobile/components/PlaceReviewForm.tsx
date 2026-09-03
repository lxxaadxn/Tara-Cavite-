import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MAX_REVIEW_PHOTOS, submitPlaceReview, type PlaceReview, type ReviewPhotoUpload } from '../lib/placeReviews';
import { supabase } from '../lib/supabase';

const OLIVE = '#10A37F';
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
  onSignIn?: () => void;
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
  onSubmitted,
  onSignIn,
}: Props) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<ReviewPhotoUpload[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRating(5);
    setBody('');
    setPhotos([]);
  }, [placeId]);

  const pickPhotos = useCallback(async () => {
    const remaining = MAX_REVIEW_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to attach visit pictures.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled) return;
    const next = (result.assets ?? []).slice(0, remaining).map((asset) => ({
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
    }));
    setPhotos((prev) => [...prev, ...next].slice(0, MAX_REVIEW_PHOTOS));
  }, [photos.length]);

  const handleSubmit = useCallback(async () => {
    if (!signedIn) {
      onSignIn?.();
      return;
    }

    const trimmedBody = body.trim();
    if (!trimmedBody) {
      Alert.alert('Review', 'Please write a short comment about your visit.');
      return;
    }

    setSubmitting(true);
    try {
      const saved = await submitPlaceReview(supabase, {
        placeId,
        rating,
        body: trimmedBody,
        photos,
      });
      onSubmitted(saved);
      setBody('');
      setPhotos([]);
      Alert.alert('Thank you', 'Your review was posted.');
    } catch (err) {
      Alert.alert('Review', err instanceof Error ? err.message : 'Could not post your review.');
    } finally {
      setSubmitting(false);
    }
  }, [body, onSignIn, onSubmitted, photos, placeId, rating, signedIn]);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Write a review</Text>
      <Text style={styles.hint}>
        {signedIn
          ? `Share your experience at ${placeName || 'this place'}.`
          : 'Sign in to post a review that other visitors can read.'}
      </Text>

      {signedIn ? (
        <>
          <Text style={styles.label}>Your rating</Text>
          <StarPicker value={rating} onChange={setRating} disabled={submitting} />

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

          <Text style={styles.label}>Photos (optional)</Text>
          <Text style={styles.photoHint}>Up to {MAX_REVIEW_PHOTOS} photos from your visit.</Text>
          {photos.length > 0 ? (
            <View style={styles.photoRow}>
              {photos.map((photo, index) => (
                <View key={`${photo.uri}-${index}`} style={styles.photoWrap}>
                  <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                    accessibilityRole="button"
                    accessibilityLabel="Remove photo"
                    disabled={submitting}
                  >
                    <Text style={styles.photoRemoveLabel}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
          {photos.length < MAX_REVIEW_PHOTOS ? (
            <TouchableOpacity
              style={styles.addPhotoBtn}
              onPress={() => void pickPhotos()}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Add photos"
            >
              <Text style={styles.addPhotoLabel}>Add photos</Text>
            </TouchableOpacity>
          ) : null}

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
        </>
      ) : (
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={() => onSignIn?.()}
          accessibilityRole="button"
          accessibilityLabel="Sign in to post a review"
        >
          <Text style={styles.submitLabel}>Sign in to post a review</Text>
        </TouchableOpacity>
      )}
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
  photoHint: {
    marginTop: -4,
    marginBottom: 8,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: MUTED,
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  photoWrap: {
    width: 64,
    height: 64,
  },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#F3F3F3',
  },
  photoRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveLabel: {
    color: WHITE,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  addPhotoBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addPhotoLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: TITLE,
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
});
