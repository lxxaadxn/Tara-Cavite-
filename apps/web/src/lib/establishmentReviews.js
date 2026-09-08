import { supabase } from './supabase';

/**
 * Reviews left on the owner's own listing. Published ones are readable by
 * everyone; hidden ones need the owner SELECT policy from ESTABLISHMENT_PORTAL.sql.
 */

const SELECT = 'id, rating, body, is_published, photo_urls, created_at, user_id';
const SELECT_BASE = 'id, rating, body, is_published, created_at, user_id';

function isMissingColumn(error) {
  const msg = String(error?.message ?? '').toLowerCase();
  return error?.code === '42703' || msg.includes('column') || msg.includes('schema cache');
}

async function loadReviewerNames(userIds) {
  const unique = [...new Set(userIds.filter(Boolean))];
  const names = new Map();
  if (!unique.length) return names;

  const fromView = await supabase.from('reviewer_public_profiles').select('id, username').in('id', unique);
  if (!fromView.error) {
    for (const row of fromView.data ?? []) {
      const name = String(row.username ?? '').trim();
      if (name) names.set(String(row.id), name);
    }
  }

  const missing = unique.filter((id) => !names.has(id));
  if (!missing.length) return names;

  const { data } = await supabase.from('user_profiles').select('id, username, display_name').in('id', missing);
  for (const row of data ?? []) {
    const name = String(row.username ?? '').trim() || String(row.display_name ?? '').trim();
    if (name) names.set(String(row.id), name);
  }
  return names;
}

async function loadReportedIds(reviewIds, ownerId) {
  if (!reviewIds.length || !ownerId) return new Set();
  const { data, error } = await supabase
    .from('place_review_reports')
    .select('review_id')
    .eq('owner_id', ownerId)
    .in('review_id', reviewIds);
  if (error) return new Set();
  return new Set((data ?? []).map((row) => String(row.review_id)));
}

export async function fetchEstablishmentReviews(placeId, ownerId) {
  if (!placeId) return [];

  let { data, error } = await supabase
    .from('place_reviews')
    .select(SELECT)
    .eq('place_id', placeId)
    .order('created_at', { ascending: false });
  if (error && isMissingColumn(error)) {
    ({ data, error } = await supabase
      .from('place_reviews')
      .select(SELECT_BASE)
      .eq('place_id', placeId)
      .order('created_at', { ascending: false }));
  }
  if (error) throw new Error(error.message || 'Could not load reviews.');

  const rows = data ?? [];
  const names = await loadReviewerNames(rows.map((row) => String(row.user_id ?? '')));
  const reported = await loadReportedIds(
    rows.map((row) => String(row.id)),
    ownerId
  );

  return rows.map((row) => ({
    id: String(row.id),
    reviewerName: names.get(String(row.user_id ?? '')) || 'Traveler',
    rating: Number(row.rating) || 0,
    body: String(row.body ?? ''),
    isPublished: row.is_published !== false,
    photoCount: Array.isArray(row.photo_urls)
      ? row.photo_urls.filter((url) => String(url ?? '').trim()).length
      : 0,
    createdAt: row.created_at ? String(row.created_at) : null,
    reported: reported.has(String(row.id)),
  }));
}

export async function reportPlaceReview(reviewId, ownerId, reason) {
  const text = String(reason ?? '').trim();
  if (!text) throw new Error('Tell the tourism office what is wrong with this review.');
  const { error } = await supabase
    .from('place_review_reports')
    .insert({ review_id: reviewId, owner_id: ownerId, reason: text });
  if (error) {
    const msg = String(error.message ?? '');
    if (error.code === '23505') throw new Error('You already reported this review.');
    if (/does not exist|schema cache/i.test(msg)) {
      throw new Error(
        'Reporting is not enabled yet. Ask the Cavite Tourism Administration to run ESTABLISHMENT_PORTAL.sql.'
      );
    }
    throw new Error(msg || 'Could not send the report.');
  }
}
