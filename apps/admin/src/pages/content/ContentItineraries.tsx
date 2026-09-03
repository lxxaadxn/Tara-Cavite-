import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CrudBadge } from '../../components/ContentCrudPage';
import listStyles from '../../components/ContentCrudPage.module.css';
import { useAdminHref } from '../../contexts/AdminPathPrefixContext';
import { useToast } from '../../components/Toast';
import {
  deleteAdminItinerary,
  fetchAdminItineraries,
  subscribeAdminItineraries,
  type AdminItinerary,
  type AdminItineraryStatus,
} from '../../lib/adminItineraries';

const STATUS_TONE: Record<AdminItineraryStatus, 'green' | 'amber' | 'red'> = {
  published: 'green',
  draft: 'amber',
  flagged: 'red',
};

export function ContentItineraries() {
  const href = useAdminHref;
  const toast = useToast();
  const [rows, setRows] = useState<AdminItinerary[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    fetchAdminItineraries()
      .then(setRows)
      .catch((e) => toast(e instanceof Error ? e.message : 'Could not load itineraries', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    return subscribeAdminItineraries(() => {
      fetchAdminItineraries().then(setRows).catch(() => {});
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== 'all' && row.status !== status) return false;
      if (!q) return true;
      return [row.title, row.route, row.status, row.subtitle].some((v) =>
        String(v ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, query, status]);

  const confirmRemove = async () => {
    if (!pendingDelete) return;
    try {
      await deleteAdminItinerary(pendingDelete.id);
      setRows((prev) => prev.filter((r) => r.id !== pendingDelete.id));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete itinerary', 'error');
    }
    setPendingDelete(null);
  };

  return (
    <div className={listStyles.page}>
      <div className={listStyles.toolbar}>
        <div className={listStyles.tabs} role="tablist" aria-label="Status filter">
          {[
            { value: 'all', label: 'All' },
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Draft' },
            { value: 'flagged', label: 'Flagged' },
          ].map((o) => (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={status === o.value}
              className={`${listStyles.tab} ${status === o.value ? listStyles.tabActive : ''}`}
              onClick={() => setStatus(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className={listStyles.toolbarRight}>
          <label className={listStyles.search}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className={listStyles.tableWrap}>
        <table className={listStyles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Route</th>
              <th>Stops</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className={listStyles.rowCard}>
                <td colSpan={5} className={listStyles.empty}>
                  {loading ? 'Loading itineraries…' : 'No records match your search.'}
                </td>
              </tr>
            ) : (
              filtered.map((row: AdminItinerary) => (
                <tr key={row.id} className={listStyles.rowCard}>
                  <td>
                    <strong>{row.title}</strong>
                  </td>
                  <td>{row.route || row.subtitle || '—'}</td>
                  <td>{row.stopList.length}</td>
                  <td>
                    <CrudBadge label={row.status} tone={STATUS_TONE[row.status]} />
                  </td>
                  <td>
                    <div className={listStyles.actions}>
                      <Link
                        to={href(`/web/itineraries/created/${row.id}/edit`)}
                        className={listStyles.actionBtn}
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        className={`${listStyles.actionBtn} ${listStyles.danger}`}
                        onClick={() => setPendingDelete({ id: row.id, label: row.title })}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete?.label ? `Delete “${pendingDelete.label}”?` : 'Delete this itinerary?'}
        message="This removes it for all accounts. Published traveler apps will stop showing it."
        onConfirm={confirmRemove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
