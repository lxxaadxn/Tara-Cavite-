declare module 'cavitour-shared/itineraries' {
  export function slugifyItineraryTitle(title: unknown): string;
  export function matchItinerary<T extends { id?: string; slug?: string; publicId?: string; uuid?: string }>(
    list: T[] | null | undefined,
    idOrSlug: unknown
  ): T | null;
  export function mapItineraryRow(row: unknown): object | null;
  export function toPublishedItinerary(mapped: object | null): object | null;
  export function fetchPublishedItineraries(client: unknown): Promise<object[]>;
  export function fetchAllItineraries(client: unknown): Promise<object[]>;
  export function fetchItineraryByIdOrSlug(
    client: unknown,
    idOrSlug: unknown,
    options?: { publishedOnly?: boolean }
  ): Promise<object | null>;
  export function subscribeItineraries(client: unknown, onChange: () => void): () => void;
  export function uploadItineraryCover(client: unknown, itineraryId: string, file: unknown): Promise<string>;
  export function upsertItinerary(client: unknown, input: object): Promise<string>;
  export function deleteItinerary(client: unknown, id: unknown): Promise<void>;
}
