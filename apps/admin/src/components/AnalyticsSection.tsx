import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  engagementSummary,
  mostSearchedLocations,
  mostVisitedDestinations,
  peakVisitorTimes,
  topRatedDestinations,
  userEngagementTrend,
} from '../data/mockData';
import styles from '../pages/Analytics.module.css';

const PRIMARY = '#6B8E23';
const SECONDARY = '#8FBC2E';

type DateFilter = 'This Month' | '6 Months' | '1 Year';

function scaleByFilter<T extends object>(rows: T[], filter: DateFilter, keys: (keyof T)[]): T[] {
  const factor = filter === 'This Month' ? 0.35 : filter === '1 Year' ? 1.25 : 1;
  return rows.map((row) => {
    const next = { ...row };
    for (const key of keys) {
      const v = row[key];
      if (typeof v === 'number') {
        (next as Record<keyof T, unknown>)[key] = Math.round(v * factor) as T[keyof T];
      }
    }
    return next;
  });
}

export function AnalyticsSection() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('6 Months');

  const visited = useMemo(
    () => scaleByFilter(mostVisitedDestinations, dateFilter, ['visits']),
    [dateFilter]
  );
  const searched = useMemo(
    () => scaleByFilter(mostSearchedLocations, dateFilter, ['searches']),
    [dateFilter]
  );
  const peak = useMemo(() => scaleByFilter(peakVisitorTimes, dateFilter, ['visitors']), [dateFilter]);
  const engagement = useMemo(
    () => scaleByFilter(userEngagementTrend, dateFilter, ['sessions', 'saves', 'itineraries', 'searches']),
    [dateFilter]
  );

  const summary = useMemo(() => {
    const factor = dateFilter === 'This Month' ? 0.35 : dateFilter === '1 Year' ? 1.25 : 1;
    return {
      dailyActiveUsers: Math.round(engagementSummary.dailyActiveUsers * factor),
      avgSessionMinutes: engagementSummary.avgSessionMinutes,
      saveRatePercent: engagementSummary.saveRatePercent,
      searchToDetailPercent: engagementSummary.searchToDetailPercent,
      returningUserPercent: engagementSummary.returningUserPercent,
    };
  }, [dateFilter]);

  return (
    <div className={styles.charts}>
      <div className={styles.header} style={{ marginBottom: 16 }}>
        <div>
          <h2 className={styles.sectionTitle}>Analytics</h2>
          <p className={styles.sectionDesc}>
            Admin view of web and mobile behavior — visits, searches, peak times, ratings, and engagement.
          </p>
        </div>
        <select
          className={styles.filter}
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          aria-label="Analytics date range"
        >
          <option>This Month</option>
          <option>6 Months</option>
          <option>1 Year</option>
        </select>
      </div>

      <ul className={styles.checklist} aria-label="Analytics coverage">
        <li>Most visited destinations</li>
        <li>Most searched locations</li>
        <li>Peak visitor times</li>
        <li>Top-rated destinations</li>
        <li>User engagement analytics</li>
      </ul>

      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Daily active users</span>
          <span className={styles.kpiValue}>{summary.dailyActiveUsers.toLocaleString()}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Avg. session</span>
          <span className={styles.kpiValue}>{summary.avgSessionMinutes} min</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Save rate</span>
          <span className={styles.kpiValue}>{summary.saveRatePercent}%</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Search → detail</span>
          <span className={styles.kpiValue}>{summary.searchToDetailPercent}%</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Returning users</span>
          <span className={styles.kpiValue}>{summary.returningUserPercent}%</span>
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <h3>Most visited destinations</h3>
          <p className={styles.cardHint}>Page and map views per published destination</p>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={visited} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString()} views`, 'Visits']} />
                <Bar dataKey="visits" fill={PRIMARY} radius={[0, 4, 4, 0]} name="Visits" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ol className={styles.rankList}>
            {visited.map((d, i) => (
              <li key={d.name}>
                <span className={styles.rankNum}>{i + 1}</span>
                <span>
                  {d.name}
                  <span className={styles.rankMeta}> · {d.city}</span>
                </span>
                <span className={styles.rankVal}>{d.visits.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className={styles.card}>
          <h3>Most searched locations</h3>
          <p className={styles.cardHint}>Search queries across web and mobile</p>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={searched} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="query" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString()} searches`, 'Volume']} />
                <Bar dataKey="searches" fill={SECONDARY} radius={[0, 4, 4, 0]} name="Searches" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <h3>Peak visitor times</h3>
          <p className={styles.cardHint}>Typical hourly traffic (combined web + app)</p>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={peak}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString()} users`, 'Active']} />
                <Area type="monotone" dataKey="visitors" stroke={PRIMARY} fill="rgba(107, 142, 35, 0.25)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.card}>
          <h3>Top-rated destinations</h3>
          <p className={styles.cardHint}>Average star rating from published reviews</p>
          <ul className={styles.ratedList}>
            {topRatedDestinations.map((d, i) => (
              <li key={d.name} className={styles.ratedItem}>
                <span className={styles.rankNum}>{i + 1}</span>
                <div className={styles.ratedBody}>
                  <span className={styles.ratedName}>{d.name}</span>
                  <span className={styles.ratedMeta}>{d.reviews} reviews</span>
                </div>
                <span className={styles.ratedScore}>
                  {d.rating.toFixed(1)}
                  <span className={styles.star} aria-hidden>
                    ★
                  </span>
                </span>
                <div className={styles.ratingBarTrack} aria-hidden>
                  <div className={styles.ratingBar} style={{ width: `${(d.rating / 5) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.card}>
        <h3>User engagement analytics</h3>
        <p className={styles.cardHint}>Sessions, saves, itinerary builds, and searches over time</p>
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={engagement}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sessions" stroke={PRIMARY} strokeWidth={2} name="Sessions" dot={false} />
              <Line type="monotone" dataKey="searches" stroke="#94a3b8" strokeWidth={2} name="Searches" dot={false} />
              <Line type="monotone" dataKey="saves" stroke={SECONDARY} strokeWidth={2} name="Saves" dot={false} />
              <Line
                type="monotone"
                dataKey="itineraries"
                stroke="#0ea5e9"
                strokeWidth={2}
                name="Itineraries"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
