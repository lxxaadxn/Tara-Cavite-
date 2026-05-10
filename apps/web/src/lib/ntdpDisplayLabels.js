/**
 * Mirrors apps/mobile/lib/ntdpDisplayLabels.ts for web place copy (NTDP “about” text).
 */

export function normalizeNtdpCopy(text) {
  return text.replace(/\bLeasure\b/g, 'Leisure');
}

export function formatNtdpCategoryTagLabel(raw) {
  const s = normalizeNtdpCopy(raw.trim());
  if (/^Leisure and Entertainment Tourism$/i.test(s)) {
    return 'Leisure and Entertainment';
  }
  return s;
}

const NTDP_ABOUT = {
  'cultural tourism':
    'These sites emphasize history, heritage, faith, arts, and local identity. Plan visits respectfully, confirm hours with the venue, and support community guides and cultural programs where offered.',
  'nature tourism':
    'Nature tourism highlights landscapes, trails, and outdoor experiences with conservation in mind. Follow park or LGU rules, leave no trace, and check access, fees, and weather before you go.',
  'leisure and entertainment tourism':
    'This category covers attractions, theme parks, resorts, and recreation for families and visitors. Confirm operating schedules, tickets, and safety rules directly with the operator.',
  'mice and events tourism':
    'MICE and events cover meetings, incentives, conferences, exhibitions, and gatherings. Check capacity, permits, and booking policies with the organizer or venue.',
  'health wellness and retirement tourism':
    'Wellness-oriented tourism focuses on restorative stays, clinics, spas, and healthy lifestyles. Confirm services and credentials with licensed providers before you book.',
  'food and gastronomy tourism':
    'Food and gastronomy tourism celebrates local cuisine and culinary identity. Ask about seasonal menus, allergens, and specialties when you visit.',
  'educational tourism':
    'Educational tourism links travel with learning at museums, campuses, and interpretive sites. Respect tour schedules, group rules, and site regulations.',
  'sports and recreation tourism':
    'Sports and recreation covers venues and activities for training, competition, and active leisure. Check calendars, facility fees, and equipment requirements in advance.',
  'farm tourism':
    'Farm tourism connects visitors with agriculture and rural enterprise. Hours and activities often vary by season—coordinate with the operator for tours, fees, and safety guidelines.',
  'shopping tourism':
    'Shopping tourism features retail hubs and specialty finds. Verify mall or market hours and promotions before traveling.',
  'cruise and beach tourism':
    'Coastal and cruise-related draws depend on weather, tides, and port or LGU advisories. Follow lifeguard instructions and local safety notices for a secure visit.',
  others:
    'This listing is grouped under a general NTDP category. Use on-site information and local tourism offices for the latest visitor guidance.',
};

const NTDP_ABOUT_DEFAULT =
  'Cavite’s NTDP inventory classifies tourism assets so planners and visitors can match expectations to the right type of experience. Check with the establishment and LGU for current hours, fees, and advisories.';

function normalizeCategoryKey(raw) {
  if (!raw?.trim()) return '';
  let s = normalizeNtdpCopy(raw).trim().toLowerCase();
  s = s.replace(/\//g, ' ').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.startsWith('heatlh')) {
    s = `health${s.slice(6)}`;
  }
  return s;
}

function resolveNtdpParagraph(ntdpCategory) {
  const key = normalizeCategoryKey(ntdpCategory);
  if (!key) {
    return NTDP_ABOUT_DEFAULT;
  }

  const strippedTourism = key.replace(/\s+tourism$/i, '').trim();
  const candidates = [key, strippedTourism, `${strippedTourism} tourism`];
  for (const c of candidates) {
    if (c && NTDP_ABOUT[c]) {
      return NTDP_ABOUT[c];
    }
  }

  if (key.includes('cultural')) return NTDP_ABOUT['cultural tourism'];
  if (key.includes('nature')) return NTDP_ABOUT['nature tourism'];
  if (key.includes('leisure') || key.includes('entertainment')) {
    return NTDP_ABOUT['leisure and entertainment tourism'];
  }
  if (key.includes('mice') || key.includes('conference') || key.includes('exhibition')) {
    return NTDP_ABOUT['mice and events tourism'];
  }
  if (key.includes('health') || key.includes('wellness') || key.includes('retirement')) {
    return NTDP_ABOUT['health wellness and retirement tourism'];
  }
  if (key.includes('food') || key.includes('gastronom')) {
    return NTDP_ABOUT['food and gastronomy tourism'];
  }
  if (key.includes('education')) return NTDP_ABOUT['educational tourism'];
  if (key.includes('sport') || (key.includes('recreation') && !key.includes('entertainment'))) {
    return NTDP_ABOUT['sports and recreation tourism'];
  }
  if (key.includes('farm') || key.includes('agri')) return NTDP_ABOUT['farm tourism'];
  if (key.includes('shopping')) return NTDP_ABOUT['shopping tourism'];
  if (key.includes('cruise') || key.includes('beach')) return NTDP_ABOUT['cruise and beach tourism'];
  if (key.includes('other')) return NTDP_ABOUT.others;

  return NTDP_ABOUT_DEFAULT;
}

export function isLikelyPlaceholderDescription(text) {
  if (!text?.trim()) return true;
  return /lorem\s+ipsum/i.test(text);
}

export function getNtdpCategoryAboutText(ntdpCategory, placeName, address) {
  const label = ntdpCategory?.trim()
    ? formatNtdpCategoryTagLabel(ntdpCategory)
    : 'Cavite tourism establishment';
  const paragraph = resolveNtdpParagraph(ntdpCategory);
  const addr = address?.trim();
  const addrSuffix = addr ? ` Address: ${addr}.` : '';
  return `${placeName} is classified under “${label}” in the National Tourism Development Plan (NTDP) inventory for Cavite.\n\n${paragraph}${addrSuffix}`;
}

export function getEstablishmentAboutBody(place) {
  const raw = place.description?.trim();
  if (raw && !isLikelyPlaceholderDescription(raw)) return raw;
  return getNtdpCategoryAboutText(place.ntdp_category, place.name, place.address);
}

/** Neutral avatar for “preview” review rows (not real users). */
const PREVIEW_REVIEW_IMAGE =
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&q=80';

/**
 * Review-tab placeholders aligned with mobile ReviewCardsList (NTDP-aware, no lorem).
 * @returns {{ name: string, image: string, text: string, rating: number }[]}
 */
export function getPreviewReviewEntries(placeName, ntdpCategory) {
  const name = placeName?.trim() || 'This place';
  const cat = ntdpCategory?.trim();
  const catBit = cat
    ? ` This stop is under ${formatNtdpCategoryTagLabel(cat)} in Cavite’s NTDP inventory.`
    : '';
  return [
    {
      name: 'Preview',
      image: PREVIEW_REVIEW_IMAGE,
      text: `Preview only — ${name} does not have public reviews in the app yet.${catBit} When reviews open, guest feedback will appear here.`,
      rating: 4,
    },
    {
      name: 'Preview',
      image: PREVIEW_REVIEW_IMAGE,
      text: `Sample card — ratings and comments for ${name} are not live yet.${catBit} Check back after reviews are enabled.`,
      rating: 5,
    },
  ];
}
