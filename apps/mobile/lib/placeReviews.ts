import type { SupabaseClient } from '@supabase/supabase-js';
import { readLocalImageBytes } from './readImageBytes';

export const MAX_REVIEW_PHOTOS = 4;
export const REVIEW_PHOTOS_BUCKET = 'review-photos';

const REVIEW_SELECT =
  'id, place_id, user_id, rating, body, is_published, created_at, photo_urls';

export type PlaceReview = {
  id: string;
  nickname: string;
  rating: number;
  text: string;
  at: number;
  userId?: string;
  photoUrls: string[];
};

export type ReviewPhotoUpload = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

function normalizePhotoUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((u) => String(u ?? '').trim()).filter(Boolean).slice(0, MAX_REVIEW_PHOTOS);
}

function rowToReview(
  row: {
    id: string;
    user_id: string;
    rating: number;
    body: string;
    created_at: string;
    photo_urls?: string[] | null;
  },
  usernameByUserId: Record<string, string>
): PlaceReview {
  const name = usernameByUserId[row.user_id] || 'Traveler';
  return {
    id: row.id,
    nickname: name,
    rating: Number(row.rating),
    text: row.body,
    at: new Date(row.created_at).getTime(),
    userId: row.user_id,
    photoUrls: normalizePhotoUrls(row.photo_urls),
  };
}

export function formatPlaceReviewError(
  error: { message?: string; code?: string } | unknown,
  fallback = 'Could not post your review. Try again.'
): string {
  const err = error as { message?: string; code?: string } | null;
  const msg = String(err?.message ?? error ?? '').trim();
  const code = String(err?.code ?? '');
  if (!msg && !code) return fallback;
  if (/sign in/i.test(msg)) return msg;
  if (code === '23503' || /foreign key|violates foreign key/i.test(msg)) {
    return 'This place could not be reviewed. The listing id is not in the catalog yet.';
  }
  if (code === '42501' || /permission denied|row-level security|rls/i.test(msg)) {
    return 'Visit this establishment first (scan the QR code) to leave a review.';
  }
  if (code === '23505' || /duplicate key|unique constraint/i.test(msg)) {
    return 'You already reviewed this place. Your previous review was kept.';
  }
  if (/relation.*does not exist/i.test(msg)) {
    return 'Reviews are not set up on the server yet. Run the place_reviews SQL in Supabase.';
  }
  if (/bucket|not found|does not exist/i.test(msg) && /review-photos/i.test(msg)) {
    return 'Review photos are not set up on the server yet. Run PLACE_REVIEW_VISIT_PHOTOS.sql in Supabase.';
  }
  return msg || fallback;
}

async function loadUsernames(
  client: SupabaseClient,
  userIds: string[]
): Promise<Record<string, string>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return {};

  const fromView = await client
    .from('reviewer_public_profiles')
    .select('id, username')
    .in('id', ids);
  if (!fromView.error) {
    return Object.fromEntries(
      (fromView.data ?? []).map((p) => [p.id, p.username?.trim() || 'Traveler'])
    );
  }

  const { data, error } = await client
    .from('user_profiles')
    .select('id, username, display_name')
    .in('id', ids);
  if (error) return {};
  return Object.fromEntries(
    (data ?? []).map((p) => [p.id, p.username?.trim() || p.display_name?.trim() || 'Traveler'])
  );
}

function extFromAsset(asset: ReviewPhotoUpload) {
  const mime = String(asset.mimeType || '').toLowerCase();
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  const name = String(asset.fileName || asset.uri || '');
  const fromName = name.split('?')[0].split('.').pop()?.toLowerCase();
  if (fromName === 'png' || fromName === 'webp' || fromName === 'jpg' || fromName === 'jpeg') {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }
  return 'jpg';
}

