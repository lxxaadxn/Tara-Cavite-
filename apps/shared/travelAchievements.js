export const TRAVEL_ACHIEVEMENTS = [
  { id: 'first-destination', label: 'First Destination', hint: 'Reach your first destination' },
  { id: 'five-places', label: '5 Places Visited', hint: 'Visit five destinations' },
  { id: 'first-review', label: 'First Review', hint: 'Write your first review' },
  { id: 'three-lgus', label: 'Explored 3 Municipalities', hint: 'Visit places in three LGUs' },
  { id: 'cavite-explorer', label: 'Cavite Explorer', hint: 'Visit 10 places across 5 LGUs' },
];

export function isCheckinVisitSource(source) {
  const s = String(source ?? '').trim().toLowerCase();
  return s === 'qr' || s === 'code';
}

export function uniqueLguCount(cityMuns) {
  const seen = new Set();
  for (const raw of cityMuns ?? []) {
    const city = String(raw ?? '').trim().toLowerCase();
    if (city) seen.add(city);
  }
  return seen.size;
}

/**
 * @param {{ visitCount?: number, reviewCount?: number, uniqueLgus?: number }} stats
 */
export function computeTravelAchievements(stats) {
  const visitCount = Number(stats?.visitCount) || 0;
  const reviewCount = Number(stats?.reviewCount) || 0;
  const uniqueLgus = Number(stats?.uniqueLgus) || 0;
  const unlockedById = {
    'first-destination': visitCount >= 1,
    'five-places': visitCount >= 5,
    'first-review': reviewCount >= 1,
    'three-lgus': uniqueLgus >= 3,
    'cavite-explorer': visitCount >= 10 && uniqueLgus >= 5,
  };
  return TRAVEL_ACHIEVEMENTS.map((item) => ({
    ...item,
    unlocked: Boolean(unlockedById[item.id]),
  }));
}

/**
 * Newest-first mixed timeline for the traveler profile.
 * @param {{ visits?: object[], reviews?: object[], savedPlaces?: object[], savedItineraries?: object[] }} input
 * @param {number} [limit]
 */
export function buildRecentActivityFeed(input, limit = 6) {
  const events = [];
  for (const v of input?.visits ?? []) {
    const name = String(v.placeName || v.name || 'a place').trim() || 'a place';
    const checkedIn = isCheckinVisitSource(v.source) || v.checkedIn;
    events.push({
      id: `visit-${v.id || v.placeId}`,
      at: v.createdAt || v.savedAt || '',
      kind: checkedIn ? 'checkin' : 'reached',
      text: checkedIn ? `Checked in at ${name}` : `Reached ${name}`,
      placeId: v.placeId || v.id || '',
    });
  }
  for (const r of input?.reviews ?? []) {
    const name = String(r.placeName || 'a place').trim() || 'a place';
    events.push({
      id: `review-${r.id}`,
      at: r.createdAt || '',
      kind: 'review',
      text: `Added a review for ${name}`,
      placeId: r.placeId || '',
    });
  }
  for (const p of input?.savedPlaces ?? []) {
    const name = String(p.name || 'a place').trim() || 'a place';
    events.push({
      id: `save-${p.id}-${p.savedAt || ''}`,
      at: p.savedAt || '',
      kind: 'save',
      text: `Saved ${name}`,
      placeId: p.id || '',
    });
  }
  for (const it of input?.savedItineraries ?? []) {
    const name = String(it.name || 'an itinerary').trim() || 'an itinerary';
    const itineraryId = String(it.itineraryId || it.id || '').replace(/^itinerary-/, '');
    events.push({
      id: `itin-${it.id}-${it.savedAt || ''}`,
      at: it.savedAt || '',
      kind: 'itinerary',
      text: `Saved itinerary ${name}`,
      itineraryId,
    });
  }
  events.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  const cap = Math.max(1, Number(limit) || 6);
  return events.slice(0, cap);
}
