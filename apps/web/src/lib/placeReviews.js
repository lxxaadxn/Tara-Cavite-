/**
 * Place reviews backed by public.place_reviews (Supabase).
 */

export const MAX_REVIEW_PHOTOS = 4;
export const REVIEW_PHOTOS_BUCKET = 'review-photos';

const REVIEW_SELECT =
  'id, place_id, user_id, rating, body, is_published, created_at, photo_urls';

function normalizePhotoUrls(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((u) => String(u ?? '').trim()).filter(Boolean).slice(0, MAX_REVIEW_PHOTOS);
}

function rowToReview(row, usernameByUserId) {
  const name =
    usernameByUserId?.[row.user_id] ||
    (typeof row.username === 'string' && row.username.trim() ? row.username.trim() : null) ||
    'Traveler';
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

export function formatPlaceReviewError(error, fallback = 'Could not post your review. Try again.') {
  const msg = String(error?.message ?? error ?? '').trim();
  const code = String(error?.code ?? '');
  if (!msg && !code) return fallback;
  if (/sign in/i.test(msg)) return msg;
  if (code === '23503' || /foreign key|violates foreign key/i.test(msg)) {
    return 'This place could not be reviewed. The listing id is not in the catalog yet.';
  }
  if (code === '42501' || /permission denied|row-level security|rls/i.test(msg)) {
    return 'Visit this establishment first (scan the QR code in the Tara, Cavite! app) to leave a review.';
  }
  if (code === '23505' || /duplicate key|unique constraint/i.test(msg)) {
    return 'You already reviewed this place. Your previous review was kept.';
  }
  if (/relation.*does not exist|place_reviews/i.test(msg) && /does not exist/i.test(msg)) {
    return 'Reviews are not set up on the server yet. Run the place_reviews SQL in Supabase.';
  }
  if (/bucket|not found|does not exist/i.test(msg) && /review-photos/i.test(msg)) {
    return 'Review photos are not set up on the server yet. Run PLACE_REVIEW_VISIT_PHOTOS.sql in Supabase.';
  }
  return msg || fallback;
}

async function loadUsernames(client, userIds) {
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

  const { data, error } = await client.from('user_profiles').select('id, username, display_name').in('id', ids);
  if (error) return {};
  return Object.fromEntries(
    (data ?? []).map((p) => [
      p.id,
      p.username?.trim() || p.display_name?.trim() || 'Traveler',
    ])
  );
}

function extFromFile(file) {
  const mime = String(file?.type || '').toLowerCase();
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  const name = String(file?.name || '');
  const fromName = name.split('.').pop()?.toLowerCase();
  if (fromName === 'png' || fromName === 'webp' || fromName === 'jpg' || fromName === 'jpeg') {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }
  return 'jpg';
}

async function uploadReviewPhotos(client, userId, placeId, files) {
  const list = Array.isArray(files) ? files.slice(0, MAX_REVIEW_PHOTOS) : [];
  const urls = [];
  for (const file of list) {
    if (!file) continue;
    const ext = extFromFile(file);
    const path = `${userId}/${placeId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const contentType = file.type || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
    const { error } = await client.storage.from(REVIEW_PHOTOS_BUCKET).upload(path, file, {
      upsert: false,
      contentType,
      cacheControl: '3600',
    });
    if (error) throw new Error(formatPlaceReviewError(error, 'Could not upload review photo.'));
    const { data } = client.storage.from(REVIEW_PHOTOS_BUCKET).getPublicUrl(path);
    if (data?.publicUrl) urls.push(data.publicUrl);
  }
  return urls;
}

export async function fetchPlaceReviews(client, placeId) {
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

/**
 * Average rating and review count per place from published `place_reviews`.
 * @returns {Promise<Record<string, { avgRating: number, reviewCount: number }>>}
 */
export async function fetchPlaceReviewStats(client) {
  const stats = new Map();
  const pageSize = 1000;
  let from = 0;

  while (true) {
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
      if (!id) continue;
      const rating = Number(row.rating);
      if (!Number.isFinite(rating)) continue;
      const cur = stats.get(id) || { sum: 0, count: 0 };
      cur.sum += rating;
      cur.count += 1;
      stats.set(id, cur);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  /** @type {Record<string, { avgRating: number, reviewCount: number }>} */
  const out = {};
  for (const [id, { sum, count }] of stats) {
    out[id] = {
      avgRating: Math.round((sum / count) * 10) / 10,
      reviewCount: count,
    };
  }
  return out;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {{ placeId: string, rating: number, body: string, photos?: File[] }} input
 */
export async function submitPlaceReview(client, { placeId, rating, body, photos }) {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) {
    throw new Error('Sign in to leave a review.');
  }

  const cleanBody = String(body ?? '').trim();
  if (cleanBody.length < 1) {
    throw new Error('Please write a short comment.');
  }
  if (cleanBody.length > 4000) {
    throw new Error('Review is too long (max 4000 characters).');
  }

  const stars = Math.min(5, Math.max(1, Math.round(Number(rating))));
  const place_id = String(placeId ?? '').trim();
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
  const newFiles = Array.isArray(photos) ? photos.filter(Boolean).slice(0, MAX_REVIEW_PHOTOS) : [];
  if (newFiles.length) {
    photo_urls = await uploadReviewPhotos(client, user.id, place_id, newFiles);
  }

  const payload = {
    rating: stars,
    body: cleanBody,
    photo_urls,
    is_published: true,
  };

  let row;
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
