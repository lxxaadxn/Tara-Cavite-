import { foldNtdpCategory, ntdpCategoriesMatch } from './ntdpFilterMeta.js';
import { Brand } from './brand.js';

export function mapPinSiteContentKey(ntdpCategoryId) {
  const id = Number(ntdpCategoryId);
  if (!Number.isFinite(id)) return '';
  return `map.pin.ntdp.${id}`;
}

/** Distinct teardrop glyph family (more specific than Filter modal icons). */
export function pinFamilyForNtdp(raw) {
  const key = foldNtdpCategory(raw);
  if (!key) return 'other';
  if (key.includes('histor')) return 'historical';
  if (key.includes('cultural')) return 'cultural';
  if (key.includes('mice') || key.includes('conference') || key.includes('exhibition') || key.includes('meeting')) {
    return 'mice';
  }
  if (key.includes('health') || key.includes('wellness') || key.includes('retirement')) return 'health';
  if (key.includes('food') || key.includes('gastronom') || key.includes('restaurant') || key.includes('culin')) {
    return 'restaurant';
  }
  if (key.includes('education')) return 'education';
  if (key.includes('shopping')) return 'shopping';
  if (key.includes('sport') || key.includes('recreation')) return 'sports';
  if (key.includes('leisure') || key.includes('entertainment')) return 'leisure';
  if (key.includes('cruise') || key.includes('beach')) return 'beach';
  if (key.includes('farm') || key.includes('agri')) return 'farm';
  if (key.includes('nature')) return 'nature';
  if (key.includes('other')) return 'other';
  return 'other';
}

const FAMILY_FILL = {
  nature: Brand.olive,
  farm: Brand.olive,
  beach: Brand.teal,
  cultural: Brand.ink,
  historical: Brand.ink,
  leisure: Brand.jade,
  sports: Brand.jade,
  restaurant: Brand.emerald,
  health: Brand.deepMint,
  education: Brand.pistachio,
  shopping: Brand.pistachio,
  mice: Brand.pistachio,
  other: Brand.stone,
};

const INK_GLYPH_FAMILIES = new Set(['education', 'shopping', 'mice']);

export function pinFillForNtdp(raw) {
  const family = pinFamilyForNtdp(raw);
  return FAMILY_FILL[family] || Brand.jade;
}

function glyphColorForFamily(family) {
  return INK_GLYPH_FAMILIES.has(family) ? Brand.ink : Brand.white;
}

function glyphs(color) {
  const t = 'translate(12.5 11.1) scale(1.55)';
  return {
    nature: `<g fill="${color}" transform="${t}"><path d="M0-5.1L-4.1.8h2.1V4.8h4V.8h2.1z"/></g>`,
    farm: `<g fill="${color}" transform="${t}"><path d="M0-5.1L-4.1.8h2.1V4.8h4V.8h2.1z"/></g>`,
    beach: `<g fill="none" stroke="${color}" stroke-width="1.05" stroke-linecap="round" transform="${t}"><path d="M-3.8-1.5c1.2 1.35 2.5 1.35 3.8 0s2.6-1.35 3.8 0"/><path d="M-3.8 1.5c1.2 1.35 2.5 1.35 3.8 0s2.6-1.35 3.8 0"/></g>`,
    cultural: `<g fill="${color}" transform="${t}"><path d="M0-4.8L-4.4-1.2h8.8z"/><path d="M-3.2-1.2h1.3V4.6h-1.3z"/><path d="M-.65-1.2h1.3V4.6h-1.3z"/><path d="M1.9-1.2h1.3V4.6h-1.3z"/><path d="M-4.2 4.6h8.4v1.1H-4.2z"/></g>`,
    historical: `<g fill="${color}" transform="${t}"><path d="M-3.4-4.4h6.8v1.2h-6.8z"/><path d="M-2.1-3.2h1.2V4.2H-2.1z"/><path d="M.9-3.2h1.2V4.2H.9z"/><path d="M-3.6 4.2h7.2v1.15H-3.6z"/></g>`,
    leisure: `<g fill="${color}" transform="${t}"><path d="M0-4.6 1.25-1.2 4.6 0 1.25 1.2 0 4.6-1.25 1.2-4.6 0-1.25-1.2z"/></g>`,
    sports: `<g fill="none" stroke="${color}" stroke-width="1.05" transform="${t}"><circle r="3.7"/><path d="M-2.5-1.7c1.4 2.8 3.6 2.8 5 0"/><path d="M-3.5.4h7"/></g>`,
    restaurant: `<g fill="${color}" transform="${t}"><path d="M-2.6-4.6h.95v5.4h.95V-4.6h.95v5.4c0 1.2-.7 1.95-1.45 2.1V5h-.95V2.9c-.75-.15-1.45-.9-1.45-2.1z"/><path d="M1.55-4.6h1.15v9.6H1.55z"/></g>`,
    health: `<g fill="${color}" transform="${t}"><path d="M-1.15-3.7h2.3v2.55h2.55v2.3H1.15V3.7h-2.3V1.15h-2.55v-2.3h2.55z"/></g>`,
    education: `<g fill="${color}" transform="${t}"><path d="M0-4.4 4.6-1.7 0 .9-4.6-1.7z"/><path d="M-3.2-.4v2.5c0 1.15 1.45 2.05 3.2 2.05s3.2-.9 3.2-2.05V-.4L0 1.15z"/><path d="M3.7-1.35v3.55"/></g>`,
    shopping: `<g fill="${color}" transform="${t}"><path d="M-3.3-1.1h6.6l-.7 6.4H-2.6z"/><path fill="none" stroke="${color}" stroke-width="1" d="M-1.6-1.1V-2.6a1.6 1.6 0 013.2 0V-1.1"/></g>`,
    mice: `<g fill="${color}" transform="${t}"><circle cy="-3.3" r="1.45"/><path d="M-1.7-1.6h3.4v2.4H-1.7z"/><path d="M-3.6 1.1h7.2l-1.1 3.7H-2.5z"/></g>`,
    other: `<g fill="${color}" transform="${t}"><circle r="2.8"/></g>`,
  };
}

