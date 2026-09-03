import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LANDING_CATALOG_PICK_LIMIT,
  fetchSiteContent,
  parseSiteContentIdList,
  serializeSiteContentIdList,
  siteContentValue,
  subscribeSiteContent,
  upsertSiteContent,
} from 'cavitour-shared/siteContent';
import { useToastSoft } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import styles from './LandingCatalogPicker.module.css';

export type CatalogPickOption = {
  id: string;
  title: string;
  subtitle: string;
};

type Props = {
  contentKey: string;
  heading: string;
  searchLabel: string;
  searchPlaceholder: string;
  emptyLabel: string;
  nameHeader: string;
  detailHeader: string;
  options: CatalogPickOption[];
  loading: boolean;
  error: string | null;
  embedded?: boolean;
};

export function LandingCatalogPicker({
  contentKey,
  heading,
  searchLabel,
  searchPlaceholder,
  emptyLabel,
  nameHeader,
  detailHeader,
  options,
  loading,
  error,
  embedded = false,
}: Props) {
  const toast = useToastSoft();
  const searchRef = useRef<HTMLInputElement>(null);
  const [ids, setIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState('');

  const loadIds = (map: Record<string, string>) => {
    setIds(parseSiteContentIdList(siteContentValue(map, contentKey)));
  };

  useEffect(() => {
    fetchSiteContent(supabase)
      .then(loadIds)
      .catch((e) => toast(e instanceof Error ? e.message : 'Could not load selection', 'error'));
    return subscribeSiteContent(supabase, () => {
      fetchSiteContent(supabase).then(loadIds).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey]);

  useEffect(() => {
    if (!modalOpen) return;
    searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        setModalOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, busy]);

  const byId = useMemo(() => {
    const map = new Map<string, CatalogPickOption>();
    for (const option of options) map.set(option.id, option);
    return map;
  }, [options]);

  const selected = ids
    .map((id) => byId.get(id) ?? { id, title: id, subtitle: 'Unavailable' })
    .slice(0, LANDING_CATALOG_PICK_LIMIT);

  const atCap = selected.length >= LANDING_CATALOG_PICK_LIMIT;
  const selectedSet = useMemo(() => new Set(ids), [ids]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return options.filter((option) => {
      if (selectedSet.has(option.id)) return false;
      if (!needle) return true;
      return `${option.title} ${option.subtitle}`.toLowerCase().includes(needle);
    });
  }, [options, query, selectedSet]);

  const persist = async (nextIds: string[]) => {
    const capped = parseSiteContentIdList(JSON.stringify(nextIds));
    const previous = ids;
    setIds(capped);
    setBusy(true);
    try {
      await upsertSiteContent(supabase, { [contentKey]: serializeSiteContentIdList(capped) });
    } catch (e) {
      setIds(previous);
      toast(e instanceof Error ? e.message : 'Could not save selection', 'error');
    } finally {
      setBusy(false);
    }
  };

  const addId = (id: string) => {
    if (atCap || selectedSet.has(id)) return;
    void persist([...ids, id]);
    if (ids.length + 1 >= LANDING_CATALOG_PICK_LIMIT) {
      setModalOpen(false);
      setQuery('');
    }
  };

  const removeId = (id: string) => {
    void persist(ids.filter((item) => item !== id));
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...ids];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void persist(next);
  };

  const closeModal = () => {
    if (busy) return;
    setModalOpen(false);
    setQuery('');
  };

  return (
    <div className={embedded ? styles.embedded : styles.card}>
      <div className={styles.toolbar}>
        <div>
          <h3 className={styles.heading}>{heading}</h3>
          <p className={styles.meta}>
            {selected.length} of {LANDING_CATALOG_PICK_LIMIT} on the landing page
          </p>
        </div>
        <button
          type="button"
          className={styles.searchBtn}
          disabled={atCap || busy}
          title={atCap ? `${LANDING_CATALOG_PICK_LIMIT} of ${LANDING_CATALOG_PICK_LIMIT} selected` : searchLabel}
          onClick={() => setModalOpen(true)}
        >
          {searchLabel}
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {loading && selected.length === 0 ? (
        <p className={styles.empty}>Loading catalog…</p>
      ) : selected.length === 0 ? (
        <p className={styles.empty}>{emptyLabel}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.num}>#</th>
                <th>{nameHeader}</th>
                <th>{detailHeader}</th>
                <th className={styles.actionsHead}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {selected.map((row, index) => (
                <tr key={row.id}>
                  <td className={styles.num}>{index + 1}</td>
                  <td>
                    <strong>{row.title}</strong>
                  </td>
                  <td className={styles.detail}>{row.subtitle || '—'}</td>
                  <td className={styles.actions}>
                    <button type="button" disabled={busy || index === 0} onClick={() => move(index, -1)}>
                      Up
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === selected.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      Down
                    </button>
                    <button type="button" disabled={busy} onClick={() => removeId(row.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen ? (
        <div className={styles.overlay} role="presentation" onClick={closeModal}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${contentKey}-search-title`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.dialogHead}>
              <h2 id={`${contentKey}-search-title`} className={styles.dialogTitle}>
                {searchLabel}
              </h2>
              <button type="button" className={styles.closeBtn} onClick={closeModal}>
                Close
              </button>
            </div>
            <input
              ref={searchRef}
              type="search"
              className={styles.searchInput}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul className={styles.results}>
              {matches.length === 0 ? (
                <li className={styles.resultEmpty}>No matches.</li>
              ) : (
                matches.slice(0, 80).map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      className={styles.resultBtn}
                      disabled={busy || atCap}
                      onClick={() => addId(option.id)}
                    >
                      <strong>{option.title}</strong>
                      <span>{option.subtitle || '—'}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
