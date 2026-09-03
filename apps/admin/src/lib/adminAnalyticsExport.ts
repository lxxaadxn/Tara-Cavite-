import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAdminItineraries, stopCount } from './adminItineraries';
import { fetchAdminTravelers } from './adminUsers';
import { fetchStaV3Rows } from './staV3CatalogAdmin';
import { CONTENT_PIPELINE } from 'cavitour-shared';

export type ReportRange = 'all' | 'month' | 'quarter' | 'year';

export type VisitReportRow = {
  rank: number;
  name: string;
  city: string;
  visits: number;
};

export type ItineraryReportRow = {
  title: string;
  status: string;
  featured: string;
  stops: number;
  duration: string;
  tags: string;
};

export type DistRow = {
  label: string;
  count: number;
};

export type AnalyticsReportBundle = {
  rangeLabel: string;
  generatedAt: string;
  visits: VisitReportRow[];
  itineraries: ItineraryReportRow[];
  byLgu: DistRow[];
  byCategory: DistRow[];
  accounts: DistRow[];
  listedPlaces: number;
};

const RANGE_LABEL: Record<ReportRange, string> = {
  all: 'All time',
  month: 'This month',
  quarter: 'This quarter',
  year: 'This year',
};

export function reportRangeLabel(range: ReportRange): string {
  return RANGE_LABEL[range];
}

export function reportRangeBounds(range: ReportRange): { from: string | null; to: string | null } {
  if (range === 'all') return { from: null, to: null };
  const now = new Date();
  const to = now.toISOString();
  if (range === 'month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to };
  }
  if (range === 'year') {
    return { from: new Date(now.getFullYear(), 0, 1).toISOString(), to };
  }
  const q = Math.floor(now.getMonth() / 3) * 3;
  return { from: new Date(now.getFullYear(), q, 1).toISOString(), to };
}

function csvCell(value: string | number): string {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))];
  return `\uFEFF${lines.join('\n')}`;
}

export function downloadTextFile(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function loadPlaceNames(
  client: SupabaseClient,
  ids: string[]
): Promise<Map<string, { name: string; city: string }>> {
  const map = new Map<string, { name: string; city: string }>();
  const unique = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 80) {
    const chunk = unique.slice(i, i + 80);
    const { data } = await client
      .from(CONTENT_PIPELINE.establishmentsView)
      .select('establishment_public_id, ta_name, city_mun')
      .in('establishment_public_id', chunk);
    for (const row of data ?? []) {
      const id = String(row.establishment_public_id ?? '');
      if (!id) continue;
      map.set(id, { name: String(row.ta_name ?? '').trim() || id.slice(0, 8), city: String(row.city_mun ?? '').trim() || '—' });
    }
  }
  return map;
}

async function fetchVisitReport(client: SupabaseClient, range: ReportRange): Promise<VisitReportRow[]> {
  const { from, to } = reportRangeBounds(range);
  let query = client.from('place_visits').select('place_id, created_at').limit(20000);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const tally = new Map<string, number>();
  for (const row of data ?? []) {
    const id = String(row.place_id ?? '');
    if (!id) continue;
    tally.set(id, (tally.get(id) ?? 0) + 1);
  }
  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50);
  const names = await loadPlaceNames(
    client,
    ranked.map(([id]) => id)
  );
  return ranked.map(([id, visits], i) => {
    const named = names.get(id);
    return {
      rank: i + 1,
      name: named?.name || id.slice(0, 8),
      city: named?.city || '—',
      visits,
    };
  });
}

function tally(values: string[]): DistRow[] {
  const map = new Map<string, number>();
  for (const raw of values) {
    const label = raw.trim() || 'Unspecified';
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export async function fetchAnalyticsReportBundle(
  client: SupabaseClient,
  range: ReportRange
): Promise<AnalyticsReportBundle> {
  const [visitsSettled, itineraries, places, travelers] = await Promise.all([
    fetchVisitReport(client, range).then(
      (rows) => ({ ok: true as const, rows }),
      (err) => ({ ok: false as const, error: err instanceof Error ? err.message : 'Failed to load visits', rows: [] as VisitReportRow[] })
    ),
    fetchAdminItineraries(),
    fetchStaV3Rows(client),
    fetchAdminTravelers(client),
  ]);

  const listed = places.filter((p) => p.is_listed);
  const itineraryRows: ItineraryReportRow[] = itineraries
    .slice()
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title))
    .map((row) => ({
      title: row.title,
      status: row.status,
      featured: row.featured ? 'Yes' : 'No',
      stops: stopCount(row),
      duration: row.durationLabel || '—',
      tags: row.tags.join('; '),
    }));

  const roleCounts = tally(travelers.map((t) => (t.role === 'admin' ? 'Admin' : t.role === 'establishment' ? 'Establishment' : 'User')));

  return {
    rangeLabel: reportRangeLabel(range),
    generatedAt: new Date().toISOString(),
    visits: visitsSettled.rows,
    itineraries: itineraryRows,
    byLgu: tally(listed.map((p) => p.city_mun || '')),
    byCategory: tally(listed.map((p) => p.ntdp_category || p.ta_category || '')),
    accounts: roleCounts,
    listedPlaces: listed.length,
  };
}

