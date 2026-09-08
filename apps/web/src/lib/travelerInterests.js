/** Canonical traveler interest chips for profile preferences. */

export const TRAVELER_INTEREST_TAGS = [
  'Foodie',
  'Coffee Lover',
  'Ecotourism',
  'History Buff',
  'Staycation',
  'Budget Traveler',
  'Beach',
  'Adventure',
  'Heritage',
  'Nightlife',
];

export const BIO_MAX_LENGTH = 280;

export function normalizeInterestTags(raw) {
  const allowed = new Set(TRAVELER_INTEREST_TAGS);
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const tag = String(item ?? '').trim();
    if (!tag || !allowed.has(tag) || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

export function normalizeSocialUrl(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  if (/^\/\//.test(text)) return `https:${text}`;
  // Handle @handles lightly for IG/TikTok
  if (text.startsWith('@')) return text;
  return `https://${text}`;
}
