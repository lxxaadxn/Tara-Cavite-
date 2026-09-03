import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchPlaceNamesById, formatAdminDate, USER_MANAGEMENT_SQL_HINT } from './adminUsers';

export { formatAdminDate, USER_MANAGEMENT_SQL_HINT };

export type AdminPlaceReview = {
  id: string;
  placeId: string;
  placeName: string;
  userId: string;
  reviewerName: string;
  rating: number;
  body: string;
  isPublished: boolean;
  photoCount: number;
  createdAt: string | null;
};

const REVIEW_SELECT = 'id, place_id, user_id, rating, body, is_published, created_at, photo_urls';
const REVIEW_SELECT_BASE = 'id, place_id, user_id, rating, body, is_published, created_at';

function isMissingColumnError(error: { message?: string; code?: string } | null): boolean {
  const msg = (error?.message ?? '').toLowerCase();
  return msg.includes('photo_urls') && (msg.includes('column') || msg.includes('schema cache') || error?.code === '42703');
}

function isRlsError(error: { message?: string; code?: string } | null): boolean {
  const msg = error?.message ?? '';
  return error?.code === '42501' || /row-level security|permission denied/i.test(msg);
}

function friendly(error: { message?: string; code?: string } | null, fallback: string): Error {
  if (isRlsError(error)) {
    return new Error(
      'Run PLACE_REVIEWS_ADMIN_MODERATION.sql (and USER_MANAGEMENT_ADMIN.sql if reviews do not load) in the Supabase SQL Editor, then reload.'
    );
  }
  return new Error(error?.message ?? fallback);
}

function photoCount(raw: unknown): number {
  if (!Array.isArray(raw)) return 0;
  return raw.map((u) => String(u ?? '').trim()).filter(Boolean).length;
}

async function loadReviewerNames(client: SupabaseClient, userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (!unique.length) return map;

  const fromView = await client.from('reviewer_public_profiles').select('id, username').in('id', unique);
  if (!fromView.error) {
    for (const row of fromView.data ?? []) {
      const name = String(row.username ?? '').trim();
      if (name) map.set(String(row.id), name);
    }
  }

  const missing = unique.filter((id) => !map.has(id));
  if (!missing.length) return map;

  const { data } = await client.from('user_profiles').select('id, username, display_name').in('id', missing);
  for (const row of data ?? []) {
    const name = String(row.username ?? '').trim() || String(row.display_name ?? '').trim();
    if (name) map.set(String(row.id), name);
  }
  return map;
}

export async function fetchAdminPlaceReviews(client: SupabaseClient): Promise<AdminPlaceReview[]> {
  let { data, error } = await client.from('place_reviews').select(REVIEW_SELECT).order('created_at', { ascending: false });
  if (error && isMissingColumnError(error)) {
    ({ data, error } = await client.from('place_reviews').select(REVIEW_SELECT_BASE).order('created_at', { ascending: false }));
  }
  if (error) throw friendly(error, 'Failed to load reviews');

  const rows = data ?? [];
  const names = await fetchPlaceNamesById(
    client,
    rows.map((r) => String(r.place_id ?? ''))
  );
  const reviewers = await loadReviewerNames(
    client,
    rows.map((r) => String(r.user_id ?? ''))
  );

  return rows.map((row) => {
    const placeId = String(row.place_id ?? '');
    const userId = String(row.user_id ?? '');
    return {
      id: String(row.id),
      placeId,
      placeName: names.get(placeId) || 'Unknown place',
      userId,
      reviewerName: reviewers.get(userId) || 'Traveler',
      rating: Number(row.rating) || 0,
      body: String(row.body ?? ''),
      isPublished: row.is_published !== false,
      photoCount: photoCount((row as { photo_urls?: unknown }).photo_urls),
      createdAt: row.created_at ? String(row.created_at) : null,
    };
  });
}

export async function setAdminPlaceReviewPublished(
  client: SupabaseClient,
  id: string,
  isPublished: boolean
): Promise<void> {
  const { error } = await client.from('place_reviews').update({ is_published: isPublished }).eq('id', id);
  if (error) throw friendly(error, 'Failed to update review');
}

export async function deleteAdminPlaceReview(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('place_reviews').delete().eq('id', id);
  if (error) throw friendly(error, 'Failed to delete review');
}
