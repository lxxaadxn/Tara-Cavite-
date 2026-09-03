declare module 'cavitour-shared/mapPins' {
  export const MAP_PIN_LEAFLET: Record<string, unknown>;
  export function defaultMapPinDataUrl(label: string): string;
  export function resolveMapPinUrl(
    siteMap: Record<string, string> | null | undefined,
    ntdpCategoryId: number | string | null | undefined,
    label: string
  ): string;
  export function resolveMapPinUrlForLabel(
    siteMap: Record<string, string> | null | undefined,
    lookups: unknown[],
    label: string
  ): string;
}
