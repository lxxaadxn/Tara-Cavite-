import { useEffect, useMemo, useState } from 'react';
import {
  fetchSiteContent,
  subscribeSiteContent,
  uploadSiteContentFile,
  upsertSiteContent,
} from 'cavitour-shared/siteContent';
import {
  mapPinSiteContentKey,
  resolveMapPinUrl,
  resolveMapPinUrlForLabel,
} from 'cavitour-shared/mapPins';
import { shortLabelForNtdpCategory } from 'cavitour-shared/ntdpFilterMeta';
import { useToastSoft } from '../../components/Toast';
import { fetchAdminDestinations } from '../../lib/destinationPlaces';
import { fetchNtdpLookupRows, type FilterLookupRow } from '../../lib/staFilterLookups';
import { supabase } from '../../lib/supabase';
import { PinsPreviewMap, type MappedPlacePin } from './PinsPreviewMap';
import styles from './CustomPinsPage.module.css';

function parseCoord(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

export function CustomPinsPage() {
  const toast = useToastSoft();
  const [categories, setCategories] = useState<FilterLookupRow[]>([]);
  const [siteMap, setSiteMap] = useState<Record<string, string>>({});
  const [mappedPlaces, setMappedPlaces] = useState<MappedPlacePin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [urlDraft, setUrlDraft] = useState<Record<number, string>>({});

  const reload = () => {
    setError(null);
    Promise.all([fetchNtdpLookupRows(supabase), fetchSiteContent(supabase), fetchAdminDestinations(supabase)])
      .then(([rows, map, dests]) => {
        const content = map as Record<string, string>;
        setCategories(rows);
        setSiteMap(content);
        const drafts: Record<number, string> = {};
        for (const row of rows) {
          const key = mapPinSiteContentKey(row.tableId);
          drafts[row.tableId] = String(content[key] ?? '').trim();
        }
        setUrlDraft(drafts);
        const plotted: MappedPlacePin[] = [];
        for (const dest of dests) {
          const lat = parseCoord(dest.latitude);
          const lng = parseCoord(dest.longitude);
          if (lat == null || lng == null) continue;
          const label = String(dest.ntdp_category ?? '').trim();
          plotted.push({
            id: dest.establishment_public_id,
            name: dest.ta_name || 'Establishment',
            lat,
            lng,
            ntdpLabel: label,
            iconUrl: resolveMapPinUrlForLabel(content, rows, label),
          });
          if (plotted.length >= 800) break;
        }
        setMappedPlaces(plotted);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Could not load map pins');
        setCategories([]);
        setMappedPlaces([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    return subscribeSiteContent(supabase, () => {
      fetchSiteContent(supabase)
        .then((map: Record<string, string>) => setSiteMap(map))
        .catch(() => {});
    });
  }, []);

  const livePlaces = useMemo(
    () =>
      mappedPlaces.map((p) => ({
        ...p,
        iconUrl: resolveMapPinUrlForLabel(siteMap, categories, p.ntdpLabel),
      })),
    [mappedPlaces, siteMap, categories]
  );

  const saveUrl = async (tableId: number, url: string) => {
    const key = mapPinSiteContentKey(tableId);
    if (!key) return;
    setBusyId(tableId);
    try {
      await upsertSiteContent(supabase, { [key]: url });
      setSiteMap((prev) => ({ ...prev, [key]: url }));
      setUrlDraft((prev) => ({ ...prev, [tableId]: url }));
      toast(url ? 'Custom pin saved' : 'Reset to default pin', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save pin', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const onUpload = async (tableId: number, file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    setBusyId(tableId);
    try {
      const url = await uploadSiteContentFile(supabase, 'map-pins', file);
      await upsertSiteContent(supabase, { [mapPinSiteContentKey(tableId)]: url });
      setSiteMap((prev) => ({ ...prev, [mapPinSiteContentKey(tableId)]: url }));
      setUrlDraft((prev) => ({ ...prev, [tableId]: url }));
      toast('Pin image uploaded', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={styles.page}>
      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p className={styles.meta}>Loading map pins…</p> : null}
      {!loading && categories.length === 0 && !error ? (
        <p className={styles.empty}>
          No NTDP categories found. Add them under Content Management → App/Web Filter, then return here.
        </p>
      ) : null}

      {categories.length > 0 ? (
        <>
          <div className={styles.stage}>
            <div className={styles.mapCol}>
              <PinsPreviewMap places={livePlaces} />
            </div>
            <aside className={styles.legendCol}>
              <h2 className={styles.heading}>Legend</h2>
              <ul className={styles.legend}>
                {categories.map((row) => {
                  const src = resolveMapPinUrl(siteMap, row.tableId, row.label);
                  return (
                    <li key={row.id} className={styles.legendItem}>
                      <img className={styles.legendPin} src={src} alt="" />
                      <span>
                        <strong>{shortLabelForNtdpCategory(row.label)}</strong>
                        <em>{row.label}</em>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>

          <section className={styles.editors}>
            <ul className={styles.rows}>
              {categories.map((row) => {
                const key = mapPinSiteContentKey(row.tableId);
                const custom = String(siteMap[key] ?? '').trim();
                const src = resolveMapPinUrl(siteMap, row.tableId, row.label);
                const busy = busyId === row.tableId;
                return (
                  <li key={row.id} className={styles.row}>
                    <img className={styles.rowPin} src={src} alt="" />
                    <div className={styles.rowBody}>
                      <strong>{row.label}</strong>
                      <div className={styles.actions}>
                        <label className={styles.upload}>
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            disabled={busy}
                            onChange={(e) => {
                              void onUpload(row.tableId, e.target.files?.[0] ?? null);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <input
                          className={styles.url}
                          placeholder="Image URL"
                          value={urlDraft[row.tableId] ?? ''}
                          disabled={busy}
                          onChange={(e) =>
                            setUrlDraft((prev) => ({ ...prev, [row.tableId]: e.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className={styles.secondary}
                          disabled={busy}
                          onClick={() => void saveUrl(row.tableId, (urlDraft[row.tableId] ?? '').trim())}
                        >
                          Save URL
                        </button>
                        <button
                          type="button"
                          className={styles.ghost}
                          disabled={busy || !custom}
                          onClick={() => void saveUrl(row.tableId, '')}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
