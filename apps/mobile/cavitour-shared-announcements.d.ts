declare module 'cavitour-shared/announcements' {
  export function subscribeAnnouncementsChanged(fn: () => void): () => void;
  export function emitAnnouncementsChanged(): void;
  export function parseAnnouncementKind(raw: unknown): 'advisory' | 'event';
  export function parseAnnouncementSource(raw: unknown): 'establishment' | 'admin';
  export function mapAnnouncementRow(row: unknown): object | null;
  export function formatAnnouncementDateLabel(iso: unknown, now?: Date): string;
  export function formatAnnouncementRelativeShort(iso: unknown, now?: Date): string;
  export function announcementDayGroup(iso: unknown, now?: Date): string;
  export function groupAnnouncementsByDay(items: unknown, now?: Date): object[];
  export function announcementNotificationSummary(item: unknown): string;
  export function fetchPublishedAnnouncements(client: unknown): Promise<object[]>;
  export function unreadAnnouncementCount(client: unknown, userId: string): Promise<number>;
  export function markAnnouncementsRead(client: unknown, userId: string, ids: unknown): Promise<void>;
  export function announcementCardDateParts(
    iso: unknown
  ): { day: string; month: string; year: string } | null;
  export function announcementDisplayDateIso(item: unknown): string | null;
  export function announcementLocationLabel(item: unknown): string;
  export function announcementMapUrl(item: unknown): string;
  export function formatAnnouncementDateTimeParts(startsAt: unknown, endsAt?: unknown): string[];
  export function formatAnnouncementDateTimeRange(startsAt: unknown, endsAt?: unknown): string;
  export function formatAnnouncementBodyHtml(raw: unknown): string;
}
