import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { usePageHeader } from '../../contexts/PageHeaderContext';
import { useToast } from '../../components/Toast';
import {
  type AdminPlaceReview,
  deleteAdminPlaceReview,
  fetchAdminPlaceReviews,
  formatAdminDate,
  setAdminPlaceReviewPublished,
} from '../../lib/adminPlaceReviews';
import { supabase } from '../../lib/supabase';
import crud from '../../components/ContentCrudPage.module.css';
import { RowMenu } from '../../components/RowMenu';
import { EyeIcon } from '../../components/rowIcons';
import styles from '../users/UsersAdmin.module.css';

type Visibility = 'all' | 'published' | 'hidden';

export function TourismReviews() {
  const toast = useToast();
  usePageHeader('Reviews', null);

  const [rows, setRows] = useState<AdminPlaceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('all');
  const [pending, setPending] = useState<AdminPlaceReview | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchAdminPlaceReviews(supabase));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (visibility === 'published' && !row.isPublished) return false;
      if (visibility === 'hidden' && row.isPublished) return false;
      if (!needle) return true;
      return `${row.placeName} ${row.reviewerName} ${row.body}`.toLowerCase().includes(needle);
    });
  }, [rows, query, visibility]);

  const publishedCount = rows.filter((r) => r.isPublished).length;

  const togglePublished = async (row: AdminPlaceReview) => {
    try {
      await setAdminPlaceReviewPublished(supabase, row.id, !row.isPublished);
      toast(row.isPublished ? 'Review hidden from travelers' : 'Review published', 'success');
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update review', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      await deleteAdminPlaceReview(supabase, pending.id);
      toast('Review deleted', 'success');
      setPending(null);
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete review', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <label className={styles.search}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="Search establishment, reviewer, text…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          className={styles.search}
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as Visibility)}
          aria-label="Visibility"
          style={{ maxWidth: 180, borderRadius: 12 }}
        >
          <option value="all">All reviews</option>
          <option value="published">Published</option>
          <option value="hidden">Hidden</option>
        </select>
      </header>

      {error ? <p className={styles.loadError}>{error}</p> : null}

      <p className={styles.userMeta} style={{ margin: '0 0 12px' }}>
        {loading ? 'Loading…' : `${rows.length} reviews · ${publishedCount} published · ${rows.length - publishedCount} hidden`}
      </p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Establishment</th>
              <th>Reviewer</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Status</th>
              <th>Date</th>
              <th className={crud.actionsHead}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className={styles.rowCard}>
                <td colSpan={7} className={styles.empty}>
                  Loading reviews from Supabase…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr className={styles.rowCard}>
                <td colSpan={7} className={styles.empty}>
                  No reviews match your search.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className={styles.rowCard}>
                  <td>
                    <span className={styles.userName}>{row.placeName}</span>
                  </td>
                  <td>{row.reviewerName}</td>
                  <td>{row.rating}/5</td>
                  <td>
                    <span className={styles.userMeta} title={row.body}>
                      {row.body.length > 90 ? `${row.body.slice(0, 90)}…` : row.body || '—'}
                      {row.photoCount > 0 ? ` · ${row.photoCount} photo${row.photoCount === 1 ? '' : 's'}` : ''}
                    </span>
                  </td>
                  <td>
                    {row.isPublished ? (
                      <span className={`${styles.badge} ${styles.tone_green}`}>Published</span>
                    ) : (
                      <span className={`${styles.badge} ${styles.tone_neutral}`}>Hidden</span>
                    )}
                  </td>
                  <td>{formatAdminDate(row.createdAt)}</td>
                  <td className={crud.actionsHead}>
                    <div className={crud.rowTools}>
                      <button
                        type="button"
                        className={crud.iconBtn}
                        aria-label={`${row.isPublished ? 'Hide' : 'Show'} the review by ${row.reviewerName}`}
                        title={row.isPublished ? 'Hide review' : 'Show review'}
                        onClick={() => void togglePublished(row)}
                      >
                        <EyeIcon hidden={row.isPublished} />
                      </button>
                      <RowMenu
                        label={`More actions for the review by ${row.reviewerName}`}
                        items={[{ label: 'Delete', onSelect: () => setPending(row), danger: true }]}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending ? `Delete review of “${pending.placeName}”?` : 'Delete this review?'}
        message="This permanently removes the traveler’s review. This cannot be undone."
        confirmLabel="Delete"
        confirmingLabel="Deleting…"
        confirming={saving}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!saving) setPending(null);
        }}
      />
    </div>
  );
}
