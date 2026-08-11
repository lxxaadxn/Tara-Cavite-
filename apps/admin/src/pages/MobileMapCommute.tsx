import { useCallback, useEffect, useState } from 'react';
import { fetchAdminMapLayers, type MapLayerRow } from '../lib/adminRecords';
import listStyles from '../components/AdminListPage.module.css';
import { supabase } from '../lib/supabase';
import styles from './MobileMapCommute.module.css';

export function MobileMapCommute() {
  const [layers, setLayers] = useState<MapLayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [establishmentCount, setEstablishmentCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { layers: next, establishmentCount: count } = await fetchAdminMapLayers(supabase);
      setLayers(next);
      setEstablishmentCount(count);
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
        <p>Map layers driven by Supabase place counts.</p>
        <p className={styles.sourceNote}>
          {loading ? 'Loading...' : `Live - ${establishmentCount} places`}
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
          <span className={listStyles.statValue}>{loading ? '...' : establishmentCount}</span>
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
                <td colSpan={4}>Loading…</td>
              </tr>
            ) : layers.length === 0 ? (
              <tr>
                <td colSpan={4}>No layers</td>
              </tr>
            ) : (
              layers.map((layer) => (
                <tr key={layer.id}>
                  <td>{layer.layer}</td>
                  <td>{layer.description}</td>
                  <td>{layer.source}</td>
                  <td>
                    <button type="button" onClick={() => toggle(layer.id)}>
                      {layer.enabled ? 'On' : 'Off'}
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
