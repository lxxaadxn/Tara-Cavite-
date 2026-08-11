import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react';
import { ContentCrudPage, CrudBadge } from '../../components/ContentCrudPage';
import styles from '../../components/ContentCrudPage.module.css';
import { useToast } from '../../components/Toast';
import { persistStaAboutAndMedia } from '../../lib/staAttractionMedia';
import {
  type StaHighlight,
  type StaV3Form,
  deleteStaV3Row,
  fetchStaV3Rows,
  insertStaV3Row,
  rowImages,
  rowToForm,
  updateStaV3Row,
} from '../../lib/staV3CatalogAdmin';
import {
  type StaLookups,
  fetchStaLookups,
  mergeSelectOptions,
  tableSelectOptions,
} from '../../lib/staLookups';
import { supabase } from '../../lib/supabase';

/** Admin table/form row (string coords for inputs + About/media/hours/contact). */
type StaCrudRow = {
  id: string;
  ta_name: string;
  city_mun: string;
  barangay: string;
  address: string;
  google_maps_link: string;
  latitude: string;
  longitude: string;
  type_code: string;
  ta_category: string;
  ntdp_category: string;
  highlight: StaHighlight;
  sheet_name: string;
  is_listed: boolean;
  description: string;
  images: string[];
  openingHours: string;
  closingHours: string;
  phone: string;
  email: string;
  website: string;
  /** Search aliases */
  name: string;
  city: string;
};

const emptyForm: Omit<StaCrudRow, 'id'> = {
  ta_name: '',
  city_mun: '',
  barangay: '',
  address: '',
  google_maps_link: '',
  latitude: '',
  longitude: '',
  type_code: '',
  ta_category: '',
  ntdp_category: '',
  highlight: 'none',
  sheet_name: '',
  is_listed: false,
  description: '',
  images: [],
  openingHours: '',
  closingHours: '',
  phone: '',
  email: '',
  website: '',
  name: '',
  city: '',
};

const emptyLookups: StaLookups = {
  typeCodes: [],
  taCategories: [],
  ntdpCategories: [],
  cities: [],
};

function toCrudRow(
  formLike: StaV3Form & {
    id: string;
    is_listed: boolean;
    images?: string[];
  }
): StaCrudRow {
  return {
    id: formLike.id,
    ta_name: formLike.ta_name,
    city_mun: formLike.city_mun ?? '',
    barangay: formLike.barangay ?? '',
    address: formLike.address ?? '',
    google_maps_link: formLike.google_maps_link ?? '',
    latitude: formLike.latitude ?? '',
    longitude: formLike.longitude ?? '',
    type_code: formLike.type_code ?? '',
    ta_category: formLike.ta_category ?? '',
    ntdp_category: formLike.ntdp_category ?? '',
    highlight: formLike.highlight ?? 'none',
    sheet_name: formLike.sheet_name ?? '',
    is_listed: formLike.is_listed,
    description: formLike.description ?? '',
    images: formLike.images ?? [],
    openingHours: formLike.openingHours ?? '',
    closingHours: formLike.closingHours ?? '',
    phone: formLike.phone ?? '',
    email: formLike.email ?? '',
    website: formLike.website ?? '',
    name: formLike.ta_name,
    city: formLike.city_mun ?? '',
  };
}

function toStaForm(form: Omit<StaCrudRow, 'id'>): StaV3Form {
  const city = String(form.city_mun || form.city || '').trim();
  return {
    sheet_name: String(form.sheet_name || city || '').trim(),
    ta_name: String(form.ta_name || form.name || '').trim(),
    type_code: String(form.type_code ?? ''),
    ta_category: String(form.ta_category ?? ''),
    ntdp_category: String(form.ntdp_category ?? ''),
    city_mun: city,
    barangay: String(form.barangay ?? ''),
    address: String(form.address ?? ''),
    google_maps_link: String(form.google_maps_link ?? ''),
    latitude: String(form.latitude ?? ''),
    longitude: String(form.longitude ?? ''),
    highlight: form.highlight ?? 'none',
    description: String(form.description ?? ''),
    openingHours: String(form.openingHours ?? ''),
    closingHours: String(form.closingHours ?? ''),
    phone: String(form.phone ?? ''),
    email: String(form.email ?? ''),
    website: String(form.website ?? ''),
  };
}

