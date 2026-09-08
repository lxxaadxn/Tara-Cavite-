import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ItineraryStopsMap } from '../../components/ItineraryStopsMap';
import { useToast } from '../../components/Toast';
import { useAdminHref } from '../../contexts/AdminPathPrefixContext';
import { usePageHeader } from '../../contexts/PageHeaderContext';
import {
  CATEGORY_OPTIONS,
  DURATION_PRESETS,
  emptyItinerary,
  emptyStop,
  mapsSearchUrl,
  persistAdminItinerary,
  fetchAdminItinerary,
  parseTimeWindow,
  formatTimeWindow,
  durationHintFromTimes,
  type AdminItinerary,
  type AdminItineraryStatus,
  type AdminItineraryStop,
} from '../../lib/adminItineraries';
import { parseCoordsFromMapsUrl } from '../../lib/staV3CatalogAdmin';
import { fetchAdminDestinations } from '../../lib/destinationPlaces';
import { supabase } from '../../lib/supabase';
import styles from './ItineraryEditorPage.module.css';

type ItineraryEditorPageProps = {
  /** When set, load this itinerary instead of the route `:id` param. */
  id?: string | null;
  /** When set, closing/saving returns to the list via callback instead of routing. */
  onClose?: () => void;
  /** Render inside a modal overlay (skips page header override). */
  embedded?: boolean;
};

type VenueOption = {
  id: string;
  name: string;
  city: string;
  lat: number | null;
  lng: number | null;
  mapsUrl: string;
};

type WizardStep = 1 | 2 | 3;

const STEPS: { id: WizardStep; label: string; hint: string }[] = [
  { id: 1, label: 'Details', hint: 'Cover, title, and route' },
  { id: 2, label: 'Stops', hint: 'Build the visit order' },
  { id: 3, label: 'Review', hint: 'Save draft or publish' },
];

function CategoryMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const extra = selected.filter((s) => !options.includes(s));
  const matches = useMemo(() => {
    const all = [...options, ...selected.filter((s) => !options.includes(s))];
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((o) => o.toLowerCase().includes(needle));
  }, [options, selected, q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((t) => t !== value) : [...selected, value]);
  };

  return (
    <div className={styles.comboWrap} ref={wrapRef}>
      <button type="button" className={styles.comboBtn} onClick={() => setOpen((v) => !v)}>
        <span>
          {selected.length === 0 ? 'Select categories…' : selected.join(', ')}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div className={styles.comboMenu}>
          <input
            type="search"
            className={styles.comboSearch}
            placeholder="Search categories…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <ul className={styles.comboList} role="listbox">
            {matches.length === 0 ? (
              <li className={styles.venueEmpty}>No matching categories</li>
            ) : (
              matches.map((opt) => {
                const on = selected.includes(opt);
                return (
                  <li key={opt}>
                    <label className={styles.comboOption}>
                      <input type="checkbox" checked={on} onChange={() => toggle(opt)} />
                      {opt}
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function VenueSearch({
  venues,
  loading,
  error,
  value,
  onSelect,
}: {
  venues: VenueOption[];
  loading: boolean;
  error: string | null;
  value: AdminItineraryStop;
  onSelect: (patch: Partial<AdminItineraryStop>) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return venues.slice(0, 40);
    return venues
      .filter((v) => `${v.name} ${v.city}`.toLowerCase().includes(needle))
      .slice(0, 20);
  }, [venues, q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (v: VenueOption) => {
    let lat = v.lat;
    let lng = v.lng;
    if ((lat == null || lng == null) && v.mapsUrl) {
      const parsed = parseCoordsFromMapsUrl(v.mapsUrl);
      if (parsed) {
        lat = parsed.lat;
        lng = parsed.lng;
      }
    }
    onSelect({
      name: v.name,
      venueName: v.name,
      venueLat: lat,
      venueLng: lng,
      mapsUrl: v.mapsUrl || mapsSearchUrl(lat, lng),
      establishment: { placeId: v.id },
    });
    setQ('');
    setOpen(false);
  };

  return (
    <div className={styles.venueWrap} ref={wrapRef}>
      <div className={styles.searchBar}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          value={open ? q : value.venueName}
          placeholder={loading ? 'Loading establishments…' : 'Search establishments…'}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            if (!e.target.value) {
              onSelect({
                name: '',
                venueName: '',
                venueLat: null,
                venueLng: null,
                mapsUrl: '',
                establishment: undefined,
              });
            }
          }}
          onFocus={() => {
            setQ(value.venueName);
            setOpen(true);
          }}
          autoComplete="off"
        />
      </div>
      {error ? <p className={styles.inlineNote}>{error}</p> : null}
      {open ? (
        <ul className={styles.venueList} role="listbox">
          {matches.length === 0 ? (
            <li className={styles.venueEmpty}>{loading ? 'Loading…' : 'No matching establishments'}</li>
          ) : (
            matches.map((v) => (
              <li key={v.id}>
                <button type="button" className={styles.venueItem} onClick={() => pick(v)}>
                  <strong>{v.name}</strong>
                  {v.city ? <span>{v.city}</span> : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

export function ItineraryEditorPage(props: ItineraryEditorPageProps = {}) {
  const { onClose, embedded = false, id: idProp } = props;
  const params = useParams();
  const id = idProp !== undefined ? idProp || undefined : params.id;
  const isNew = !id;
  const navigate = useNavigate();
  const href = useAdminHref;
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<File | null>(null);
  const listHref = href('/web/itineraries/created');

  const exitEditor = () => {
    if (onClose) onClose();
    else navigate(listHref);
  };

  const [existing, setExisting] = useState<AdminItinerary | null>(null);
  const [form, setForm] = useState<Omit<AdminItinerary, 'id'>>(() => emptyItinerary());
  const [durationMode, setDurationMode] = useState('2 hrs');
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [venuesError, setVenuesError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadingRow, setLoadingRow] = useState(Boolean(id));
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [step, setStep] = useState<WizardStep>(1);
  const [openStop, setOpenStop] = useState<string | null>(null);

  usePageHeader(embedded ? null : isNew ? 'Create Itinerary' : 'Edit Itinerary', null);

  useEffect(() => {
    if (isNew || !id) {
      setLoadingRow(false);
      setOpenStop((form.stopList[0]?.clientId ?? null));
      return;
    }
    let active = true;
    setLoadingRow(true);
    fetchAdminItinerary(id)
      .then((row) => {
        if (!active) return;
        if (!row) {
          setMissing(true);
          setExisting(null);
          return;
        }
        const { id: _id, ...rest } = row;
        setExisting(row);
        setForm({
          ...rest,
          stopList: rest.stopList.length ? rest.stopList : [emptyStop()],
        });
        setDurationMode(DURATION_PRESETS.includes(row.durationLabel) ? row.durationLabel : 'custom');
        setOpenStop(row.stopList[0]?.clientId ?? null);
      })
      .catch(() => {
        if (active) setMissing(true);
      })
      .finally(() => {
        if (active) setLoadingRow(false);
      });
    return () => {
      active = false;
    };
  }, [id, isNew]);

  useEffect(() => {
    let active = true;
    setVenuesLoading(true);
    fetchAdminDestinations(supabase)
      .then((list) => {
        if (!active) return;
        const toCoord = (v: unknown) => {
          if (v == null || v === '') return null;
          const n = typeof v === 'number' ? v : parseFloat(String(v));
          return Number.isFinite(n) ? n : null;
        };
        const next = list
          .filter((row) => row.is_published !== false)
          .map((row) => {
            const lat = toCoord(row.latitude);
            const lng = toCoord(row.longitude);
            return {
              id: row.establishment_public_id,
              name: row.ta_name,
              city: row.city_mun ?? '',
              lat,
              lng,
              mapsUrl: mapsSearchUrl(lat, lng),
            };
          })
          .filter((v) => v.lat != null && v.lng != null)
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        setVenues(next);
        setVenuesError(next.length ? null : 'No published establishments in the catalog.');
      })
      .catch((e) => {
        if (!active) return;
        setVenuesError(e instanceof Error ? e.message : 'Could not load establishments');
      })
      .finally(() => {
        if (active) setVenuesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const mapPoints = useMemo(
    () =>
      form.stopList
        .map((s, i) => ({
          lat: s.venueLat,
          lng: s.venueLng,
          label: s.venueName || s.name || `Stop ${i + 1}`,
          index: i + 1,
        }))
        .filter(
          (p): p is { lat: number; lng: number; label: string; index: number } =>
            p.lat != null && p.lng != null && Number.isFinite(p.lat) && Number.isFinite(p.lng)
        ),
    [form.stopList]
  );

  const categoryOptions = useMemo(() => {
    const extra = form.tags.filter((t) => !CATEGORY_OPTIONS.includes(t));
    return [...CATEGORY_OPTIONS, ...extra];
  }, [form.tags]);

  const patch = (partial: Partial<Omit<AdminItinerary, 'id'>>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  const setStop = (index: number, next: AdminItineraryStop | ((s: AdminItineraryStop) => AdminItineraryStop)) => {
    setForm((prev) => ({
      ...prev,
      stopList: prev.stopList.map((s, i) => (i === index ? (typeof next === 'function' ? next(s) : next) : s)),
    }));
  };

  const reorderStops = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    setForm((prev) => {
      if (from >= prev.stopList.length || to >= prev.stopList.length) return prev;
      const copy = [...prev.stopList];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return { ...prev, stopList: copy };
    });
  };

  const onCoverFile = (files: FileList | null) => {
    const file = files?.item(0);
    if (!file || !file.type.startsWith('image/')) return;
    coverFileRef.current = file;
    const url = URL.createObjectURL(file);
    patch({ image: url });
    if (fileRef.current) fileRef.current.value = '';
  };

  const persist = async (status: AdminItineraryStatus) => {
    if (!form.title.trim()) {
      toast('Itinerary title is required.', 'error');
      setStep(1);
      return;
    }
    if (!form.route.trim()) {
      toast('Route trail is required.', 'error');
      setStep(1);
      return;
    }
    try {
      await persistAdminItinerary(
        {
          ...form,
          id: existing?.id ?? '',
          subtitle: form.subtitle.trim() || form.route.trim(),
          route: form.route.trim(),
          status,
        },
        { previous: existing ?? undefined, coverFile: coverFileRef.current }
      );
      toast(status === 'published' ? 'Itinerary published' : 'Draft saved', 'success');
      exitEditor();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save itinerary', 'error');
    }
  };

  const goNext = () => {
    if (step === 1) {
      if (!form.title.trim()) {
        toast('Itinerary title is required.', 'error');
        return;
      }
      if (!form.route.trim()) {
        toast('Route trail is required.', 'error');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) setStep(3);
  };

  if (loadingRow) {
    return (
      <div className={styles.page}>
        <p className={styles.lede}>Loading itinerary…</p>
      </div>
    );
  }

  if (missing) {
    return (
      <div className={styles.page}>
        <Link to={listHref} className={styles.backLink}>
          ← Back to itineraries
        </Link>
        <p className={styles.missing}>This itinerary was not found.</p>
        <button type="button" className={styles.ghostBtn} onClick={() => setMissing(false)}>
          Start a new itinerary instead
        </button>
      </div>
    );
  }

  return (
    <form
      id="itinerary-editor-form"
      className={`${styles.page} ${styles.wizard} ${embedded ? styles.embedded : ''}`}
      onSubmit={(e: FormEvent) => e.preventDefault()}
      aria-labelledby="itinerary-editor-title"
    >
      <header className={styles.wizardHead}>
        <h2 id="itinerary-editor-title" className={styles.srOnly}>
          {isNew ? 'Create Itinerary' : 'Edit Itinerary'}
        </h2>
        <ol className={styles.stepper} aria-label="Progress">
          {STEPS.map((s) => {
            const done = step > s.id;
            const on = step === s.id;
            return (
              <li
                key={s.id}
                className={on ? styles.stepOn : done ? styles.stepDone : styles.stepTodo}
                aria-current={on ? 'step' : undefined}
              >
                <div className={styles.stepTop}>
                  <span className={styles.stepNum} aria-hidden>
                    {done ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 12.5 10 17.5 19 7.5" />
                      </svg>
                    ) : (
                      String(s.id).padStart(2, '0')
                    )}
                  </span>
                  <span className={styles.stepLine} aria-hidden />
                </div>
                <span className={styles.stepLabel}>{s.label}</span>
                <span className={styles.stepHint}>{s.hint}</span>
              </li>
            );
          })}
        </ol>
      </header>

      <div className={`${styles.wizardBody} ${step === 2 ? styles.wizardBodySplit : ''}`}>
        {step === 1 ? (
          <section>
            <h3>Basic details</h3>
            <p className={styles.lede}>These fields populate the top banner on the traveler itinerary page.</p>

            <div className={styles.detailsSplit}>
              <span className={styles.coverLabel}>Cover image</span>
              <div className={styles.coverFrame}>
                {form.image ? (
                  <img src={form.image} alt="" className={styles.coverPreview} />
                ) : (
                  <div className={styles.coverEmpty}>No cover yet</div>
                )}
              </div>
              <div className={styles.coverRow}>
                <label className={styles.fileBtn}>
                  Upload photo
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => onCoverFile(e.target.files)}
                  />
                </label>
                <input
                  type="url"
                  placeholder="or paste image URL"
                  value={form.image.startsWith('blob:') ? '' : form.image}
                  onChange={(e) => patch({ image: e.target.value })}
                />
              </div>

              <label className={styles.detailsTitleLabel} htmlFor="itinerary-title">
                Itinerary title
              </label>
              <input
                id="itinerary-title"
                className={styles.detailsTitle}
                required
                value={form.title}
                placeholder='e.g. "Highlands Getaway"'
                onChange={(e) => patch({ title: e.target.value })}
              />

              <label className={`${styles.field} ${styles.detailsRoute}`}>
                Route trail
                <input
                  required
                  value={form.route}
                  placeholder="e.g. Silang → Tagaytay"
                  onChange={(e) => patch({ route: e.target.value, subtitle: e.target.value })}
                />
              </label>

              <div className={`${styles.field} ${styles.detailsCats}`}>
                <span>Main categories</span>
                <CategoryMultiSelect
                  options={categoryOptions}
                  selected={form.tags}
                  onChange={(tags) => patch({ tags })}
                />
              </div>

              <label className={`${styles.field} ${styles.detailsDuration}`}>
                Duration
                <select
                  value={durationMode}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDurationMode(v);
                    if (v !== 'custom') patch({ durationLabel: v });
                  }}
                >
                  {DURATION_PRESETS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                  <option value="custom">Custom…</option>
                </select>
              </label>
              {durationMode === 'custom' ? (
                <label className={`${styles.field} ${styles.detailsHint}`}>
                  Custom duration
                  <input
                    value={form.durationLabel}
                    placeholder="e.g. 3 hrs"
                    onChange={(e) => patch({ durationLabel: e.target.value })}
                  />
                </label>
              ) : null}
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <div className={styles.split}>
            <aside className={styles.mapPane}>
              <div className={styles.sectionHead}>
                <div>
                  <h3>Itineraries map</h3>
                  <p className={styles.lede}>
                    {mapPoints.length
                      ? 'Markers follow linked establishments (Stop 1, 2, 3…).'
                      : 'Link a venue on the right to plot numbered markers.'}
                  </p>
                </div>
              </div>
              <ItineraryStopsMap points={mapPoints} sizeKey={step} fill showHint={false} />
            </aside>
            <div className={styles.stopsPane}>
              <div className={styles.sectionHead}>
                <div>
                  <h3>Stop builder</h3>
                  <p className={styles.lede}>Add stops in order. Linked venues plot on the map.</p>
                </div>
              </div>
              <div className={styles.timeline}>
                {form.stopList.map((stop, index) => {
                  const expanded = openStop === stop.clientId;
                  return (
                    <article
                      key={stop.clientId}
                      className={`${styles.stopCard} ${
                        dragFrom === index ? styles.stopDragging : ''
                      } ${dragOver === index && dragFrom !== null && dragFrom !== index ? styles.stopDrop : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOver !== index) setDragOver(index);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from = Number(e.dataTransfer.getData('text/plain'));
                        if (Number.isFinite(from)) reorderStops(from, index);
                        setDragFrom(null);
                        setDragOver(null);
                      }}
                    >
                      <header className={styles.stopHead}>
                        <div className={styles.stopTitle}>
                          <button
                            type="button"
                            className={styles.grip}
                            draggable
                            aria-label={`Drag stop ${index + 1} to reorder`}
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', String(index));
                              const card = e.currentTarget.closest('article');
                              if (card) e.dataTransfer.setDragImage(card, 24, 16);
                              setDragFrom(index);
                            }}
                            onDragEnd={() => {
                              setDragFrom(null);
                              setDragOver(null);
                            }}
                          >
                            <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden>
                              <circle cx="3" cy="3" r="1.4" />
                              <circle cx="9" cy="3" r="1.4" />
                              <circle cx="3" cy="8" r="1.4" />
                              <circle cx="9" cy="8" r="1.4" />
                              <circle cx="3" cy="13" r="1.4" />
                              <circle cx="9" cy="13" r="1.4" />
                            </svg>
                          </button>
                          <span className={styles.stopBadge}>{index + 1}</span>
                          <button
                            type="button"
                            className={styles.stopSummaryBtn}
                            aria-expanded={expanded}
                            onClick={() => setOpenStop(expanded ? null : stop.clientId)}
                          >
                            {stop.venueName || stop.name || 'Choose a venue'}
                            {stop.timeWindow ? <span className={styles.stopMeta}> · {stop.timeWindow}</span> : null}
                          </button>
                        </div>
                        <button
                          type="button"
                          className={`${styles.tinyBtn} ${styles.danger}`}
                          disabled={form.stopList.length <= 1}
                          onClick={() => {
                            const next = form.stopList.filter((_, i) => i !== index);
                            patch({ stopList: next });
                            if (openStop === stop.clientId) setOpenStop(next[0]?.clientId ?? null);
                          }}
                        >
                          Remove
                        </button>
                      </header>

                      {expanded ? (
                        <div className={styles.stopGrid}>
                          <div className={`${styles.stopField} ${styles.stopSpan}`}>
                            <span className={styles.srOnly}>Search establishments</span>
                            <VenueSearch
                              venues={venues}
                              loading={venuesLoading}
                              error={index === 0 ? venuesError : null}
                              value={stop}
                              onSelect={(p) => setStop(index, { ...stop, ...p })}
                            />
                          </div>
                          <label className={styles.stopField}>
                            Time slot
                            {(() => {
                              const slot = parseTimeWindow(stop.timeWindow);
                              const setHalf = (half: 'start' | 'end', value: string) => {
                                const next = { ...slot, [half]: value };
                                const timeWindow = formatTimeWindow(next.start, next.end);
                                setStop(index, {
                                  ...stop,
                                  timeWindow,
                                  durationHint: durationHintFromTimes(next.start, next.end),
                                });
                              };
                              return (
                                <span className={styles.timeRow}>
                                  <input
                                    type="time"
                                    aria-label={`Stop ${index + 1} start time`}
                                    value={slot.start}
                                    onChange={(e) => setHalf('start', e.target.value)}
                                  />
                                  <span className={styles.timeDash} aria-hidden>
                                    –
                                  </span>
                                  <input
                                    type="time"
                                    aria-label={`Stop ${index + 1} end time`}
                                    value={slot.end}
                                    onChange={(e) => setHalf('end', e.target.value)}
                                  />
                                </span>
                              );
                            })()}
                          </label>
                          <div className={styles.stopField}>
                            <span>Estimated stay</span>
                            <span className={styles.stayValue}>
                              {stop.durationHint || '—'}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
              <button
                type="button"
                className={styles.addStopBtn}
                onClick={() => {
                  const next = emptyStop();
                  patch({ stopList: [...form.stopList, next] });
                  setOpenStop(next.clientId);
                }}
              >
                + Add stop
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <section>
            <h3>Review &amp; publish</h3>
            <p className={styles.lede}>Check the itinerary, then save a draft or publish it.</p>
            <div className={styles.reviewGrid}>
              <div className={styles.reviewDetails}>
                <h4 className={styles.reviewColTitle}>Details</h4>
                <div className={styles.reviewHero}>
                  <div className={styles.coverFrame}>
                    {form.image ? (
                      <img src={form.image} alt="" className={styles.coverPreview} />
                    ) : (
                      <div className={styles.coverEmpty}>No cover yet</div>
                    )}
                  </div>
                  <dl className={styles.reviewDl}>
                    <div>
                      <dt>Title</dt>
                      <dd>{form.title || '—'}</dd>
                    </div>
                    <div>
                      <dt>Route</dt>
                      <dd>{form.route || '—'}</dd>
                    </div>
                    <div>
                      <dt>Duration</dt>
                      <dd>{form.durationLabel || '—'}</dd>
                    </div>
                    <div>
                      <dt>Categories</dt>
                      <dd>{form.tags.length ? form.tags.join(', ') : '—'}</dd>
                    </div>
                  </dl>
                </div>
                <ItineraryStopsMap points={mapPoints} sizeKey={`review-${step}`} compact showHint={false} />
              </div>
              <div className={styles.reviewStopsCol}>
                <h4 className={styles.reviewColTitle}>Stops</h4>
                {form.stopList.length === 0 ? (
                  <p className={styles.reviewStopsEmpty}>No stops yet</p>
                ) : (
                  <ol className={styles.reviewStops}>
                    {form.stopList.map((s, i) => (
                      <li key={s.clientId} className={styles.reviewStopCard}>
                        <span className={styles.stopBadge}>{i + 1}</span>
                        <div className={styles.reviewStopBody}>
                          <strong className={styles.reviewStopName}>
                            {s.venueName || s.name || 'No venue'}
                          </strong>
                          <span className={styles.reviewStopTime}>{s.timeWindow || 'No time set'}</span>
                          {s.durationHint ? (
                            <div className={styles.chips}>
                              <span className={`${styles.chip} ${styles.stayChip}`}>{s.durationHint}</span>
                            </div>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <div className={styles.modalFooter}>
        <div className={styles.footerGrow} />
        {step === 1 && onClose ? (
          <button type="button" className={styles.ghostBtn} onClick={onClose}>
            Cancel
          </button>
        ) : null}
        {step > 1 ? (
          <button type="button" className={styles.ghostBtn} onClick={() => setStep((s) => (s === 3 ? 2 : 1))}>
            Back
          </button>
        ) : null}
        {step < 3 ? (
          <button type="button" className={styles.ghostBtn} onClick={goNext}>
            Next
          </button>
        ) : null}
        {step === 3 ? (
          <>
            <button type="button" className={styles.ghostBtn} onClick={() => persist('draft')}>
              Save draft
            </button>
            <button type="button" className={styles.primaryBtn} onClick={() => persist('published')}>
              Publish
            </button>
          </>
        ) : null}
      </div>
    </form>
  );
}
