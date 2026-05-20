import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminListPage, StatusBadge } from '../components/AdminListPage';
import listStyles from '../components/AdminListPage.module.css';
import { fetchAdminItineraries, type ItineraryRow } from '../lib/adminRecords';
import { supabase } from '../lib/supabase';

export function MobileItineraries() {
  const [rows, setRows] = useState<ItineraryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savesTableReady, setSavesTableReady] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminItineraries(supabase);
      setRows(result.rows);
      setSavesTableReady(result.savesTableReady);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load itineraries');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const published = rows.filter((i) => i.status === 'published').length;
  const featured = rows.filter((i) => i.featured).length;

  const stats = useMemo(
    () => [
      { label: 'Curated routes', value: loading ? '…' : published },
      { label: 'Featured', value: loading ? '…' : featured },
      {
        label: 'Saved in lists',
        value: loading ? '…' : rows.filter((r) => r.owner.includes('user lists')).length,
      },
    ],
    [rows, published, featured, loading]
  );

  return (
    <AdminListPage<ItineraryRow>
      title="Itineraries"
      description="Curated day-trip routes shown in the mobile and web apps."
      sourceNote={
        loading
          ? 'Loading…'
          : !savesTableReady
            ? `App catalog · ${rows.length} route${rows.length === 1 ? '' : 's'} (user saves sync when list migration is applied)`
            : rows.length > 0
              ? `App catalog · ${rows.length} route${rows.length === 1 ? '' : 's'}`
              : 'No curated routes configured.'
      }
      rows={rows}
      loading={loading}
      error={error}
      stats={stats}
      searchPlaceholder="Search by title or ref…"
      filterRow={(row, q) =>
        [row.title, row.id, row.owner, row.dates].some((s) => s.toLowerCase().includes(q))
      }
      statusFilter={{
        label: 'Status',
        options: [
          { value: 'published', label: 'Curated' },
          { value: 'draft', label: 'Ref only' },
        ],
        match: (row, value) => row.status === value,
      }}
      emptyMessage="No itinerary data yet."
      columns={[
        {
          key: 'title',
          header: 'Itinerary',
          render: (row) => (
            <div className={listStyles.nameCell}>
              <strong>
                {row.title}
                {row.featured && <span className={listStyles.tag}>Featured</span>}
              </strong>
              <span>{row.route}</span>
            </div>
          ),
        },
        {
          key: 'stops',
          header: 'Stops',
          render: (row) => (row.stops > 0 ? `${row.stops} stops` : '—'),
        },
        { key: 'dates', header: 'Duration', render: (row) => row.dates },
        {
          key: 'status',
          header: 'Status',
          render: (row) => <StatusBadge status={row.status} />,
        },
        { key: 'saves', header: 'In lists', render: (row) => row.owner },
      ]}
    />
  );
}
