import { useCallback, useEffect, useRef, useState } from 'react';
import { DestinationMapPicker } from '../components/DestinationMapPicker';
import { useToast } from '../components/Toast';
import {
  type Destination,
  adminPlaceRowToDestination,
  deleteAdminPlace,
  fetchAdminDestinations,
  insertAdminPlace,
  persistGalleryUrls,
  updateAdminPlace,
} from '../lib/destinationPlaces';
import { SYNC_MESSAGES } from 'cavitour-shared';
import { supabase } from '../lib/supabase';
import styles from './TouristSpots.module.css';

export type { Destination } from '../lib/destinationPlaces';

const CATEGORY_OPTIONS = ['Historical', 'Mountain', 'Beach', 'Cultural', 'Park', 'Food', 'Shopping', 'Other'];

const emptyForm: Omit<Destination, 'id' | 'legacyEmoji' | 'sourceSlug'> = {
  name: '',
  category: '',
  city: '',
  status: 'active',
  address: '',
  description: '',
  lat: '',
  lng: '',
  operatingHours: '',
  phone: '',
  email: '',
  website: '',
  socialFacebook: '',
  socialInstagram: '',
  socialTwitter: '',
  images: [],
};

function destinationToForm(d: Destination): typeof emptyForm {
  const { id: _i, legacyEmoji: _l, sourceSlug: _s, ...rest } = d;
  return rest;
}

