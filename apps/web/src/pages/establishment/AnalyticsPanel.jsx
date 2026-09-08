import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildCheckinUrl, qrImageUrl } from 'cavitour-shared/placeCheckin';
import dash from '@admin/pages/Dashboard.module.css';
import {
  ANALYTICS_RANGES,
  EMPTY_SNAPSHOT,
  fetchEstablishmentAnalytics,
  fetchOwnCheckinCode,
} from '../../lib/establishmentAnalytics';
import styles from '../EstablishmentPortal.module.css';

const INK = '#111827';
const RATING_COLORS = ['#1B8A70', '#3b82f6', '#a78bfa', '#f59e0b', '#dc2626'];
const MUTED = '#eef2f6';

/** The legend a place with no visits yet still shows, so the card keeps its shape. */
const BLANK_SOURCES = [
  { name: 'QR check-in', value: 0, color: '#e2e8f0' },
  { name: 'Code', value: 0, color: '#e2e8f0' },
  { name: 'Arrived', value: 0, color: '#e2e8f0' },
];
const BLANK_RING = [{ name: 'none', value: 1, color: MUTED }];

function compact(value) {
  return value >= 1000 ? `${Math.round(value / 100) / 10}K` : String(value);
}

function reviewDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

/**
 * The QR image lives on api.qrserver.com, and browsers ignore the download
 * attribute on a cross-origin link, so fetch the bytes and save them instead.
 */
async function downloadQr(url, code) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Could not reach the QR service.');
    const objectUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `cavitour-qr-${code}.png`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank', 'noreferrer');
  }
}