async function uploadReviewPhotos(
  client: SupabaseClient,
  userId: string,
  placeId: string,
  assets: ReviewPhotoUpload[]
): Promise<string[]> {
  const list = assets.slice(0, MAX_REVIEW_PHOTOS);
  const urls: string[] = [];
  for (const asset of list) {
    const fileBuffer = await readLocalImageBytes(asset.uri);

    const ext = extFromAsset(asset);
    const mimeType =
      asset.mimeType ||
      (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
    const path = `${userId}/${placeId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const { error } = await client.storage.from(REVIEW_PHOTOS_BUCKET).upload(path, fileBuffer, {
      upsert: false,
      contentType: mimeType,
      cacheControl: '3600',
    });
    if (error) throw new Error(formatPlaceReviewError(error, 'Could not upload review photo.'));
    const { data } = client.storage.from(REVIEW_PHOTOS_BUCKET).getPublicUrl(path);
    if (data?.publicUrl) urls.push(data.publicUrl);
  }
  return urls;
}

export async function fetchPlaceReviews(
  client: SupabaseClient,
  placeId: string
): Promise<PlaceReview[]> {
  const id = String(placeId ?? '').trim();
  if (!id) return [];

  const { data, error } = await client
    .from('place_reviews')
    .select(REVIEW_SELECT)
    .eq('place_id', id)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error && /photo_urls/i.test(String(error.message ?? ''))) {
    const retry = await client
      .from('place_reviews')
      .select('id, place_id, user_id, rating, body, is_published, created_at')
      .eq('place_id', id)
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    if (retry.error) {
      throw new Error(formatPlaceReviewError(retry.error, 'Could not load reviews.'));
    }
    const rows = retry.data ?? [];
    const names = await loadUsernames(
      client,
      rows.map((r) => r.user_id)
    );
    return rows.map((r) => rowToReview(r, names));
  }

  if (error) {
    throw new Error(formatPlaceReviewError(error, 'Could not load reviews.'));
  }

  const rows = data ?? [];
  const names = await loadUsernames(
    client,
    rows.map((r) => r.user_id)
  );
  return rows.map((r) => rowToReview(r, names));
}

export type PlaceRatingSummary = {
  /** Mean of published ratings, rounded to one decimal. */
  average: number;
  count: number;
};

/** Live rating for one place, read straight from published `place_reviews`. */
export async function fetchPlaceRatingSummary(
  client: SupabaseClient,
  placeId: string
): Promise<PlaceRatingSummary> {
  const id = String(placeId ?? '').trim();
  if (!id) return { average: 0, count: 0 };

  const { data, error } = await client
    .from('place_reviews')
    .select('rating')
    .eq('place_id', id)
    .eq('is_published', true);

  if (error) {
    throw new Error(formatPlaceReviewError(error, 'Could not load ratings.'));
  }

  let sum = 0;
  let count = 0;
  for (const row of data ?? []) {
    const rating = Number(row.rating);
    if (!Number.isFinite(rating)) continue;
    sum += rating;
    count += 1;
  }
  if (!count) return { average: 0, count: 0 };
  return { average: Math.round((sum / count) * 10) / 10, count };
}

/** Average rating and review count per place, keyed by place id (mirrors web). */
export async function fetchPlaceReviewStats(
  client: SupabaseClient
): Promise<Record<string, PlaceRatingSummary>> {
  const totals = new Map<string, { sum: number; count: number }>();
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await client
      .from('place_reviews')
      .select('place_id, rating')
      .eq('is_published', true)
      .range(from, from + pageSize - 1);
    if (error) {
      throw new Error(formatPlaceReviewError(error, 'Could not load ratings.'));
    }
    const rows = data ?? [];
    for (const row of rows) {
      const id = String(row.place_id ?? '').trim();
      const rating = Number(row.rating);
      if (!id || !Number.isFinite(rating)) continue;
      const cur = totals.get(id) ?? { sum: 0, count: 0 };
      cur.sum += rating;
      cur.count += 1;
      totals.set(id, cur);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  const out: Record<string, PlaceRatingSummary> = {};
  for (const [id, { sum, count }] of totals) {
    out[id] = { average: Math.round((sum / count) * 10) / 10, count };
  }
  return out;
}

export async function submitPlaceReview(
  client: SupabaseClient,
  input: { placeId: string; rating: number; body: string; photos?: ReviewPhotoUpload[] }
): Promise<PlaceReview> {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) {
    throw new Error('Sign in to leave a review.');
  }

  const cleanBody = String(input.body ?? '').trim();
  if (cleanBody.length < 1) {
    throw new Error('Please write a short comment.');
  }
  if (cleanBody.length > 4000) {
    throw new Error('Review is too long (max 4000 characters).');
  }

  const stars = Math.min(5, Math.max(1, Math.round(Number(input.rating))));
  const place_id = String(input.placeId ?? '').trim();
  if (!place_id) {
    throw new Error('This place could not be found.');
  }

  const { data: existing, error: existingError } = await client
    .from('place_reviews')
    .select('id, photo_urls')
    .eq('place_id', place_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existingError && existingError.code !== 'PGRST116') {
    throw new Error(formatPlaceReviewError(existingError));
  }

  let photo_urls = normalizePhotoUrls(existing?.photo_urls);
  const newPhotos = Array.isArray(input.photos) ? input.photos.slice(0, MAX_REVIEW_PHOTOS) : [];
  if (newPhotos.length) {
    photo_urls = await uploadReviewPhotos(client, user.id, place_id, newPhotos);
  }

  const payload = {
    rating: stars,
    body: cleanBody,
    photo_urls,
    is_published: true,
  };

  let row: {
    id: string;
    user_id: string;
    rating: number;
    body: string;
    created_at: string;
    photo_urls?: string[] | null;
  };

  if (existing?.id) {
    const { data, error } = await client
      .from('place_reviews')
      .update(payload)
      .eq('id', existing.id)
      .eq('user_id', user.id)
      .select(REVIEW_SELECT)
      .single();
    if (error) throw new Error(formatPlaceReviewError(error));
    row = data;
  } else {
    const { data, error } = await client
      .from('place_reviews')
      .insert({
        place_id,
        user_id: user.id,
        ...payload,
      })
      .select(REVIEW_SELECT)
      .single();
    if (error) throw new Error(formatPlaceReviewError(error));
    row = data;
  }

  const names = await loadUsernames(client, [user.id]);
  const fallback = user.email?.split('@')[0] || 'You';
  return rowToReview(row, { [user.id]: names[user.id] || fallback });
}