function formatCoord(v: string): string {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(4);
}

function AttractionAboutPhotos({
  form,
  setForm,
  saving,
  fileRef,
  fileByBlobUrl,
  imagesAtOpenRef,
}: {
  form: Omit<StaCrudRow, 'id'>;
  setForm: Dispatch<SetStateAction<Omit<StaCrudRow, 'id'>>>;
  saving: boolean;
  fileRef: RefObject<HTMLInputElement | null>;
  fileByBlobUrl: MutableRefObject<Map<string, File>>;
  imagesAtOpenRef: MutableRefObject<string[]>;
}) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!lightboxUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxUrl(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxUrl]);

  return (
    <div className={styles.extraSection}>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          Opening
          <input
            type="time"
            value={form.openingHours ?? ''}
            disabled={saving}
            onChange={(e) => setForm((prev) => ({ ...prev, openingHours: e.target.value }))}
          />
        </label>
        <label className={styles.field}>
          Closing
          <input
            type="time"
            value={form.closingHours ?? ''}
            disabled={saving}
            onChange={(e) => setForm((prev) => ({ ...prev, closingHours: e.target.value }))}
          />
        </label>
        <label className={styles.field}>
          Phone
          <input
            type="tel"
            value={form.phone ?? ''}
            placeholder="Optional"
            disabled={saving}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
          />
        </label>
        <label className={styles.field}>
          Email
          <input
            type="email"
            value={form.email ?? ''}
            placeholder="Optional"
            disabled={saving}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
        </label>
        <label className={`${styles.field} ${styles.spanFull}`}>
          Website
          <input
            type="url"
            value={form.website ?? ''}
            placeholder="https://…"
            disabled={saving}
            onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
          />
        </label>
      </div>
      <label className={styles.field}>
        About
        <textarea
          value={form.description ?? ''}
          placeholder="Public about text…"
          rows={4}
          disabled={saving}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        />
      </label>
      <div className={styles.field}>
        <span>Photos</span>
        <label className={styles.fileBtn}>
          Add images
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            disabled={saving}
            onChange={(e) => {
              const files = e.target.files;
              if (!files?.length) return;
              for (let i = 0; i < files.length; i++) {
                const f = files.item(i);
                if (f && f.type.startsWith('image/')) {
                  const url = URL.createObjectURL(f);
                  fileByBlobUrl.current.set(url, f);
                  setForm((prev) => ({ ...prev, images: [...(prev.images ?? []), url] }));
                }
              }
              if (fileRef.current) fileRef.current.value = '';
            }}
          />
        </label>
      </div>
      {(form.images ?? []).length > 0 ? (
        <div className={styles.imageGrid}>
          {(form.images ?? []).map((url, idx) => (
            <div key={`${url}-${idx}`} className={styles.imageTile}>
              <button
                type="button"
                className={styles.imageTileBtn}
                aria-label="View image"
                disabled={saving}
                onClick={() => setLightboxUrl(url)}
              >
                <img src={url} alt="" />
              </button>
              <button
                type="button"
                className={styles.removeImg}
                aria-label="Remove image"
                disabled={saving}
                onClick={(e) => {
                  e.stopPropagation();
                  setForm((prev) => {
                    const images = [...(prev.images ?? [])];
                    const [removed] = images.splice(idx, 1);
                    if (
                      removed?.startsWith('blob:') &&
                      !imagesAtOpenRef.current.includes(removed)
                    ) {
                      fileByBlobUrl.current.delete(removed);
                      URL.revokeObjectURL(removed);
                    }
                    return { ...prev, images };
                  });
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.loadState}>No photos yet</p>
      )}
      {lightboxUrl ? (
        <div
          className={styles.lightbox}
          role="presentation"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            className={styles.lightboxClose}
            aria-label="Close"
            onClick={() => setLightboxUrl(null)}
          >
            ×
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className={styles.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}

export function ContentEstablishments() {
  const toast = useToast();
  const [rows, setRows] = useState<StaCrudRow[]>([]);
  const [lookups, setLookups] = useState<StaLookups>(emptyLookups);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileByBlobUrl = useRef<Map<string, File>>(new Map());
  const imagesAtOpenRef = useRef<string[]>([]);

  const clearBlobMap = useCallback(() => {
    for (const u of fileByBlobUrl.current.keys()) {
      URL.revokeObjectURL(u);
    }
    fileByBlobUrl.current.clear();
    imagesAtOpenRef.current = [];
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, nextLookups] = await Promise.all([
        fetchStaV3Rows(supabase),
        fetchStaLookups(supabase),
      ]);
      setLookups(nextLookups);
      setRows(
        data.map((row) =>
          toCrudRow({
            id: row.id,
            is_listed: row.is_listed,
            ...rowToForm(row),
            images: rowImages(row),
          })
        )
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load STA attractions';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const cityOptions = useMemo(() => tableSelectOptions(lookups.cities), [lookups.cities]);
  const taCategoryOptions = useMemo(
    () => tableSelectOptions(lookups.taCategories),
    [lookups.taCategories]
  );
  const typeCodeOptions = useMemo(
    () => mergeSelectOptions(
      lookups.typeCodes,
      rows.map((r) => r.type_code)
    ),
    [lookups.typeCodes, rows]
  );
  const ntdpOptions = useMemo(
    () => mergeSelectOptions(
      lookups.ntdpCategories,
      rows.map((r) => r.ntdp_category)
    ),
    [lookups.ntdpCategories, rows]
  );

  const saveStaAndMedia = async (form: Omit<StaCrudRow, 'id'>, staId?: string) => {
    const staForm = toStaForm(form);
    const saved = staId
      ? await updateStaV3Row(supabase, staId, staForm)
      : await insertStaV3Row(supabase, staForm);
    await persistStaAboutAndMedia(supabase, {
      staId: saved.id,
      description: String(form.description ?? ''),
      images: form.images ?? [],
      fileByBlobUrl: fileByBlobUrl.current,
      openingHours: String(form.openingHours ?? ''),
      closingHours: String(form.closingHours ?? ''),
      phone: String(form.phone ?? ''),
      email: String(form.email ?? ''),
      website: String(form.website ?? ''),
    });
    for (const u of form.images ?? []) {
      if (u.startsWith('blob:')) {
        fileByBlobUrl.current.delete(u);
        URL.revokeObjectURL(u);
      }
    }
    imagesAtOpenRef.current = [];
    return saved;
  };

  const handleCreate = async (form: Omit<StaCrudRow, 'id'>) => {
    await saveStaAndMedia(form);
    toast('Attraction created', 'success');
    await reload();
  };

  const handleUpdate = async (id: string, form: Omit<StaCrudRow, 'id'>) => {
    await saveStaAndMedia(form, id);
    toast('Attraction updated', 'success');
    await reload();
  };

  const handleDelete = async (id: string) => {
    await deleteStaV3Row(supabase, id);
    toast('Attraction deleted', 'success');
    await reload();
  };

  return (
    <ContentCrudPage<StaCrudRow>
      title="Tourist Attractions"
      description="Manage STA catalog listings, hours, about text, and photos."
      modalSize="wide"
      rows={rows}
      loading={loading}
      error={error}
      emptyForm={emptyForm}
      addLabel="Add attraction"
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onModalClose={() => {
        clearBlobMap();
      }}
      onOpenCreate={() => {
        clearBlobMap();
        imagesAtOpenRef.current = [];
      }}
      toForm={(row) => {
        clearBlobMap();
        imagesAtOpenRef.current = [...(row.images ?? [])];
        return {
          ...emptyForm,
          ...row,
          name: row.ta_name,
          city: row.city_mun,
          description: row.description ?? '',
          images: [...(row.images ?? [])],
          openingHours: row.openingHours ?? '',
          closingHours: row.closingHours ?? '',
          phone: row.phone ?? '',
          email: row.email ?? '',
          website: row.website ?? '',
        };
      }}
      searchKeys={[
        'ta_name',
        'city_mun',
        'barangay',
        'address',
        'name',
        'city',
        'type_code',
        'ta_category',
        'ntdp_category',
        'description',
        'phone',
        'email',
        'website',
      ]}
      statusFilter={{
        options: [
          { value: 'listed', label: 'Listed' },
          { value: 'hidden', label: 'Hidden' },
        ],
        match: (row, value) => (value === 'listed' ? row.is_listed : !row.is_listed),
      }}
      fields={[
        { key: 'ta_name', label: 'Name', required: true, span: 'full' },
        {
          key: 'city_mun',
          label: 'City / Municipality',
          type: 'select',
          required: true,
          options: cityOptions,
        },
        { key: 'barangay', label: 'Barangay' },
        { key: 'address', label: 'Address', type: 'textarea', span: 'full' },
        {
          key: 'google_maps_link',
          label: 'Google Maps link',
          placeholder: 'https://www.google.com/maps/...',
          span: 'full',
        },
        { key: 'latitude', label: 'Latitude', placeholder: 'From Maps link if empty' },
        { key: 'longitude', label: 'Longitude', placeholder: 'From Maps link if empty' },
        {
          key: 'type_code',
          label: 'Type code',
          type: 'select',
          options: typeCodeOptions,
        },
        {
          key: 'ta_category',
          label: 'TA category',
          type: 'select',
          options: taCategoryOptions,
        },
        {
          key: 'ntdp_category',
          label: 'NTDP category',
          type: 'select',
          options: ntdpOptions,
        },
        {
          key: 'highlight',
          label: 'Display',
          type: 'select',
          options: [
            { value: 'none', label: 'Display' },
            { value: 'red', label: 'Hidden (red)' },
            { value: 'yellow', label: 'Hidden (yellow)' },
          ],
        },
      ]}
      renderExtraForm={({ form, setForm, saving }) => (
        <AttractionAboutPhotos
          form={form}
          setForm={setForm}
          saving={saving}
          fileRef={fileRef}
          fileByBlobUrl={fileByBlobUrl}
          imagesAtOpenRef={imagesAtOpenRef}
        />
      )}
      columns={[
        {
          key: 'photo',
          header: 'Photo',
          render: (r) =>
            r.images[0] ? (
              <img src={r.images[0]} alt="" className={styles.tableThumb} />
            ) : (
              <span className={styles.tableThumbEmpty}>—</span>
            ),
        },
        { key: 'name', header: 'Name', render: (r) => <strong>{r.ta_name}</strong> },
        { key: 'city', header: 'City', render: (r) => r.city_mun || '—' },
        { key: 'barangay', header: 'Barangay', render: (r) => r.barangay || '—' },
        {
          key: 'address',
          header: 'Address',
          render: (r) =>
            r.address ? (r.address.length > 48 ? `${r.address.slice(0, 48)}…` : r.address) : '—',
        },
        {
          key: 'listed',
          header: 'Listed',
          render: (r) => (
            <CrudBadge label={r.is_listed ? 'Listed' : 'Hidden'} tone={r.is_listed ? 'green' : 'neutral'} />
          ),
        },
        {
          key: 'highlight',
          header: 'Display',
          render: (r) => {
            if (r.highlight === 'red') return <CrudBadge label="Hidden (red)" tone="red" />;
            if (r.highlight === 'yellow') return <CrudBadge label="Hidden (yellow)" tone="amber" />;
            return <CrudBadge label="Display" tone="green" />;
          },
        },
        {
          key: 'coords',
          header: 'Lat / Lng',
          render: (r) => `${formatCoord(r.latitude)} / ${formatCoord(r.longitude)}`,
        },
      ]}
    />
  );
}
