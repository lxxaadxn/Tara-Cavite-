import type { SupabaseClient } from '@supabase/supabase-js';

export type PlaceReview = {
  id: string;
  nickname: string;
  rating: number;
  text: string;
  at: number;
  userId?: string;
};

function rowToReview(
  row: {
    id: string;
    user_id: string;
    rating: number;
    body: string;
    created_at: string;
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
  };
}

async function loadUsernames(
  client: SupabaseClient,
  userIds: string[]
): Promise<Record<string, string>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await client.from('user_profiles').select('id, username').in('id', ids);
  if (error) return {};
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.username?.trim() || 'Traveler']));
}

export async function fetchPlaceReviews(
  client: SupabaseClient,
  placeId: string
): Promise<PlaceReview[]> {
  const id = String(placeId ?? '').trim();
  if (!id) return [];

  const { data, error } = await client
    .from('place_reviews')
    .select('id, place_id, user_id, rating, body, is_published, created_at')
    .eq('place_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    if (/relation.*does not exist|place_reviews/i.test(String(error.message ?? ''))) {
      return [];
    }
    throw error;
  }

  const rows = data ?? [];
  const names = await loadUsernames(
    client,
    rows.map((r) => r.user_id)
  );
  return rows.map((r) => rowToReview(r, names));
}

export async function submitPlaceReview(
  client: SupabaseClient,
  input: { placeId: string; rating: number; body: string }
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

  const { data: existing } = await client
    .from('place_reviews')
    .select('id')
    .eq('place_id', place_id)
    .eq('user_id', user.id)
    .maybeSingle();

  let row: {
    id: string;
    user_id: string;
    rating: number;
    body: string;
    created_at: string;
  };

  if (existing?.id) {
    const { data, error } = await client
      .from('place_reviews')
      .update({ rating: stars, body: cleanBody })
      .eq('id', existing.id)
      .eq('user_id', user.id)
      .select('id, place_id, user_id, rating, body, is_published, created_at')
      .single();
    if (error) throw error;
    row = data;
  } else {
    const { data, error } = await client
      .from('place_reviews')
      .insert({
        place_id,
        user_id: user.id,
        rating: stars,
        body: cleanBody,
        is_published: true,
      })
      .select('id, place_id, user_id, rating, body, is_published, created_at')
      .single();
    if (error) throw error;
    row = data;
  }

  const { data: profile } = await client
    .from('user_profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  const names = {
    [user.id]: profile?.username?.trim() || user.email?.split('@')[0] || 'You',
  };
  return rowToReview(row, names);
}