export function visitsCsv(rows: VisitReportRow[]): string {
  return toCsv(
    ['Rank', 'Destination', 'City / Municipality', 'Visits'],
    rows.map((r) => [r.rank, r.name, r.city, r.visits])
  );
}

export function itinerariesCsv(rows: ItineraryReportRow[]): string {
  return toCsv(
    ['Title', 'Status', 'Featured', 'Stops', 'Duration', 'Tags'],
    rows.map((r) => [r.title, r.status, r.featured, r.stops, r.duration, r.tags])
  );
}

export function distributionCsv(byLgu: DistRow[], byCategory: DistRow[]): string {
  const lgu = toCsv(
    ['City / Municipality', 'Establishments'],
    byLgu.map((r) => [r.label, r.count])
  );
  const cat = toCsv(
    ['Category', 'Establishments'],
    byCategory.map((r) => [r.label, r.count])
  );
  return `${lgu}\n\n${cat}`;
}

export function fullReportCsv(bundle: AnalyticsReportBundle): string {
  const stamp = `Range,${csvCell(bundle.rangeLabel)}\nGenerated,${csvCell(bundle.generatedAt)}\nListed establishments,${bundle.listedPlaces}\n`;
  return `${stamp}\nMost visited destinations\n${visitsCsv(bundle.visits)}\n\nItineraries\n${itinerariesCsv(bundle.itineraries)}\n\nEstablishment distribution\n${distributionCsv(bundle.byLgu, bundle.byCategory)}\n\nAccounts\n${toCsv(
    ['Role', 'Count'],
    bundle.accounts.map((r) => [r.label, r.count])
  )}`;
}

function fileStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function downloadReportCsv(kind: 'visits' | 'itineraries' | 'distribution' | 'all', bundle: AnalyticsReportBundle): void {
  const day = fileStamp();
  if (kind === 'visits') downloadTextFile(`tara-cavite-visits-${day}.csv`, visitsCsv(bundle.visits), 'text/csv;charset=utf-8');
  else if (kind === 'itineraries')
    downloadTextFile(`tara-cavite-itineraries-${day}.csv`, itinerariesCsv(bundle.itineraries), 'text/csv;charset=utf-8');
  else if (kind === 'distribution')
    downloadTextFile(`tara-cavite-establishments-${day}.csv`, distributionCsv(bundle.byLgu, bundle.byCategory), 'text/csv;charset=utf-8');
  else downloadTextFile(`tara-cavite-tourism-report-${day}.csv`, fullReportCsv(bundle), 'text/csv;charset=utf-8');
}

function tableHtml(headers: string[], rows: (string | number)[][]): string {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${headers.length}">No rows</td></tr>`}</tbody></table>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function printAnalyticsPdf(bundle: AnalyticsReportBundle): void {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>Tara, Cavite! tourism report</title>
    <style>
      body { font-family: Poppins, Segoe UI, sans-serif; color: #16352E; margin: 32px; }
      h1 { font-size: 22px; margin: 0 0 4px; }
      p { color: #707D7D; margin: 0 0 20px; font-size: 13px; }
      h2 { font-size: 15px; margin: 28px 0 10px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e4ece9; }
      th { color: #707D7D; font-size: 11px; }
      @media print { body { margin: 16px; } }
    </style></head><body>
    <h1>Tara, Cavite! tourism report</h1>
    <p>${escapeHtml(bundle.rangeLabel)} · generated ${escapeHtml(new Date(bundle.generatedAt).toLocaleString())} · ${bundle.listedPlaces} listed establishments</p>
    <h2>Most visited destinations</h2>
    ${tableHtml(['Rank', 'Destination', 'LGU', 'Visits'], bundle.visits.map((r) => [r.rank, r.name, r.city, r.visits]))}
    <h2>Itineraries</h2>
    ${tableHtml(['Title', 'Status', 'Featured', 'Stops', 'Duration'], bundle.itineraries.map((r) => [r.title, r.status, r.featured, r.stops, r.duration]))}
    <h2>Establishments by LGU</h2>
    ${tableHtml(['LGU', 'Count'], bundle.byLgu.map((r) => [r.label, r.count]))}
    <h2>Establishments by category</h2>
    ${tableHtml(['Category', 'Count'], bundle.byCategory.map((r) => [r.label, r.count]))}
    <h2>Accounts</h2>
    ${tableHtml(['Role', 'Count'], bundle.accounts.map((r) => [r.label, r.count]))}
    </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}
