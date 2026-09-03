import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { usePageHeader } from '../contexts/PageHeaderContext';
import {
  type OverviewRange,
  type OverviewSnapshot,
  fetchAnalyticsOverview,
  subscribeAnalyticsOverview,
} from '../lib/adminOverview';
import { supabase } from '../lib/supabase';
import styles from './Dashboard.module.css';

const INK = '#111827';
const PRIMARY = '#1B8A70';
const BLUE = '#3b82f6';

const RATED_COLORS = ['#a78bfa', PRIMARY, INK, BLUE, '#a78bfa', PRIMARY];
const VISITED_COLORS = [BLUE, PRIMARY, INK, BLUE, '#a78bfa', PRIMARY, INK, BLUE, '#a78bfa', BLUE, INK, PRIMARY];

const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`);

const EMPTY: OverviewSnapshot = {
  kpis: [
    { key: 'views', label: 'Arrivals', value: 0, delta: 0, trend: 'up', tint: 'slate' },
    { key: 'visits', label: 'Check-ins', value: 0, delta: 0, trend: 'up', tint: 'blue' },
    { key: 'newUsers', label: 'New users', value: 0, delta: 0, trend: 'up', tint: 'green' },
    { key: 'activeUsers', label: 'Active travelers', value: 0, delta: 0, trend: 'up', tint: 'sky' },
  ],
  usersTrend: [],
  peakMonths: [],
  engagement: [],
  trafficByCity: [],
  topRated: [],
  trafficBySource: [],
  monthlyVisited: [],
  updatedAt: '',
};

type ChartTab = 'total' | 'peak' | 'engagement';

const TABS: { id: ChartTab; label: string }[] = [
  { id: 'total', label: 'New accounts' },
  { id: 'peak', label: 'Peak months' },
  { id: 'engagement', label: 'Engagement' },
];

export function Dashboard() {
  usePageHeader('Overview', null);
  const [tab, setTab] = useState<ChartTab>('total');
  const [range, setRange] = useState<OverviewRange>('month');
  const [data, setData] = useState<OverviewSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await fetchAnalyticsOverview(supabase, range);
      setData(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load analytics');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    return subscribeAnalyticsOverview(supabase, () => {
      void load();
    });
  }, [load]);

  const chart = useMemo(() => {
    if (tab === 'peak') {
      return {
        data: data.peakMonths,
        xKey: 'label',
        lines: [{ key: 'visitors', color: PRIMARY, dashed: false }],
        showLegend: false,
      };
    }
    if (tab === 'engagement') {
      return {
        data: data.engagement,
        xKey: 'period',
        lines: [
          { key: 'visits', color: INK, dashed: false },
          { key: 'reviews', color: BLUE, dashed: true },
        ],
        showLegend: false,
      };
    }
    return {
      data: data.usersTrend,
      xKey: 'month',
      lines: [
        { key: 'thisYear', color: INK, dashed: false },
        { key: 'lastYear', color: '#94a3b8', dashed: true },
      ],
      showLegend: true,
    };
  }, [tab, data]);

  return (
    <div className={styles.page} id="analytics">
      <div className={styles.pageHead}>
        <span className={styles.live} title={data.updatedAt ? `Updated ${new Date(data.updatedAt).toLocaleTimeString()}` : undefined}>
          <span className={styles.liveDot} />
          Live
        </span>
        <select
          className={styles.rangeSelect}
          aria-label="Date range"
          value={range}
          onChange={(e) => setRange(e.target.value as OverviewRange)}
        >
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="year">This year</option>
        </select>
      </div>

      {error ? <p className={styles.loadError}>{error}</p> : null}

      <div className={styles.kpiRow}>
        {data.kpis.map((kpi) => (
          <div key={kpi.key} className={`${styles.kpiCard} ${styles[kpi.tint]}`}>
            <span className={styles.kpiLabel}>{kpi.label}</span>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{loading ? '…' : kpi.value.toLocaleString()}</span>
              <span className={`${styles.kpiDelta} ${kpi.trend === 'up' ? styles.up : styles.down}`}>
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
            </div>
          </div>
        ))}
      </div>

      <div className={styles.rowA}>
        <div className={styles.card}>
          <div className={styles.chartHead}>
            <div className={styles.tabs} role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {chart.showLegend && (
              <div className={styles.legend}>
                <span className={styles.legendItem}>
                  <span className={styles.dot} style={{ background: INK }} /> This year
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.dot} style={{ background: '#94a3b8' }} /> Last year
                </span>
              </div>
            )}
          </div>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chart.data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                <XAxis dataKey={chart.xKey} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => compact(v)}
                />
                <Tooltip formatter={(v: number) => v.toLocaleString()} />
                {chart.lines.map((ln) => (
                  <Line
                    key={ln.key}
                    type="monotone"
                    dataKey={ln.key}
                    stroke={ln.color}
                    strokeWidth={2.5}
                    strokeDasharray={ln.dashed ? '6 6' : undefined}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Traffic by City or Municipality</h3>
          {data.trafficByCity.length === 0 ? (
            <p className={styles.emptyNote}>No check-ins in this range yet.</p>
          ) : (
            <ul className={styles.cityList}>
              {data.trafficByCity.map((c) => (
                <li key={c.name} className={styles.cityItem}>
                  <span className={styles.cityName}>{c.name}</span>
                  <span className={styles.cityTrack}>
                    <span className={styles.cityBar} style={{ width: `${Math.round(c.value * 100)}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={styles.rowB}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Top rated destinations</h3>
          <div className={styles.chartWrap}>
            {data.topRated.length === 0 ? (
              <p className={styles.emptyNote}>No published reviews yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.topRated} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`${v} ★`, 'Rating']} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="rating" radius={[8, 8, 0, 0]} maxBarSize={38}>
                    {data.topRated.map((_, i) => (
                      <Cell key={i} fill={RATED_COLORS[i % RATED_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Check-ins by source</h3>
          <div className={styles.deviceWrap}>
            {data.trafficBySource.length === 0 ? (
              <p className={styles.emptyNote}>No check-ins in this range yet.</p>
            ) : (
              <>
                <div className={styles.deviceChart}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={data.trafficBySource}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={54}
                        outerRadius={82}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {data.trafficBySource.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v}%`, 'Share']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className={styles.deviceLegend}>
                  {data.trafficBySource.map((d) => (
                    <li key={d.name}>
                      <span className={styles.dot} style={{ background: d.color }} />
                      <span className={styles.deviceName}>{d.name}</span>
                      <span className={styles.deviceVal}>{d.value}%</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Check-ins this year</h3>
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.monthlyVisited} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => compact(v)}
              />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString()} check-ins`, 'Visits']} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="visits" radius={[8, 8, 0, 0]} maxBarSize={34}>
                {data.monthlyVisited.map((_, i) => (
                  <Cell key={i} fill={VISITED_COLORS[i % VISITED_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
