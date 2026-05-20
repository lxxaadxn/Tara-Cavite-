import { useCallback, useEffect, useState } from 'react';
import { fetchAdminMapLayers, type MapLayerRow } from '../lib/adminRecords';
import listStyles from '../components/AdminListPage.module.css';
import { supabase } from '../lib/supabase';
import styles from './MobileMapCommute.module.css';

export function MobileMapCommute() {
  const [layers, setLayers] = useState<MapLayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ establishments: 0, terminals: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { layers: next, establishmentCount, terminalCount } = await fetchAdminMapLayers(supabase);
      setLayers(next);
      setCounts({ establishments: establishmentCount, terminals: terminalCount });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load map data');
      setLayers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)));
  };

  const enabled = layers.filter((l) => l.enabled).length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Map &amp; commute</h1>
        <p>Map layers driven by Supabase place and terminal counts.</p>
        <p className={styles.sourceNote}>
          {loading
            ? 'Loading...'
            : `Live - ${counts.establishments} places - ${counts.terminals} terminals`}
        </p>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <div className={listStyles.stats}>
        <div className={listStyles.stat}>
          <span className={listStyles.statLabel}>Layers on</span>
          <span className={listStyles.statValue}>
            {loading ? '...' : `${enabled} / ${layers.length}`}
          </span>
        </div>
        <div className={listStyles.stat}>
          <span className={listStyles.statLabel}>Establishments</span>
          <span className={listStyles.statValue}>{loading ? '...' : counts.establishments}</span>
        </div>
        <div className={listStyles.stat}>
          <span className={listStyles.statLabel}>Terminals</span>
          <span className={listStyles.statValue}>{loading ? '...' : counts.terminals}</span>
        </div>
      </div>

      <div className={listStyles.tableWrap}>
        <table className={listStyles.table}>
          <thead>
            <tr>
              <th>Layer</th>
              <th>Description</th>
              <th>Source</th>
              <th>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className={listStyles.empty}>
                  Loading from Supabase...
                </td>
              </tr>
            ) : (
              layers.map((row) => (
                <tr key={row.id} className={listStyles.row}>
                  <td>
                    <strong>{row.layer}</strong>
                  </td>
                  <td>{row.description}</td>
                  <td className={styles.source}>{row.source}</td>
                  <td>
                    <button
                      type="button"
                      className={`${listStyles.toggle} ${row.enabled ? listStyles.toggleOn : ''}`}
                      onClick={() => toggle(row.id)}
                      aria-pressed={row.enabled}
                      aria-label={`${row.layer} layer`}
                    >
                      <span className={listStyles.knob} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