export function AnalyticsPanel({ owner }) {
  const [range, setRange] = useState('month');
  const [data, setData] = useState(EMPTY_SNAPSHOT);
  const [checkin, setCheckin] = useState(null);
  const [loading, setLoading] = useState(true);

  const placeId = owner.staPlaceId;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchEstablishmentAnalytics(placeId, range, owner.id));
    } finally {
      setLoading(false);
    }
  }, [placeId, range, owner.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let alive = true;
    void fetchOwnCheckinCode(placeId).then((row) => {
      if (alive) setCheckin(row);
    });
    return () => {
      alive = false;
    };
  }, [placeId]);

  if (!placeId) {
    return (
      <article className={styles.dossier}>
        <div className={styles.body}>
          <p className={styles.hint}>
            No listing is linked to this account yet, so there is nothing to measure. The Cavite
            Tourism Administration creates it when your establishment is added to the catalog.
          </p>
        </div>
      </article>
    );
  }

  const hasVisits = data.totalVisits > 0;
  const hasReviews = data.totalReviews > 0;
  const hasSources = data.visitsBySource.length > 0;
  const sourceSlices = hasSources ? data.visitsBySource : BLANK_RING;

  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const checkinUrl = checkin?.code ? buildCheckinUrl(origin, checkin.code) : '';
  const qrUrl = checkinUrl ? qrImageUrl(checkinUrl, 280) : '';
  const posterUrl = checkin?.code ? `${origin}/checkin/poster/${encodeURIComponent(checkin.code)}` : '';

  return (
    <div className={dash.page}>
      <div className={dash.pageHead}>
        <span className={dash.live}>
          <span className={dash.liveDot} />
          Live
        </span>
        <select
          className={dash.rangeSelect}
          aria-label="Date range"
          value={range}
          onChange={(e) => setRange(e.target.value)}
        >
          {ANALYTICS_RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {data.blocked ? (
        <p className={dash.loadError}>
          Visitor data is not readable yet. Ask the Cavite Tourism Administration to run
          ESTABLISHMENT_PORTAL.sql, then reload.
        </p>
      ) : null}

      <div className={dash.kpiRow}>
        {data.kpis.map((kpi) => (
          <div key={kpi.key} className={`${dash.kpiCard} ${dash[kpi.tint]}`}>
            <span className={dash.kpiLabel}>{kpi.label}</span>
            <div className={dash.kpiValueRow}>
              <span className={dash.kpiValue}>
                {loading ? '…' : kpi.display ?? kpi.value.toLocaleString()}
              </span>
              {kpi.delta === null ? null : (
                <span className={`${dash.kpiDelta} ${kpi.trend === 'up' ? dash.up : dash.down}`}>
                  {kpi.delta > 0 ? '+' : ''}
                  {kpi.delta}%
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    {kpi.trend === 'up' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M9 7h8v8" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l10 10M17 9v8H9" />
                    )}
                  </svg>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={dash.rowA}>
        <div className={dash.card}>
          <h3 className={dash.cardTitle}>Visitors this year</h3>
          <div className={dash.chartWrap}>
            {/* Always drawn: with no visits yet it reads as an empty chart
                rather than a sentence where the chart should be. */}
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.visitsTrend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[0, hasVisits ? 'auto' : 4]}
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={compact}
                />
                <Tooltip formatter={(v) => v.toLocaleString()} />
                <Line
                  type="monotone"
                  dataKey="visits"
                  stroke={hasVisits ? INK : '#e2e8f0'}
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={dash.card}>
          <h3 className={dash.cardTitle}>Your check-in code</h3>
          {checkinUrl ? (
            <div className={styles.qrBlock}>
              <img className={styles.qrImage} src={qrUrl} alt="Check-in QR code" />
              <p className={styles.qrCode}>{checkin.code}</p>
              <div className={styles.qrActions}>
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={() => void downloadQr(qrUrl, checkin.code)}
                >
                  Download QR
                </button>
                <a className={styles.ghostBtn} href={posterUrl} target="_blank" rel="noreferrer">
                  Print poster
                </a>
              </div>
              <p className={styles.qrHint}>
                Travelers scan this at your entrance to check in. Every scan feeds the numbers above.
              </p>
            </div>
          ) : (
            <p className={dash.emptyNote}>No check-in code has been issued for your listing yet.</p>
          )}
        </div>
      </div>

      <div className={dash.rowB}>
        <div className={dash.card}>
          <h3 className={dash.cardTitle}>Visits by source</h3>
          <div className={dash.deviceWrap}>
            <div className={dash.deviceChart}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={sourceSlices}
                    dataKey="value"
                    innerRadius={54}
                    outerRadius={82}
                    paddingAngle={hasSources ? 2 : 0}
                    stroke="none"
                    isAnimationActive={hasSources}
                  >
                    {sourceSlices.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  {hasSources ? <Tooltip formatter={(v) => `${v}%`} /> : null}
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className={dash.deviceLegend}>
              {(hasSources ? data.visitsBySource : BLANK_SOURCES).map((entry) => (
                <li key={entry.name}>
                  <span className={dash.dot} style={{ background: entry.color }} />
                  <span className={dash.deviceName}>{entry.name}</span>
                  <span className={dash.deviceVal}>{entry.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={dash.card}>
          <h3 className={dash.cardTitle}>Ratings</h3>
          <div className={dash.chartWrap}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.ratingBreakdown} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                <XAxis dataKey="stars" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[0, hasReviews ? 'auto' : 4]}
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                {hasReviews ? <Tooltip formatter={(v) => `${v} reviews`} /> : null}
                <Bar dataKey="reviews" radius={[8, 8, 0, 0]} maxBarSize={38}>
                  {data.ratingBreakdown.map((entry, i) => (
                    <Cell key={entry.stars} fill={RATING_COLORS[i % RATING_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={dash.card}>
        <h3 className={dash.cardTitle}>Latest reviews</h3>
        {data.recentReviews.length === 0 ? (
          <ul className={styles.reviewSkeleton} aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li key={i}>
                <span />
                <span />
              </li>
            ))}
          </ul>
        ) : (
          <ul className={styles.posts}>
            {data.recentReviews.map((review) => (
              <li key={review.id} className={styles.post}>
                <p className={styles.postTitle}>
                  {'★'.repeat(review.rating)}
                  {'☆'.repeat(Math.max(0, 5 - review.rating))}
                </p>
                <p className={styles.postMeta}>
                  {reviewDate(review.createdAt)}
                  {review.isPublished ? '' : ' · Hidden by admin'}
                </p>
                <p className={styles.postBody}>{review.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
