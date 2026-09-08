import { supabase } from './supabase';

/**
 * Owner-scoped version of the admin analytics overview. One establishment means
 * a few hundred rows at most, so the aggregation stays in the browser like the
 * admin one does, without its 20,000-row ceiling.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SOURCE_COLORS = {
  qr: '#111827',
  code: '#3b82f6',
  destination_reached: '#1B8A70',
  manual: '#a78bfa',
};

const SOURCE_LABELS = {
  qr: 'QR check-in',
  code: 'Code',
  destination_reached: 'Arrived',
  manual: 'Manual',
};

export const ANALYTICS_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
];

function pctDelta(curr, prev) {
  if (prev <= 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 10000) / 100;
}

export function rangeWindow(range) {
  const to = new Date();
  let from;
  if (range === 'today') from = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  else if (range === 'week') from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (range === 'month') from = new Date(to.getFullYear(), to.getMonth(), 1);
  else from = new Date(to.getFullYear(), 0, 1);
  const span = Math.max(to.getTime() - from.getTime(), 24 * 60 * 60 * 1000);
  return { from, to, prevFrom: new Date(from.getTime() - span), prevTo: from };
}

function inRange(iso, from, to) {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

function kpi(key, label, value, prev, tint) {
  const delta = pctDelta(value, prev);
  return { key, label, value, delta, trend: delta < 0 ? 'down' : 'up', tint, display: null };
}

/** Owners may not have their RLS applied yet; treat that as "no data" not a crash. */
function isBlocked(error) {
  if (!error) return false;
  const msg = String(error.message ?? '').toLowerCase();
  return (
    error.code === '42501' ||
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    msg.includes('permission denied') ||
    msg.includes('does not exist')
  );
}

/** Zeroed scaffolding so the cards draw their empty shape before any data lands. */
const BLANK_TREND = MONTHS.map((month) => ({ month, visits: 0 }));
const BLANK_RATINGS = [5, 4, 3, 2, 1].map((stars) => ({ stars: `${stars}★`, reviews: 0 }));

export const EMPTY_SNAPSHOT = {
  kpis: [
    kpi('visits', 'Visits', 0, 0, 'green'),
    { key: 'ranking', label: 'Ranking', value: 0, display: '—', delta: null, trend: 'up', tint: 'blue' },
    kpi('announcements', 'Announcements', 0, 0, 'sky'),
    kpi('rating', 'Average rating', 0, 0, 'slate'),
  ],
  visitsTrend: BLANK_TREND,
  visitsBySource: [],
  ratingBreakdown: BLANK_RATINGS,
  recentReviews: [],
  totalVisits: 0,
  totalReviews: 0,
  blocked: false,
};

export async function fetchEstablishmentAnalytics(placeId, range, ownerId) {
  if (!placeId) return { ...EMPTY_SNAPSHOT };

  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
  const { from, to, prevFrom, prevTo } = rangeWindow(range);
  const [visitsRes, reviewsRes, rankRes, postsRes] = await Promise.all([
    supabase
      .from('place_visits')
      .select('user_id, source, created_at')
      .eq('place_id', placeId)
      .gte('created_at', yearStart)
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase
      .from('place_reviews')
      .select('id, rating, body, is_published, created_at')
      .eq('place_id', placeId)
      .order('created_at', { ascending: false })
      .limit(500),
    // Same tally the admin "Most visited destinations" report runs, but only
    // this owner's position comes back out of the database.
    supabase.rpc('get_my_establishment_visit_rank', {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    }),
    ownerId
      ? supabase
          .from('announcements')
          .select('created_at')
          .eq('establishment_owner_id', ownerId)
          .limit(500)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (isBlocked(visitsRes.error) && isBlocked(reviewsRes.error)) {
    return { ...EMPTY_SNAPSHOT, blocked: true };
  }

  const visits = visitsRes.error ? [] : visitsRes.data ?? [];
  const reviews = reviewsRes.error ? [] : reviewsRes.data ?? [];
  const posts = postsRes.error ? [] : postsRes.data ?? [];

  const window = visits.filter((v) => inRange(v.created_at, from, to));
  const prevWindow = visits.filter((v) => inRange(v.created_at, prevFrom, prevTo));
  const reviewWindow = reviews.filter((r) => inRange(r.created_at, from, to));
  const prevReviewWindow = reviews.filter((r) => inRange(r.created_at, prevFrom, prevTo));
  const postWindow = posts.filter((p) => inRange(p.created_at, from, to));
  const prevPostWindow = posts.filter((p) => inRange(p.created_at, prevFrom, prevTo));

  const avgRating = (rows) =>
    rows.length ? Math.round((rows.reduce((sum, r) => sum + Number(r.rating || 0), 0) / rows.length) * 10) / 10 : 0;

  // The RPC returns a single row; a place with no visits in the range gets no
  // rank, exactly as it would be missing from the admin report.
  const rank = rankRes.error ? 0 : Number(rankRes.data?.[0]?.place_rank ?? 0);

  const kpis = [
    kpi('visits', 'Visits', window.length, prevWindow.length, 'green'),
    {
      // A standing, not a quantity, so there is nothing to trend it against —
      // the card leaves the delta chip off.
      key: 'ranking',
      label: 'Ranking',
      value: rank,
      display: rank ? `#${rank}` : '—',
      delta: null,
      trend: 'up',
      tint: 'blue',
    },
    kpi('announcements', 'Announcements', postWindow.length, prevPostWindow.length, 'sky'),
    kpi('rating', 'Average rating', avgRating(reviewWindow), avgRating(prevReviewWindow), 'slate'),
  ];

  const byMonth = new Array(12).fill(0);
  visits.forEach((v) => {
    const d = new Date(v.created_at);
    if (!Number.isNaN(d.getTime())) byMonth[d.getMonth()] += 1;
  });
  const visitsTrend = MONTHS.map((month, i) => ({ month, visits: byMonth[i] }));

  const sourceCounts = new Map();
  window.forEach((v) => {
    const key = String(v.source || 'manual');
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
  });
  const sourceTotal = [...sourceCounts.values()].reduce((a, b) => a + b, 0);
  const visitsBySource = [...sourceCounts.entries()].map(([key, count]) => ({
    name: SOURCE_LABELS[key] ?? key,
    value: sourceTotal ? Math.round((count / sourceTotal) * 100) : 0,
    color: SOURCE_COLORS[key] ?? '#94a3b8',
  }));

  const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars: `${stars}★`,
    reviews: reviews.filter((r) => Number(r.rating) === stars).length,
  }));

  const recentReviews = reviews.slice(0, 5).map((r) => ({
    id: String(r.id),
    rating: Number(r.rating || 0),
    body: String(r.body ?? ''),
    isPublished: r.is_published !== false,
    createdAt: r.created_at ? String(r.created_at) : null,
  }));

  return {
    kpis,
    visitsTrend,
    visitsBySource,
    ratingBreakdown,
    recentReviews,
    totalVisits: visits.length,
    totalReviews: reviews.length,
    blocked: false,
  };
}

/** The QR code travelers scan. Without it there are no check-ins to chart. */
export async function fetchOwnCheckinCode(placeId) {
  if (!placeId) return null;
  const { data, error } = await supabase
    .from('place_checkin_codes')
    .select('code, is_active')
    .eq('place_id', placeId)
    .maybeSingle();
  if (error || !data) return null;
  return { code: String(data.code ?? ''), isActive: data.is_active !== false };
}
