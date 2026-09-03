declare module 'cavitour-shared/siteContent' {
  export const SITE_CONTENT_DEFAULTS: Record<string, string>;
  export function siteContentValue(map: Record<string, string> | null | undefined, key: string): string;
  export function mergeSiteContent(rows: unknown): Record<string, string>;
  export function fetchSiteContent(client: unknown): Promise<Record<string, string>>;
  export function upsertSiteContent(client: unknown, entries: Record<string, string>): Promise<void>;
  export function uploadSiteContentFile(client: unknown, folder: string, file: unknown): Promise<string>;
  export function subscribeSiteContent(client: unknown, onChange: () => void): () => void;
}
