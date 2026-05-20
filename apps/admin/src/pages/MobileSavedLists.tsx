import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminListPage, StatusBadge } from '../components/AdminListPage';
import listStyles from '../components/AdminListPage.module.css';
import { fetchAdminSavedLists, type SavedListRow } from '../lib/adminRecords';
import { supabase } from '../lib/supabase';

export function MobileSavedLists() {
  const [rows, setRows] = useState<SavedListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchAdminSavedLists(supabase));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load saved lists';
      setError(
        msg.includes('policy') || msg.includes('JWT')
          ? `${msg} — sign in as an admin and run migration 20260520120000_admin_read_lists.sql.`
          : msg
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shared = rows.filter((l) => l.visibility === 'shared').length;

  const stats = useMemo(
    () => [
      { label: 'Total lists', value: loading ? '…' : rows.length },
      { label: 'Shared', value: loading ? '…' : shared },
      { label: 'Private', value: loading ? '…' : rows.length - shared },
    ],
    [rows.length, shared, loading]
  );

  return (
    <AdminListPage<SavedListRow>
      title="Saved lists"
      rows={rows}
      loading={loading}
      error={error}
      stats={stats}
      searchPlaceholder="Search by list name or owner…"
      filterRow={(row, q) => [row.name, row.owner].some((s) => s.toLowerCase().includes(q))}
      statusFilter={{
        label: 'Visibility',
        options: [
          { value: 'shared', label: 'Shared' },
          { value: 'private', label: 'Private' },
        ],
        match: (row, value) => row.visibility === value,
      }}
      emptyMessage="No saved lists in Supabase yet."
      columns={[
        {
          key: 'name',
          header: 'List',
          render: (row) => (
            <div className={listStyles.nameCell}>
              <strong>{row.name}</strong>
              <span>{row.owner}</span>
            </div>
          ),
        },
        {
          key: 'items',
          header: 'Items',
          render: (row) => `${row.items} saved`,
        },
        {
          key: 'visibility',
          header: 'Visibility',
          render: (row) => <StatusBadge status={row.visibility} tone={row.visibility} />,
        },
        { key: 'updated', header: 'Updated', render: (row) => row.updated },
      ]}
    />
  );
}
