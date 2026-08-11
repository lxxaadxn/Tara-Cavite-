import { useMemo, useState } from 'react';
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
import {
  analyticsKpis,
  monthlyVisited,
  peakVisitorTimes,
  topRatedDestinations,
  totalUsersTrend,
  trafficByCity,
  trafficByDevice,
  userEngagementTrend,
} from '../data/mockData';
import { AnalyticsSection } from '../components/AnalyticsSection';
import styles from './Dashboard.module.css';

const INK = '#111827';
const PRIMARY = '#6B8E23';
const BLUE = '#3b82f6';
const PURPLE = '#a78bfa';

const RATED_COLORS = [PURPLE, PRIMARY, INK, BLUE, PURPLE];
const VISITED_COLORS = [BLUE, PRIMARY, INK, BLUE, PURPLE, PRIMARY, INK, BLUE, PURPLE, BLUE, INK, PRIMARY];

const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`);

type ChartTab = 'total' | 'peak' | 'engagement';

const TABS: { id: ChartTab; label: string }[] = [
  { id: 'total', label: 'Total Users' },
  { id: 'peak', label: 'Peak Months' },
  { id: 'engagement', label: 'User Engagement' },
];

export function Dashboard() {
  const [tab, setTab] = useState<ChartTab>('total');

  const chart = useMemo(() => {
    if (tab === 'peak') {
      return {
        data: peakVisitorTimes,
        xKey: 'label',
        lines: [{ key: 'visitors', color: PRIMARY, dashed: false }],
        showLegend: false,
      };
    }
    if (tab === 'engagement') {
      return {
        data: userEngagementTrend,
        xKey: 'period',
        lines: [
          { key: 'sessions', color: INK, dashed: false },
          { key: 'searches', color: BLUE, dashed: true },
        ],
        showLegend: false,
      };
    }
    return {
      data: totalUsersTrend,
      xKey: 'month',
      lines: [
        { key: 'thisYear', color: INK, dashed: false },
        { key: 'lastYear', color: '#94a3b8', dashed: true },
      ],
      showLegend: true,
    };
  }, [tab]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <h1>Analytics</h1>
        <select className={styles.rangeSelect} aria-label="Date range" defaultValue="Today">
          <option>Today</option>
          <option>This week</option>
          <option>This month</option>
          <option>This year</option>
        </select>
      </div>

      <div className={styles.kpiRow}>
        {analyticsKpis.map((kpi) => (
          <div key={kpi.key} className={`${styles.kpiCard} ${styles[kpi.tint]}`}>
            <span className={styles.kpiLabel}>{kpi.label}</span>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{kpi.value.toLocaleString()}</span>
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
          <ul className={styles.cityList}>
            {trafficByCity.map((c) => (
              <li key={c.name} className={styles.cityItem}>
                <span className={styles.cityName}>{c.name}</span>
                <span className={styles.cityTrack}>
                  <span className={styles.cityBar} style={{ width: `${Math.round(c.value * 100)}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.rowB}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Top Rated Destinations</h3>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topRatedDestinations} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => [`${v} ★`, 'Rating']} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="rating" radius={[8, 8, 0, 0]} maxBarSize={38}>
                  {topRatedDestinations.map((_, i) => (
                    <Cell key={i} fill={RATED_COLORS[i % RATED_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Traffic by Device</h3>
          <div className={styles.deviceWrap}>
            <div className={styles.deviceChart}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={trafficByDevice}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={82}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {trafficByDevice.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Share']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className={styles.deviceLegend}>
              {trafficByDevice.map((d) => (
                <li key={d.name}>
                  <span className={styles.dot} style={{ background: d.color }} />
                  <span className={styles.deviceName}>{d.name}</span>
                  <span className={styles.deviceVal}>{d.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.card} id="analytics">
        <AnalyticsSection />
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Most Visited Destinations (monthly demo)</h3>
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyVisited} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => compact(v)}
              />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString()} views`, 'Visits']} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="visits" radius={[8, 8, 0, 0]} maxBarSize={34}>
                {monthlyVisited.map((_, i) => (
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