function pinSvg(fill, family, width, height) {
  const set = glyphs(glyphColorForFamily(family));
  const glyph = set[family] || set.other;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 25 41" aria-hidden="true"><defs><clipPath id="h"><circle cx="12.5" cy="12.2" r="10.2"/></clipPath></defs><path fill="${fill}" stroke="#ffffff" stroke-width="1.1" d="M12.5 0C5.597 0 0 5.597 0 12.5 0 19.403 12.5 41 12.5 41S25 19.403 25 12.5C25 5.597 19.403 0 12.5 0z"/><g clip-path="url(#h)">${glyph}</g></svg>`;
}

export const MAP_PIN_DISPLAY = { width: 28, height: 46 };
const MAP_PIN_RETINA = { width: 56, height: 92 };

export function defaultMapPinSvg(label, width = MAP_PIN_DISPLAY.width, height = MAP_PIN_DISPLAY.height) {
  const family = pinFamilyForNtdp(label);
  return pinSvg(pinFillForNtdp(label), family, width, height);
}

export function defaultMapPinDataUrl(label) {
  return `data:image/svg+xml,${encodeURIComponent(defaultMapPinSvg(label, MAP_PIN_DISPLAY.width, MAP_PIN_DISPLAY.height))}`;
}

export function defaultMapPinRetinaDataUrl(label) {
  return `data:image/svg+xml,${encodeURIComponent(defaultMapPinSvg(label, MAP_PIN_RETINA.width, MAP_PIN_RETINA.height))}`;
}

export const MAP_PIN_LEAFLET = {
  iconSize: [MAP_PIN_DISPLAY.width, MAP_PIN_DISPLAY.height],
  iconAnchor: [14, MAP_PIN_DISPLAY.height],
  popupAnchor: [1, -38],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [40, 40],
  shadowAnchor: [12, MAP_PIN_DISPLAY.height],
};

export function resolveMapPinUrl(siteMap, ntdpCategoryId, label) {
  const key = mapPinSiteContentKey(ntdpCategoryId);
  const custom = key ? String(siteMap?.[key] ?? '').trim() : '';
  if (custom) return custom;
  return defaultMapPinDataUrl(label);
}

export function matchNtdpCategoryId(lookups, label) {
  const list = Array.isArray(lookups) ? lookups : [];
  for (const row of list) {
    const name = row.label ?? row.ntdp_category_name ?? row.name ?? '';
    if (!ntdpCategoriesMatch(name, label)) continue;
    const id = Number(row.tableId ?? row.ntdp_category_id ?? row.id);
    if (Number.isFinite(id)) return id;
  }
  return null;
}

export function resolveMapPinUrlForLabel(siteMap, lookups, label) {
  return resolveMapPinUrl(siteMap, matchNtdpCategoryId(lookups, label), label);
}

export function leafletPinIconOptions(iconUrl, label) {
  const fallback = defaultMapPinDataUrl(label);
  const url = String(iconUrl || fallback);
  return {
    ...MAP_PIN_LEAFLET,
    iconUrl: url,
    iconRetinaUrl: url.startsWith('data:') ? defaultMapPinRetinaDataUrl(label) : url,
  };
}
