import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import {
  fetchPlaceRatingSummary,
  fetchPlaceReviewStats,
  type PlaceRatingSummary,
} from './placeReviews';

/** Matches the web pages: coalesce bursts of review writes into one refetch. */
const REALTIME_DEBOUNCE_MS = 400;

function subscribeToReviewWrites(channelName: string, onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(onChange, REALTIME_DEBOUNCE_MS);
  };

  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'place_reviews' }, schedule)
    .subscribe();

  return () => {
    if (timer) clearTimeout(timer);
    void supabase.removeChannel(channel);
  };
}

/**
 * Live rating for one place. `null` while the first read is in flight, so callers
 * can tell "still loading" apart from "no reviews yet".
 */
export function usePlaceRatingSummary(placeId: string | null | undefined): PlaceRatingSummary | null {
  const id = String(placeId ?? '').trim();
  /** Tagged with the place it belongs to, so a previous place never leaks through. */
  const [entry, setEntry] = useState<{ id: string; summary: PlaceRatingSummary } | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const load = () => {
      fetchPlaceRatingSummary(supabase, id)
        .then((summary) => {
          if (!cancelled) setEntry({ id, summary });
        })
        .catch((err) => {
          if (__DEV__) console.warn('[placeReviews] rating summary failed', err);
          if (!cancelled) setEntry({ id, summary: { average: 0, count: 0 } });
        });
    };

    load();
    const unsubscribe = subscribeToReviewWrites(`place-rating-${id}`, load);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [id]);

  return entry?.id === id ? entry.summary : null;
}

/** Live rating for every place, keyed by place id — for list and card screens. */
export function usePlaceReviewStats(): Record<string, PlaceRatingSummary> {
  const [stats, setStats] = useState<Record<string, PlaceRatingSummary>>({});

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchPlaceReviewStats(supabase)
        .then((next) => {
          if (!cancelled) setStats(next);
        })
        .catch((err) => {
          if (__DEV__) console.warn('[placeReviews] review stats failed', err);
        });
    };

    load();
    const unsubscribe = subscribeToReviewWrites('place-review-stats', load);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return stats;
}
