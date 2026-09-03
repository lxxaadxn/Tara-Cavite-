declare module 'cavitour-shared/travelAchievements' {
  export const TRAVEL_ACHIEVEMENTS: { id: string; label: string; hint: string }[];

  export function isCheckinVisitSource(source: unknown): boolean;
  export function uniqueLguCount(cityMuns: unknown): number;

  export function computeTravelAchievements(stats?: {
    visitCount?: number;
    reviewCount?: number;
    uniqueLgus?: number;
  }): { id: string; label: string; hint: string; unlocked: boolean }[];

  export function buildRecentActivityFeed(
    input?: {
      visits?: object[];
      reviews?: object[];
      savedPlaces?: object[];
      savedItineraries?: object[];
    },
    limit?: number
  ): {
    id: string;
    at: string;
    kind: string;
    text: string;
    placeId?: string;
    itineraryId?: string;
  }[];
}
