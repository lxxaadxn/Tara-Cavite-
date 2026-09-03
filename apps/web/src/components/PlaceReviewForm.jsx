import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { submitPlaceReview, MAX_REVIEW_PHOTOS } from '../lib/placeReviews';

const olive = '#10A37F';

function ReviewStarPicker({ value, onChange, disabled }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Your rating"
      onMouseLeave={() => setHover(0)}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const star = i + 1;
        const active = star <= display;
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onMouseEnter={() => setHover(star)}
            onClick={() => onChange(star)}
            className="rounded p-0.5 transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10A37F] focus-visible:ring-offset-1 disabled:opacity-50"
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
            aria-pressed={value === star}
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 20 20"
              fill="currentColor"
              style={{ color: active ? '#f4c430' : '#f4e2a1' }}
              aria-hidden
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.155 3.555a1 1 0 00.95.69h3.74c.969 0 1.371 1.24.588 1.81l-3.027 2.2a1 1 0 00-.364 1.118l1.156 3.555c.3.922-.755 1.688-1.539 1.118l-3.027-2.2a1 1 0 00-1.176 0l-3.027 2.2c-.783.57-1.838-.196-1.539-1.118l1.156-3.555a1 1 0 00-.364-1.118l-3.027-2.2c-.783-.57-.38-1.81.588-1.81h3.74a1 1 0 00.95-.69l1.155-3.555z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {string} props.placeId
 * @param {string} [props.placeName]
 * @param {boolean} props.signedIn
 * @param {string | null} [props.defaultNickname]
 * @param {boolean} [props.plain]
 * @param {(review: { id: string, nickname: string, rating: number, text: string, at: number }) => void} props.onSubmitted
 */
export function PlaceReviewForm({ placeId, placeName, signedIn, onSubmitted, plain = false }) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setRating(5);
    setBody('');
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.preview));
      return [];
    });
    setError('');
    setSuccess('');
  }, [placeId]);

  const handlePhotosChange = useCallback((e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length) return;
    setPhotos((prev) => {
      const room = Math.max(0, MAX_REVIEW_PHOTOS - prev.length);
      const next = files.slice(0, room).map((file) => ({ file, preview: URL.createObjectURL(file) }));
      return [...prev, ...next];
    });
  }, []);

  const removePhoto = useCallback((index) => {
    setPhotos((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return copy;
    });
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');
      setSuccess('');

      if (!signedIn) {
        setError('Sign in to leave a review.');
        return;
      }

      const trimmedBody = body.trim();
      if (!trimmedBody) {
        setError('Please write a short comment about your visit.');
        return;
      }

      setSubmitting(true);
      try {
        const saved = await submitPlaceReview(supabase, {
          placeId,
          rating,
          body: trimmedBody,
          photos: photos.map((p) => p.file),
        });
        onSubmitted(saved);
        setBody('');
        setPhotos((prev) => {
          prev.forEach((p) => URL.revokeObjectURL(p.preview));
          return [];
        });
        setSuccess('Thanks — your review was posted.');
      } catch (err) {
        setError(err?.message || 'Could not post your review. Try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [body, onSubmitted, photos, placeId, rating, signedIn]
  );

  const loginReturn = encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/search');

  return (
    <form
      onSubmit={handleSubmit}
      className={plain ? '' : 'overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5'}
    >
      {plain ? null : (
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Write a review</p>
      )}
      <p className={`${plain ? '' : 'mt-1 '}text-sm text-neutral-600`}>
        {signedIn
          ? `Share your experience at ${placeName || 'this place'}.`
          : 'Sign in to post a review that other visitors can read.'}
      </p>

      <div className="mt-3 flex items-center gap-2.5">
        <p className="shrink-0 text-sm font-medium text-neutral-700">Rating</p>
        <ReviewStarPicker value={rating} onChange={setRating} disabled={submitting || !signedIn} />
      </div>

      <label className="mt-3 block">
        <span className="sr-only">Your review</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="What stood out during your visit?"
          className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm leading-relaxed outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(16, 163, 127,0.22)]"
          disabled={submitting || !signedIn}
        />
      </label>

      <div className="mt-3">
        <p className="text-sm font-medium text-neutral-700">Photos (optional)</p>
        <p className="mt-0.5 text-xs text-neutral-500">Up to {MAX_REVIEW_PHOTOS} photos from your visit.</p>
        {photos.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {photos.map((p, index) => (
              <div key={p.preview} className="relative h-16 w-16 overflow-hidden rounded-lg border border-neutral-200">
                <img src={p.preview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-[10px] font-semibold text-white"
                  aria-label="Remove photo"
                  disabled={submitting}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {photos.length < MAX_REVIEW_PHOTOS && signedIn ? (
          <label className="mt-2 inline-flex cursor-pointer items-center rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Add photos
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              disabled={submitting || !signedIn}
              onChange={handlePhotosChange}
            />
          </label>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-2 text-sm font-medium text-emerald-700">{success}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting || !signedIn}
          className="rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
          style={{ backgroundColor: olive }}
        >
          {submitting ? 'Posting…' : 'Post review'}
        </button>
        {!signedIn ? (
          <Link
            to={`/login?next=${loginReturn}`}
            className="text-sm font-semibold text-[#1B8A70] hover:underline"
          >
            Sign in to post a review
          </Link>
        ) : null}
      </div>
    </form>
  );
}
