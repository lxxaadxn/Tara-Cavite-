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
] as const;

export type TravelerInterestTag = (typeof TRAVELER_INTEREST_TAGS)[number];

export const BIO_MAX_LENGTH = 280;

export function normalizeInterestTags(raw: unknown): string[] {
  const allowed = new Set<string>(TRAVELER_INTEREST_TAGS);
  const list = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const tag = String(item ?? '').trim();
    if (!tag || !allowed.has(tag) || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

export function normalizeSocialUrl(raw: unknown): string {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  if (/^\/\//.test(text)) return `https:${text}`;
  // Handle @handles lightly for IG/TikTok
  if (text.startsWith('@')) return text;
  return `https://${text}`;
}
