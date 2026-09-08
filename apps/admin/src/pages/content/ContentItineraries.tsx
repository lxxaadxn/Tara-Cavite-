import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CrudBadge } from '../../components/ContentCrudPage';
import listStyles from '../../components/ContentCrudPage.module.css';
import { RowMenu } from '../../components/RowMenu';
import { PencilIcon } from '../../components/rowIcons';
import { useToast } from '../../components/Toast';
import {
  deleteAdminItinerary,
  fetchAdminItineraries,
  subscribeAdminItineraries,
  type AdminItinerary,
  type AdminItineraryStatus,
} from '../../lib/adminItineraries';
import { ItineraryEditorPage } from './ItineraryEditorPage';

const STATUS_TONE: Record<AdminItineraryStatus, 'green' | 'amber' | 'red'> = {
  published: 'green',
  draft: 'amber',
  flagged: 'red',
};

export function ContentItineraries() {
  const toast = useToast();
  const [rows, setRows] = useState<AdminItinerary[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
  const [loading, setLoading] = useState(true);
  /** `undefined` = closed; `null` = create; string = edit that id */
  const [editorId, setEditorId] = useState<string | null | undefined>(undefined);

  const editorOpen = editorId !== undefined;
  const isEditing = typeof editorId === 'string';

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

  useEffect(() => {
    if (!editorOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditorId(undefined);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editorOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== 'all' && row.status !== status) return false;
      if (!q) return true;
      return [row.title, row.route, row.status, row.subtitle, row.durationLabel, ...(row.tags ?? [])].some(
        (v) => String(v ?? '').toLowerCase().includes(q)
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

  const closeEditor = () => {
    setEditorId(undefined);
    reload();
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
          <button type="button" className={listStyles.primaryBtn} onClick={() => setEditorId(null)}>
            + New Itinerary
          </button>
        </div>
      </div>

      <div className={listStyles.tableWrap}>
        <table className={listStyles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Route</th>
              <th>Categories</th>
              <th>Duration</th>
              <th>Stops</th>
              <th>Status</th>
              <th className={listStyles.actionsHead}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className={listStyles.rowCard}>
                <td colSpan={7} className={listStyles.empty}>
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
                  <td>
                    {row.tags?.length ? (
                      <div className={listStyles.catTags}>
                        {row.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className={listStyles.catTag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{row.durationLabel?.trim() || '—'}</td>
                  <td>{row.stopList.length}</td>
                  <td>
                    <CrudBadge label={row.status} tone={STATUS_TONE[row.status]} />
                  </td>
                  <td className={listStyles.actionsHead}>
                    <div className={listStyles.rowTools}>
                      <button
                        type="button"
                        className={listStyles.iconBtn}
                        aria-label={`Edit ${row.title}`}
                        title="Edit"
                        onClick={() => setEditorId(row.id)}
                      >
                        <PencilIcon />
                      </button>
                      <RowMenu
                        label={`More actions for ${row.title}`}
                        items={[
                          {
                            label: 'Delete',
                            onSelect: () => setPendingDelete({ id: row.id, label: row.title }),
                            danger: true,
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editorOpen ? (
        <div
          className={listStyles.overlay}
          role="presentation"
          onClick={() => setEditorId(undefined)}
        >
          <div
            className={`${listStyles.modal} ${listStyles.modalItinerary}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="itinerary-editor-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={listStyles.modalItineraryHead}>
              <h2 id="itinerary-editor-modal-title">
                {isEditing ? 'Edit Itinerary' : 'Create Itinerary'}
              </h2>
              <button
                type="button"
                className={listStyles.modalItineraryClose}
                aria-label="Close itinerary editor"
                onClick={() => setEditorId(undefined)}
              >
                ×
              </button>
            </div>
            <div className={listStyles.modalItineraryBody}>
              <ItineraryEditorPage
                key={isEditing ? editorId : 'new'}
                id={isEditing ? editorId : null}
                embedded
                onClose={closeEditor}
              />
            </div>
          </div>
        </div>
      ) : null}

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
