import { useState } from 'react';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { monthlyVisitors, topDestinations, tourismTypes } from '../data/mockData';
import styles from './Analytics.module.css';

const COLORS = ['#6B8E23', '#8FBC2E', '#9ACD32', '#B8D94A', '#C5E06C'];

export function Analytics() {
  const [dateFilter, setDateFilter] = useState('6 Months');

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Analytics</h1>
          <p>Platform insights and metrics</p>
        </div>
        <select className={styles.filter} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
          <option>This Month</option>
          <option>6 Months</option>
          <option>1 Year</option>
        </select>
      </div>

      <div className={styles.charts}>
        <div className={styles.card}>
          <h3>Monthly Visitors</h3>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyVisitors}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="visitors"
                  stroke="#6B8E23"
                  strokeWidth={2}
                  dot={{ fill: '#6B8E23', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.card}>
            <h3>Top 5 Destinations</h3>
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topDestinations} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6B8E23" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.card}>
            <h3>Tourism Type Distribution</h3>
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={tourismTypes}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, value }) => `${name} ${value}%`}
                  >
                    {tourismTypes.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
