import type { Place } from '../data/mockData';

/** Boarding / transfer points used for terminal-to-terminal commute copy. */
export type CommuteHub = {
  id: string;
  name: string;
  municipality: string;
  latitude: number;
  longitude: number;
};

export type CommuteLeg = {
  fromHubId: string;
  toHubId: string;
  /** Allowed modes on this segment (commuter-facing). */
  modes: string[];
};

export type CommutePlan = {
  originHubId: string;
  shortLabel: string;
  legs: CommuteLeg[];
};

const HUBS: Record<string, CommuteHub> = {
  'kawit-terminal': {
    id: 'kawit-terminal',
    name: 'Kawit Transport Terminal',
    municipality: 'Kawit',
    latitude: 14.4432,
    longitude: 120.9018,
  },
  'gen-trias-terminal': {
    id: 'gen-trias-terminal',
    name: 'General Trias City Terminal',
    municipality: 'General Trias',
    latitude: 14.4167,
    longitude: 120.8833,
  },
  'dasma-palapala': {
    id: 'dasma-palapala',
    name: 'Dasmariñas Pala-pala (SM / Robinsons area)',
    municipality: 'Dasmariñas',
    latitude: 14.3297,
    longitude: 120.9367,
  },
  'tagaytay-olivarez': {
    id: 'tagaytay-olivarez',
    name: 'Tagaytay Olivarez Rotonda',
    municipality: 'Tagaytay',
    latitude: 14.1158,
    longitude: 120.9261,
  },
  'picnic-grove': {
    id: 'picnic-grove',
    name: 'Tagaytay Picnic Grove',
    municipality: 'Tagaytay',
    latitude: 14.1153,
    longitude: 120.9621,
  },
};

/** Example plans: adjust with verified operator / LGU data later. */
const PICNIC_GROVE_PLANS: CommutePlan[] = [
  {
    originHubId: 'kawit-terminal',
    shortLabel: 'Kawit',
    legs: [
      { fromHubId: 'kawit-terminal', toHubId: 'dasma-palapala', modes: ['Jeepney'] },
      {
        fromHubId: 'dasma-palapala',
        toHubId: 'tagaytay-olivarez',
        modes: ['Bus', 'Jeepney'],
      },
      { fromHubId: 'tagaytay-olivarez', toHubId: 'picnic-grove', modes: ['Jeepney'] },
    ],
  },
  {
    originHubId: 'gen-trias-terminal',
    shortLabel: 'General Trias',
    legs: [
      { fromHubId: 'gen-trias-terminal', toHubId: 'dasma-palapala', modes: ['Jeepney', 'Bus'] },
      {
        fromHubId: 'dasma-palapala',
        toHubId: 'tagaytay-olivarez',
        modes: ['Bus', 'Jeepney'],
      },
      { fromHubId: 'tagaytay-olivarez', toHubId: 'picnic-grove', modes: ['Jeepney'] },
    ],
  },
];

function normalizePlaceName(name: string): string {
  return name.trim().toLowerCase();
}

export function hubById(id: string): CommuteHub | undefined {
  return HUBS[id];
}

/** Optional link from a commute hub to a `Terminal_Id` in `terminals_cavite_rows.json` (sheet rows). */
const HUB_TO_SHEET_TERMINAL_ID: Record<string, string> = {
  'kawit-terminal': '43',
  'gen-trias-terminal': '31',
  'dasma-palapala': '26',
  'tagaytay-olivarez': '42',
};

export function hubToPlace(hub: CommuteHub, transportTypes?: string[]): Place {
  const modes =
    transportTypes && transportTypes.length > 0
      ? transportTypes
      : ['Jeepney', 'Bus', 'Tricycle'];
  const sheetId = HUB_TO_SHEET_TERMINAL_ID[hub.id];
  return {
    id: sheetId ?? `hub-${hub.id}`,
    terminalId: sheetId,
    name: hub.name,
    address: `${hub.municipality}, Cavite, Philippines`,
    type: 'Terminal',
    hours: '',
    latitude: hub.latitude,
    longitude: hub.longitude,
    transportTypes: modes,
  };
}

/**
 * Returns terminal-to-terminal style plans for supported destinations.
 * Matching is intentionally simple (substring on name).
 */
export function getCommutePlansForPlaceName(placeName: string): CommutePlan[] | null {
  const n = normalizePlaceName(placeName);
  if (n.includes('picnic grove')) return PICNIC_GROVE_PLANS;
  return null;
}

export function formatModes(modes: string[]): string {
  return modes.join(' · ');
}
