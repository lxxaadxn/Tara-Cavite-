import { resolveAvatarUrl } from 'cavitour-shared/defaultAvatar';
import { normalizeInterestTags } from './travelerInterests';

/**
 * @typedef {{
 *   id: string,
 *   username: string,
 *   bio: string,
 *   interestTags: string[],
 *   avatarUrl: string,
 *   coverUrl: string,
 * }} PublicTravelerProfile
 */

/**
 * Load public-safe traveler fields (no email/phone/birthday).
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} userId
 * @returns {Promise<PublicTravelerProfile | null>}
 */
export async function fetchPublicTravelerProfile(client, userId) {
  const uid = String(userId ?? '').trim();
  if (!uid) return null;

  const { data, error } = await client
    .from('traveler_public_profiles')
    .select('id, username, bio, interest_tags, avatar_url, cover_url')
    .eq('id', uid)
    .maybeSingle();

  if (error) {
    const fallback = await client
      .from('reviewer_public_profiles')
      .select('id, username')
      .eq('id', uid)
      .maybeSingle();
    if (fallback.error || !fallback.data) return null;
    return {
      id: String(fallback.data.id),
      username: String(fallback.data.username ?? '').trim() || 'Traveler',
      bio: '',
      interestTags: [],
      avatarUrl: resolveAvatarUrl(null),
      coverUrl: '',
    };
  }

  if (!data) return null;

  return {
    id: String(data.id),
    username: String(data.username ?? '').trim() || 'Traveler',
    bio: String(data.bio ?? '').trim(),
    interestTags: normalizeInterestTags(data.interest_tags),
    avatarUrl: resolveAvatarUrl(data.avatar_url),
    coverUrl: String(data.cover_url ?? '').trim(),
  };
}

/**
 * Published review count for any traveler (place_reviews SELECT is public).
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} userId
 */
export async function fetchPublicReviewCount(client, userId) {
  const uid = String(userId ?? '').trim();
  if (!uid) return 0;
  const { count, error } = await client
    .from('place_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)
    .eq('is_published', true);
  if (error) return 0;
  return count ?? 0;
}
