import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { submitPlaceReview } from '../lib/placeReviews';

const olive = '#7ea00e';

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
            className="rounded p-0.5 transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7ea00e] focus-visible:ring-offset-1 disabled:opacity-50"
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
            aria-pressed={value === star}
          >
            <svg
              className="h-7 w-7 sm:h-8 sm:w-8"
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
 * @param {(review: { id: string, nickname: string, rating: number, text: string, at: number }) => void} props.onSubmitted
 */
export function PlaceReviewForm({ placeId, placeName, signedIn, defaultNickname = '', onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [nickname, setNickname] = useState(defaultNickname);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setNickname(defaultNickname || '');
  }, [defaultNickname, placeId]);

  useEffect(() => {
    setRating(5);
    setBody('');
    setError('');
    setSuccess('');
  }, [placeId]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');
      setSuccess('');

      const trimmedBody = body.trim();
      if (!trimmedBody) {
        setError('Please write a short comment about your visit.');
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
          setSuccess('Thanks — your review was posted.');
        } else {
          const nick = String(nickname ?? '').trim() || 'Guest';
          const review = {
            id: `session-${Date.now()}`,
            nickname: nick,
            rating,
            text: trimmedBody,
            at: Date.now(),
          };
          onSubmitted(review);
          setBody('');
          setSuccess('Thanks — your review is saved for this browser session.');
        }
      } catch (err) {
        setError(err?.message || 'Could not post your review. Try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [body, nickname, onSubmitted, placeId, rating, signedIn]
  );

  const loginReturn = encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/search');

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Write a review</p>
      <p className="mt-1 text-sm text-neutral-600">
        {signedIn
          ? `Share your experience at ${placeName || 'this place'}.`
          : 'Post as a guest for this session, or sign in to save your review to your account.'}
      </p>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-neutral-700">Your rating</p>
        <ReviewStarPicker value={rating} onChange={setRating} disabled={submitting} />
      </div>

      {!signedIn ? (
        <label className="mt-4 block">
          <span className="text-xs font-medium text-neutral-700">Display name</span>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={80}
            placeholder="Your name"
            className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
            disabled={submitting}
          />
        </label>
      ) : null}

      <label className="mt-4 block">
        <span className="text-xs font-medium text-neutral-700">Your review</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="What stood out during your visit?"
          className="mt-1 w-full resize-y rounded-lg border border-neutral-200 px-3 py-2.5 text-sm leading-relaxed outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
          disabled={submitting}
        />
      </label>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-3 text-sm font-medium text-emerald-700">{success}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
          style={{ backgroundColor: olive }}
        >
          {submitting ? 'Posting…' : 'Post review'}
        </button>
        {!signedIn ? (
          <Link
            to={`/login?next=${loginReturn}`}
            className="text-sm font-semibold text-[#6B8E23] hover:underline"
          >
            Sign in to save permanently
          </Link>
        ) : null}
      </div>
    </form>
  );
}
