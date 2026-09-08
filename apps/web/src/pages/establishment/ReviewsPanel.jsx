import { useCallback, useEffect, useMemo, useState } from 'react';
import { RowMenu } from '@admin/components/RowMenu';
import { fetchEstablishmentReviews, reportPlaceReview } from '../../lib/establishmentReviews';
import styles from '../EstablishmentPortal.module.css';

function truncate(text, max = 90) {
  const clean = String(text ?? '').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function reviewDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

// `query` comes from the search box in the top bar beside the page title.
export function ReviewsPanel({ owner, query }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [reporting, setReporting] = useState(null);

  const placeId = owner.staPlaceId;

  const reload = useCallback(async () => {
    try {
      setRows(await fetchEstablishmentReviews(placeId, owner.id));
      setError('');
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : 'Could not load reviews.');
    }
  }, [placeId, owner.id]);

  useEffect(() => {
    void (async () => {
      await reload();
    })();
  }, [reload]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => `${row.reviewerName} ${row.body}`.toLowerCase().includes(needle));
  }, [rows, query]);

  const average = rows.length
    ? Math.round((rows.reduce((sum, row) => sum + row.rating, 0) / rows.length) * 10) / 10
    : 0;

  if (!placeId) {
    return (
      <article className={styles.dossier}>
        <div className={styles.body}>
          <p className={styles.hint}>
            No listing is linked to this account yet, so travelers cannot review it.
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className={styles.dossier}>
      <div className={styles.body}>
        <p className={styles.hint}>
          Reviews travelers left on your listing. Only the Cavite Tourism Administration can hide or
          remove one, so report anything that breaks the rules.
        </p>

        {rows.length > 0 ? (
          <p className={styles.summary}>
            {rows.length} {rows.length === 1 ? 'review' : 'reviews'} · average {average} ★
          </p>
        ) : null}

        {error ? <p className={styles.err}>{error}</p> : null}

        {rows.length === 0 ? (
          <p className={styles.empty}>No reviews yet.</p>
        ) : filtered.length === 0 ? (
          <p className={styles.empty}>No reviews match your search.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Reviewer</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{row.reviewerName}</td>
                    <td className={styles.stars}>{row.rating}/5</td>
                    <td className={styles.reviewBody} title={row.body}>
                      {truncate(row.body)}
                      {row.photoCount ? ` · ${row.photoCount} photos` : ''}
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${row.isPublished ? styles.toneGreen : styles.toneNeutral}`}
                      >
                        {row.isPublished ? 'Published' : 'Hidden by admin'}
                      </span>
                    </td>
                    <td>{reviewDate(row.createdAt)}</td>
                    <td>
                      <div className={styles.rowTools}>
                        {row.reported ? (
                          <span className={`${styles.badge} ${styles.toneAmber}`}>Reported</span>
                        ) : (
                          <RowMenu
                            label={`More actions for the review by ${row.reviewerName}`}
                            items={[
                              {
                                label: 'Report to admin',
                                onSelect: () => setReporting(row),
                              },
                            ]}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reporting ? (
        <ReportDialog
          review={reporting}
          ownerId={owner.id}
          onClose={() => setReporting(null)}
          onSent={() => {
            setReporting(null);
            void reload();
          }}
        />
      ) : null}
    </article>
  );
}

function ReportDialog({ review, ownerId, onClose, onSent }) {
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !sending) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sending, onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await reportPlaceReview(review.id, ownerId, reason);
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the report.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={() => {
        if (!sending) onClose();
      }}
    >
      <form
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-review-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 id="report-review-title" className={styles.modalTitle}>
          Report this review
        </h2>
        <p className={styles.hint}>
          The tourism office reviews the report and decides whether to hide it. The review stays
          visible until then.
        </p>
        <label className={styles.field}>
          <span className={styles.label}>What is wrong with it?</span>
          <textarea
            className={styles.textarea}
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. This review is about a different establishment."
            disabled={sending}
            required
            autoFocus
          />
        </label>
        {error ? <p className={styles.err}>{error}</p> : null}
        <div className={styles.modalActions}>
          <button type="button" className={styles.ghostBtn} onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button type="submit" className={styles.primaryBtn} disabled={sending}>
            {sending ? 'Sending…' : 'Send report'}
          </button>
        </div>
      </form>
    </div>
  );
}
