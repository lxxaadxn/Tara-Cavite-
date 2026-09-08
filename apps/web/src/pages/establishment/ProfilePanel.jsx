import {
  PROFILE_ROWS,
  accountBadge,
  listingBadge,
  ownerInitials,
  recognitionBadge,
} from './ownerDisplay';
import styles from '../EstablishmentPortal.module.css';

const TONE = {
  green: styles.toneGreen,
  amber: styles.toneAmber,
  red: styles.toneRed,
  neutral: styles.toneNeutral,
};

function isUrl(value) {
  return /^https?:\/\//i.test(value);
}

/** A pasted Maps link is unreadable in full, so show where it goes instead. */
function linkLabel(url) {
  if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(url)) {
    return 'Open in Google Maps';
  }
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function RowValue({ kind, value }) {
  if (!value) return <span className={styles.profileEmpty}>—</span>;
  if (kind === 'email') {
    return (
      <a className={styles.profileLink} href={`mailto:${value}`}>
        {value}
      </a>
    );
  }
  if (kind === 'phone') {
    return (
      <a className={styles.profileLink} href={`tel:${value.replace(/\s+/g, '')}`}>
        {value}
      </a>
    );
  }
  // Owners sometimes paste a Maps link into a text field such as Address, so
  // any value that is really a URL is treated as one whatever its kind says.
  if (isUrl(value)) {
    return (
      <a className={styles.profileLink} href={value} target="_blank" rel="noreferrer" title={value}>
        {linkLabel(value)}
      </a>
    );
  }
  return value;
}

export function ProfilePanel({ owner }) {
  const mark = ownerInitials(owner.businessName);
  const placeLine =
    [owner.businessType, owner.lgu].filter(Boolean).join(' · ') || 'No category or LGU yet';

  const statuses = [
    { title: 'Account', ...accountBadge(owner) },
    { title: 'Recognition', ...recognitionBadge(owner) },
    { title: 'Listing', ...listingBadge(owner) },
  ];

  return (
    <div className={styles.stack}>
      <article className={styles.dossier}>
        <header className={styles.mast}>
          <div className={styles.avatar} aria-hidden="true">
            {mark}
          </div>
          <div>
            <span className={styles.eyebrow}>Establishment account</span>
            <h2 className={styles.name}>{owner.businessName}</h2>
            <p className={styles.meta}>{placeLine}</p>
          </div>
          <div className={styles.mastStamps} aria-label="Account status">
            {statuses.map((status) => (
              <div key={status.title} className={styles.mastStamp}>
                <span className={styles.stampLabel}>{status.title}</span>
                <span className={`${styles.badge} ${TONE[status.tone]}`}>{status.label}</span>
              </div>
            ))}
          </div>
        </header>

        <div className={styles.body}>
          <dl className={styles.profileGrid}>
            {PROFILE_ROWS.map((row) => (
              <div
                key={row.label}
                className={`${styles.profileRow} ${row.wide ? styles.profileRowWide : ''}`}
              >
                <dt className={styles.profileLabel}>{row.label}</dt>
                <dd className={styles.profileValue}>
                  <RowValue kind={row.kind} value={row.value(owner)} />
                </dd>
              </div>
            ))}
          </dl>

          <p className={styles.footnote}>
            The Cavite Tourism Administration controls whether this account is active and what is
            publicly visible.
          </p>
        </div>
      </article>
    </div>
  );
}
