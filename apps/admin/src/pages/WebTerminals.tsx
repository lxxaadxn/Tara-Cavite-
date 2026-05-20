import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminListPage, StatusBadge } from '../components/AdminListPage';
import listStyles from '../components/AdminListPage.module.css';
import { fetchAdminTerminals, type TerminalRow } from '../lib/adminRecords';
import { supabase } from '../lib/supabase';

export function WebTerminals() {
  const [rows, setRows] = useState<TerminalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchAdminTerminals(supabase));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load terminals');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const published = rows.filter((t) => t.status === 'published').length;
  const draft = rows.filter((t) => t.status === 'draft').length;

  const stats = useMemo(
    () => [
      { label: 'Total terminals', value: loading ? '…' : rows.length },
      { label: 'With routes', value: loading ? '…' : published },
      { label: 'Needs routes', value: loading ? '…' : draft },
    ],
    [rows.length, published, draft, loading]
  );

  return (
    <AdminListPage<TerminalRow>
      title="Terminals"
      rows={rows}
      loading={loading}
      error={error}
      stats={stats}
      searchPlaceholder="Search by name, city, or route…"
      filterRow={(row, q) =>
        [row.name, row.city, row.route].some((s) => s.toLowerCase().includes(q))
      }
      statusFilter={{
        label: 'Status',
        options: [
          { value: 'published', label: 'With routes' },
          { value: 'draft', label: 'Needs routes' },
        ],
        match: (row, value) => row.status === value,
      }}
      emptyMessage="No terminals found. Import terminal_dataset_seed.sql in Supabase if this is empty."
      columns={[
        {
          key: 'name',
          header: 'Terminal',
          render: (row) => (
            <div className={listStyles.nameCell}>
              <strong>{row.name}</strong>
              <span>{row.city}</span>
            </div>
          ),
        },
        { key: 'route', header: 'Route', render: (row) => row.route },
        {
          key: 'hours',
          header: 'Service hours',
          render: (row) => row.updated,
        },
        {
          key: 'status',
          header: 'Status',
          render: (row) => (
            <StatusBadge
              status={row.status === 'published' ? 'Live' : 'Needs routes'}
              tone={row.status}
            />
          ),
        },
      ]}
    />
  );
}
