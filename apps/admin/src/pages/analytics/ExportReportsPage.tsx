import { useCallback, useEffect, useState } from 'react';
import { usePageHeader } from '../../contexts/PageHeaderContext';
import { useToast } from '../../components/Toast';
import {
  type AnalyticsReportBundle,
  type ReportRange,
  downloadReportCsv,
  fetchAnalyticsReportBundle,
  printAnalyticsPdf,
  reportRangeLabel,
} from '../../lib/adminAnalyticsExport';
import { supabase } from '../../lib/supabase';
import table from '../users/UsersAdmin.module.css';
import styles from './ExportReportsPage.module.css';

export function ExportReportsPage() {
  const toast = useToast();
  usePageHeader('Export reports', null);

  const [range, setRange] = useState<ReportRange>('quarter');
  const [bundle, setBundle] = useState<AnalyticsReportBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBundle(await fetchAnalyticsReportBundle(supabase, range));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build report');
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const exportKind = (kind: 'visits' | 'itineraries' | 'distribution' | 'all') => {
    if (!bundle) return;
    downloadReportCsv(kind, bundle);
    toast('Report downloaded', 'success');
  };

  const printPdf = () => {
    if (!bundle) return;
    printAnalyticsPdf(bundle);
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <select
          className={styles.select}
          value={range}
          onChange={(e) => setRange(e.target.value as ReportRange)}
          aria-label="Date range"
        >
          <option value="month">This month</option>
          <option value="quarter">This quarter</option>
          <option value="year">This year</option>
          <option value="all">All time</option>
        </select>
        <button type="button" className={table.actionBtn} onClick={() => void reload()} disabled={loading}>
          Refresh
        </button>
        <button type="button" className={table.actionBtn} onClick={printPdf} disabled={!bundle || loading}>
          Print PDF
        </button>
        <button type="button" className={table.primaryBtn} onClick={() => exportKind('all')} disabled={!bundle || loading}>
          Download all CSV
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      <p className={styles.hint}>
        {loading
          ? 'Building report from live visits, itineraries, and the STA catalog…'
          : `${reportRangeLabel(range)} · check-ins for visits, published catalog for distribution`}
      </p>

      {bundle ? (
        <div className={styles.kpis}>
          <div className={styles.kpi}>
            <span>Check-ins in range</span>
            <strong>{bundle.visits.reduce((n, r) => n + r.visits, 0).toLocaleString()}</strong>
          </div>
          <div className={styles.kpi}>
            <span>Itineraries</span>
            <strong>{bundle.itineraries.length.toLocaleString()}</strong>
          </div>
          <div className={styles.kpi}>
            <span>Listed establishments</span>
            <strong>{bundle.listedPlaces.toLocaleString()}</strong>
          </div>
          <div className={styles.kpi}>
            <span>Accounts</span>
            <strong>{bundle.accounts.reduce((n, r) => n + r.count, 0).toLocaleString()}</strong>
          </div>
        </div>
      ) : null}

      <div className={styles.grid}>
        <section className={styles.card}>
          <header className={styles.cardHead}>
            <div>
              <h2>Most visited destinations</h2>
              <p>QR and destination-reached check-ins in the selected range.</p>
            </div>
            <div className={styles.actions}>
              <button type="button" className={table.actionBtn} onClick={() => exportKind('visits')} disabled={!bundle || loading}>
                Export CSV
              </button>
            </div>
          </header>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Destination</th>
                  <th>LGU</th>
                  <th>Visits</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className={styles.empty}>
                      Loading visits…
                    </td>
                  </tr>
                ) : !bundle?.visits.length ? (
                  <tr>
                    <td colSpan={4} className={styles.empty}>
                      No check-ins in this range.
                    </td>
                  </tr>
                ) : (
                  bundle.visits.map((row) => (
                    <tr key={`${row.rank}-${row.name}`}>
                      <td>{row.rank}</td>
                      <td>{row.name}</td>
                      <td>{row.city}</td>
                      <td>{row.visits.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.card}>
          <header className={styles.cardHead}>
            <div>
              <h2>Itineraries</h2>
              <p>Admin-created routes currently in the catalog.</p>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={table.actionBtn}
                onClick={() => exportKind('itineraries')}
                disabled={!bundle || loading}
              >
                Export CSV
              </button>
            </div>
          </header>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th>Stops</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className={styles.empty}>
                      Loading itineraries…
                    </td>
                  </tr>
                ) : !bundle?.itineraries.length ? (
                  <tr>
                    <td colSpan={5} className={styles.empty}>
                      No itineraries yet.
                    </td>
                  </tr>
                ) : (
                  bundle.itineraries.map((row) => (
                    <tr key={row.title + row.status}>
                      <td>{row.title}</td>
                      <td>{row.status}</td>
                      <td>{row.featured}</td>
                      <td>{row.stops}</td>
                      <td>{row.duration}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.card}>
          <header className={styles.cardHead}>
            <div>
              <h2>Establishment distribution</h2>
              <p>Listed STA catalog counts by LGU and category.</p>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={table.actionBtn}
                onClick={() => exportKind('distribution')}
                disabled={!bundle || loading}
              >
                Export CSV
              </button>
            </div>
          </header>
          <div className={styles.split}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>City / Municipality</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={2} className={styles.empty}>
                        Loading…
                      </td>
                    </tr>
                  ) : !bundle?.byLgu.length ? (
                    <tr>
                      <td colSpan={2} className={styles.empty}>
                        No listed establishments.
                      </td>
                    </tr>
                  ) : (
                    bundle.byLgu.map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        <td>{row.count.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={2} className={styles.empty}>
                        Loading…
                      </td>
                    </tr>
                  ) : !bundle?.byCategory.length ? (
                    <tr>
                      <td colSpan={2} className={styles.empty}>
                        No listed establishments.
                      </td>
                    </tr>
                  ) : (
                    bundle.byCategory.map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        <td>{row.count.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
