import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { businessApplications, type ApplicationStatus } from '../data/mockData';
import { useAdminPathPrefix } from '../contexts/AdminPathPrefixContext';
import styles from './ApplicationReview.module.css';

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: 'Pending Review',
  under_review: 'Under Review',
  approved: 'Approved',
};

const STATUS_CLASS: Record<ApplicationStatus, string> = {
  pending: 'pending',
  under_review: 'review',
  approved: 'approved',
};

const DOCUMENTS = [
  { label: 'Business permit', done: true },
  { label: 'Mayor’s / LGU clearance', done: true },
  { label: 'DTI / SEC registration', done: true },
  { label: 'Location & geotag proof', done: false },
  { label: 'Photos of establishment', done: true },
];

export function ApplicationReview() {
  const prefix = useAdminPathPrefix();
  const inboxHref = `${prefix ? prefix.replace(/\/$/, '') : ''}/web/business/inbox`;
  const { id } = useParams<{ id: string }>();

  const app = useMemo(() => {
    if (id) return businessApplications.find((a) => a.id === id) ?? null;
    return businessApplications.find((a) => a.status === 'pending') ?? businessApplications[0] ?? null;
  }, [id]);

  const [decision, setDecision] = useState<string | null>(null);

  if (!app) {
    return (
      <div className={styles.page}>
        <Link to={inboxHref} className={styles.back}>
          ← Back to Inbox Queue
        </Link>
        <p className={styles.empty}>Application not found. Pick one from the Inbox Queue.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link to={inboxHref} className={styles.back}>
        ← Back to Inbox Queue
      </Link>

      <div className={styles.head}>
        <div>
          <span className={styles.kicker}>Application Review</span>
          <h1 className={styles.title}>{app.business}</h1>
          <p className={styles.ref}>{app.reference}</p>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles[STATUS_CLASS[app.status]]}`}>
            {STATUS_LABEL[app.status]}
          </span>
          {app.flagged ? <span className={`${styles.badge} ${styles.flagged}`}>Flagged</span> : null}
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.col}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Application details</h3>
            <dl className={styles.detailList}>
              <div className={styles.detailRow}>
                <dt>Business name</dt>
                <dd>{app.business}</dd>
              </div>
              <div className={styles.detailRow}>
                <dt>Reference</dt>
                <dd>{app.reference}</dd>
              </div>
              <div className={styles.detailRow}>
                <dt>Type</dt>
                <dd>{app.type}</dd>
              </div>
              <div className={styles.detailRow}>
                <dt>LGU / City</dt>
                <dd>{app.lgu}</dd>
              </div>
              <div className={styles.detailRow}>
                <dt>Submitted</dt>
                <dd>{app.submitted}</dd>
              </div>
              <div className={styles.detailRow}>
                <dt>Contact</dt>
                <dd>{app.contact}</dd>
              </div>
            </dl>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Documents</h3>
            <ul className={styles.docList}>
              {DOCUMENTS.map((doc) => (
                <li key={doc.label} className={styles.docItem}>
                  <span className={`${styles.docMark} ${doc.done ? styles.docDone : styles.docMissing}`} aria-hidden>
                    {doc.done ? '✓' : '!'}
                  </span>
                  <span>{doc.label}</span>
                  <span className={styles.docStatus}>{doc.done ? 'Submitted' : 'Missing'}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.col}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Decision</h3>
            {decision ? <p className={styles.decisionNote}>{decision}</p> : null}
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.approve}`}
                onClick={() => setDecision(`Approved ${app.business}. (Demo only — wire to backend later.)`)}
              >
                Approve
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.reject}`}
                onClick={() => setDecision(`Rejected ${app.business}. (Demo only — wire to backend later.)`)}
              >
                Reject
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.flag}`}
                onClick={() => setDecision(`Flagged ${app.business} for follow-up. (Demo only.)`)}
              >
                Flag
              </button>
            </div>
            <label className={styles.notesLabel}>
              Reviewer notes
              <textarea className={styles.notes} rows={5} placeholder="Add notes about this application…" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