export function TouristSpots() {
  const [rows, setRows] = useState<Destination[]>([]);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('loading');
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('All Cities');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imagesAtOpenRef = useRef<string[]>([]);
  const editingSourceSlugRef = useRef('');
  const fileByBlobUrl = useRef<Map<string, File>>(new Map());
  const toast = useToast();

  const revokeUrls = useCallback((urls: string[]) => {
    urls.forEach((u) => {
      if (u.startsWith('blob:')) URL.revokeObjectURL(u);
    });
  }, []);

  const reload = useCallback(async () => {
    setLoadState('loading');
    try {
      const data = await fetchAdminDestinations(supabase);
      setRows(data.map(adminPlaceRowToDestination));
      setLoadState('idle');
    } catch (e) {
      setLoadState('error');
      toast(e instanceof Error ? e.message : 'Failed to load destinations', 'error');
    }
  }, [toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useCallback(() => {
    return rows.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) &&
        (cityFilter === 'All Cities' || s.city === cityFilter) &&
        (typeFilter === 'All Types' || s.category === typeFilter)
    );
  }, [rows, search, cityFilter, typeFilter]);

  const openCreate = () => {
    setEditingId(null);
    editingSourceSlugRef.current = '';
    imagesAtOpenRef.current = [];
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (d: Destination) => {
    setEditingId(d.id);
    editingSourceSlugRef.current = d.sourceSlug ?? '';
    const next = destinationToForm(d);
    imagesAtOpenRef.current = [...d.images];
    setForm(next);
    setModalOpen(true);
  };

  const discardStagingBlobs = (currentImages: string[]) => {
    const atOpen = imagesAtOpenRef.current;
    const toRevoke = currentImages.filter((u) => u.startsWith('blob:') && !atOpen.includes(u));
    toRevoke.forEach((u) => fileByBlobUrl.current.delete(u));
    revokeUrls(toRevoke);
  };

  const closeModal = () => {
    discardStagingBlobs(form.images);
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    imagesAtOpenRef.current = [];
    editingSourceSlugRef.current = '';
  };

  const onPickFiles = (files: FileList | null) => {
    if (!files?.length) return;
    for (let i = 0; i < files.length; i++) {
      const f = files.item(i);
      if (f && f.type.startsWith('image/')) {
        const url = URL.createObjectURL(f);
        fileByBlobUrl.current.set(url, f);
        setForm((prev) => ({ ...prev, images: [...prev.images, url] }));
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeImageAt = (idx: number) => {
    setForm((f) => {
      const url = f.images[idx];
      const wasStaged = url?.startsWith('blob:') && !imagesAtOpenRef.current.includes(url);
      if (wasStaged) {
        fileByBlobUrl.current.delete(url);
        URL.revokeObjectURL(url);
      }
      const images = f.images.filter((_, i) => i !== idx);
      return { ...f, images };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast('Please enter a destination name', 'error');
      return;
    }
    if (!form.category.trim()) {
      toast('Please choose or enter a category', 'error');
      return;
    }
    const latN = parseFloat(form.lat);
    const lngN = parseFloat(form.lng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      toast('Please set valid latitude and longitude (use the map or type coordinates).', 'error');
      return;
    }

    setSaving(true);
    try {
      let placeId = editingId;
      if (!editingId) {
        const ins = await insertAdminPlace(supabase, form);
        placeId = ins.id;
        editingSourceSlugRef.current = ins.source_slug;
      } else {
        await updateAdminPlace(supabase, editingId, form, editingSourceSlugRef.current);
      }
      await persistGalleryUrls(supabase, placeId!, form.images, fileByBlobUrl.current);
      for (const u of form.images) {
        if (u.startsWith('blob:')) {
          fileByBlobUrl.current.delete(u);
          URL.revokeObjectURL(u);
        }
      }
      await reload();
      toast(editingId ? 'Destination updated.' : 'Destination added.');
      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      imagesAtOpenRef.current = [];
      editingSourceSlugRef.current = '';
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d: Destination) => {
    if (!window.confirm(`Delete “${d.name}”? This cannot be undone.`)) return;
    try {
      d.images.filter((u) => u.startsWith('blob:')).forEach((u) => URL.revokeObjectURL(u));
      await deleteAdminPlace(supabase, d.id);
      await reload();
      toast('Destination deleted.');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const thumbFor = (d: Destination) => {
    const first = d.images[0];
    if (first) {
      return <img src={first} alt="" className={styles.thumbImg} />;
    }
    if (d.legacyEmoji) {
      return <span className={styles.thumb}>{d.legacyEmoji}</span>;
    }
    return <span className={styles.thumb}>?</span>;
  };

  const list = filtered();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Content management</h1>
          <p>Manage tourist destinations for the web and mobile apps. Use the table below or add a new destination.</p>
          <p className={styles.syncNote}>{SYNC_MESSAGES.adminHint}</p>
        </div>
        <button type="button" className={styles.addBtn} onClick={openCreate} disabled={loadState === 'loading'}>
          <span>+</span> Add destination
        </button>
      </div>

      <div className={styles.specCard} role="note" aria-label="Content management capabilities">
        <strong>Content management includes:</strong>
        <ul>
          <li>Add, edit, and delete destinations</li>
          <li>Upload multiple images per destination</li>
          <li>Assign destination categories</li>
          <li>Set location with map coordinates (latitude / longitude)</li>
          <li>Operating hours and contact information (phone, email)</li>
          <li>Website and social links (Facebook, Instagram, X / Twitter)</li>
        </ul>
      </div>

      {loadState === 'error' && (
        <div className={styles.bannerErr}>
          <span>Could not load destinations. Check RLS and that the migration has been applied.</span>
          <button type="button" className={styles.retryBtn} onClick={() => void reload()}>
            Retry
          </button>
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            placeholder="Search by name, city, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          <button type="button" className={styles.iconBtn} title="Filter">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
            <option>All Cities</option>
            <option>Cavite</option>
            <option>Batangas</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option>All Types</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.tableWrap}>
        {loadState === 'loading' ? (
          <p className={styles.loading}>Loading destinations…</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>City</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((spot) => (
                <tr key={spot.id} className={styles.row}>
                  <td>{thumbFor(spot)}</td>
                  <td>{spot.name}</td>
                  <td>{spot.category}</td>
                  <td>{spot.city}</td>
                  <td>
                    <span className={`${styles.badge} ${spot.status === 'active' ? styles.active : styles.hidden}`}>
                      {spot.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button type="button" className={styles.linkBtn} onClick={() => openEdit(spot)}>
                        Edit
                      </button>
                      <button type="button" className={styles.dangerBtn} onClick={() => void handleDelete(spot)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {loadState === 'idle' && list.length === 0 && (
          <p className={styles.empty}>No admin destinations yet. Add one to create an <code>admin:</code> place row.</p>
        )}
      </div>

      {modalOpen && (
        <div className={styles.overlay} role="presentation" onClick={closeModal}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dest-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="dest-modal-title">{editingId ? 'Edit destination' : 'Add destination'}</h2>
            <div className={styles.form}>
              <label className={styles.fieldLabel}>
                Images (multiple)
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className={styles.fileInput}
                  onChange={(e) => onPickFiles(e.target.files)}
                />
              </label>
              {form.images.length > 0 && (
                <div className={styles.imageGrid}>
                  {form.images.map((url, idx) => (
                    <div key={`${url}-${idx}`} className={styles.imageTile}>
                      <img src={url} alt="" />
                      <button
                        type="button"
                        className={styles.removeImg}
                        onClick={() => removeImageAt(idx)}
                        aria-label="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className={styles.sectionTitle}>Location &amp; map coordinates</p>
              <DestinationMapPicker
                key={editingId ?? 'create'}
                lat={form.lat}
                lng={form.lng}
                onPick={(la, ln) => {
                  setForm((f) => ({
                    ...f,
                    lat: la.toFixed(6),
                    lng: ln.toFixed(6),
                  }));
                }}
              />

              <input
                placeholder="Destination name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <div className={styles.formRow2}>
                <input
                  placeholder="Latitude"
                  value={form.lat}
                  onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                  inputMode="decimal"
                />
                <input
                  placeholder="Longitude"
                  value={form.lng}
                  onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                  inputMode="decimal"
                />
              </div>
              <input
                placeholder="Address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
              <div className={styles.formRow2}>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  aria-label="Destination category"
                >
                  <option value="">Select category</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input placeholder="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'hidden' }))}
              >
                <option value="active">Active</option>
                <option value="hidden">Hidden</option>
              </select>

              <label className={styles.fieldLabelMuted}>Operating hours</label>
              <textarea
                placeholder="e.g. Mon–Fri 9:00–17:00, Sat 10:00–14:00"
                value={form.operatingHours}
                onChange={(e) => setForm((f) => ({ ...f, operatingHours: e.target.value }))}
                rows={2}
              />

              <label className={styles.fieldLabelMuted}>Contact</label>
              <div className={styles.formRow2}>
                <input
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>

              <label className={styles.fieldLabelMuted}>Website &amp; social</label>
              <input
                placeholder="Website URL"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              />
              <div className={styles.formRow3}>
                <input
                  placeholder="Facebook URL"
                  value={form.socialFacebook}
                  onChange={(e) => setForm((f) => ({ ...f, socialFacebook: e.target.value }))}
                />
                <input
                  placeholder="Instagram URL"
                  value={form.socialInstagram}
                  onChange={(e) => setForm((f) => ({ ...f, socialInstagram: e.target.value }))}
                />
                <input
                  placeholder="X / Twitter URL"
                  value={form.socialTwitter}
                  onChange={(e) => setForm((f) => ({ ...f, socialTwitter: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="button" className={styles.saveBtn} onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
