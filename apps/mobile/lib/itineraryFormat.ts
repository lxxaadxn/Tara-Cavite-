import type { PublishedItinerary } from '../data/publishedItineraries';

/** Route line: use `route` when set; only turn `->` / spaced ` - ` into arrows. */
export function formatRouteLine(it: Pick<PublishedItinerary, 'route' | 'subtitle'>): string {
  const raw = it.route || it.subtitle || '';
  return String(raw)
    .replace(/\s*->\s*/g, ' → ')
    .replace(/\s+-\s+/g, ' → ');
}

export function stopCount(it: PublishedItinerary): number | null {
  const fromList = it.stopList?.length ?? 0;
  if (fromList > 0) return fromList;
  return it.stops ?? null;
}

export function metaLine(it: PublishedItinerary): string {
  const parts: string[] = [];
  const stops = stopCount(it);
  if (stops != null) parts.push(`${stops} ${stops === 1 ? 'stop' : 'stops'}`);
  if (it.durationLabel) parts.push(it.durationLabel);
  return parts.length ? parts.join(' · ') : 'Multi-stop route';
}
