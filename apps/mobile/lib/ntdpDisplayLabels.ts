/**
 * NTDP inventory text sometimes used the typo "Leasure" (source PDFs). Normalize for UI.
 */
export function normalizeNtdpCopy(text: string): string {
  return text.replace(/\bLeasure\b/g, 'Leisure');
}

/**
 * Tag label on About Establishment: correct spelling and show "Leisure and Entertainment"
 * without truncating (drops trailing " Tourism" for this category only).
 */
export function formatNtdpCategoryTagLabel(raw: string): string {
  const s = normalizeNtdpCopy(raw.trim());
  if (/^Leisure and Entertainment Tourism$/i.test(s)) {
    return 'Leisure and Entertainment';
  }
  return s;
}

function normalizeCategoryKey(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';
  let s = normalizeNtdpCopy(raw).trim().toLowerCase();
  s = s.replace(/\//g, ' ').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.startsWith('heatlh')) {
    s = `health${s.slice(6)}`;
  }
  return s;
}

/** True when the string is empty or looks like filler (e.g. lorem ipsum). */
export function isLikelyPlaceholderDescription(text: string | undefined | null): boolean {
  if (!text?.trim()) return true;
  return /lorem\s+ipsum/i.test(text);
}

/** Short visitor hook per NTDP category — used inside a single about sentence. */
function categoryHighlightPhrase(ntdpCategory: string | null | undefined): string {
  const key = normalizeCategoryKey(ntdpCategory);
  if (key.includes('cultural')) return 'history, heritage, and local culture';
  if (key.includes('nature')) return 'landscapes, trails, and outdoor experiences';
  if (key.includes('leisure') || key.includes('entertainment')) {
    return 'family-friendly recreation and entertainment';
  }
  if (key.includes('mice') || key.includes('conference') || key.includes('exhibition')) {
    return 'meetings, events, and gatherings';
  }
  if (key.includes('health') || key.includes('wellness') || key.includes('retirement')) {
    return 'wellness, rest, and healthy living';
  }
  if (key.includes('food') || key.includes('gastronom')) return 'local food and culinary experiences';
  if (key.includes('education')) return 'learning and interpretive visits';
  if (key.includes('sport') || (key.includes('recreation') && !key.includes('entertainment'))) {
    return 'sports and active recreation';
  }
  if (key.includes('farm') || key.includes('agri')) return 'farm visits and rural experiences';
  if (key.includes('shopping')) return 'shopping and specialty retail';
  if (key.includes('cruise') || key.includes('beach')) return 'coastal scenery and beach activities';
  if (key.includes('other')) return 'a variety of visitor experiences';
  return 'sightseeing and local discovery';
}

function formatAboutLocation(place: {
  city_mun?: string | null;
  address?: string | null;
}): string {
  const m = place.city_mun?.trim();
  if (m) {
    if (/cavite/i.test(m)) return m.replace(/\s*,?\s*Philippines\s*$/i, '').trim() || m;
    return `${m}, Cavite`;
  }
  const addr = place.address?.trim();
  if (addr && /cavite/i.test(addr)) {
    const parts = addr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const town = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    if (town && !/^cavite$/i.test(town)) return `${town}, Cavite`;
    return 'Cavite';
  }
  return 'Cavite';
}

/**
 * One plain-language sentence for About establishment when no catalog description exists.
 */
export function buildEstablishmentAboutSentence(place: {
  name: string;
  ntdp_category?: string | null;
  city_mun?: string | null;
  address?: string | null;
}): string {
  const name = place.name.trim() || 'This establishment';
  const where = formatAboutLocation(place);
  const highlight = categoryHighlightPhrase(place.ntdp_category);
  const categoryRaw = place.ntdp_category?.trim();
  if (categoryRaw) {
    const label = formatNtdpCategoryTagLabel(categoryRaw).toLowerCase();
    return `${name} is a ${label} destination in ${where} where visitors can enjoy ${highlight}.`;
  }
  return `${name} is a tourism destination in ${where} where visitors can enjoy ${highlight}.`;
}

/**
 * Visitor-facing “about” copy when the database description is missing or placeholder.
 */
export function getNtdpCategoryAboutText(
  ntdpCategory: string | null | undefined,
  placeName: string,
  address?: string,
  city_mun?: string | null
): string {
  return buildEstablishmentAboutSentence({
    name: placeName,
    ntdp_category: ntdpCategory,
    address,
    city_mun,
  });
}

export function getEstablishmentAboutBody(place: {
  description?: string | null;
  ntdp_category?: string | null;
  name: string;
  address?: string | null;
  city_mun?: string | null;
}): string {
  const raw = place.description?.trim();
  if (raw && !isLikelyPlaceholderDescription(raw)) return raw;
  return buildEstablishmentAboutSentence(place);
}

/** Preview review rows (not real users) — same copy as web `getPreviewReviewEntries`. */
export type PreviewReviewEntry = {
  name: string;
  text: string;
  rating: number;
};

export function getPreviewReviewEntries(
  placeName: string,
  ntdpCategory?: string | null
): PreviewReviewEntry[] {
  const label = placeName?.trim() || 'This place';
  const cat = ntdpCategory?.trim();
  const catBit = cat
    ? ` This stop is under ${formatNtdpCategoryTagLabel(cat)} in Cavite’s NTDP inventory.`
    : '';
  return [
    {
      name: 'Preview',
      text: `Preview only — ${label} does not have public reviews in the app yet.${catBit} When reviews open, guest feedback will appear here.`,
      rating: 4,
    },
    {
      name: 'Preview',
      text: `Sample card — ratings and comments for ${label} are not live yet.${catBit} Check back after reviews are enabled.`,
      rating: 5,
    },
  ];
}
