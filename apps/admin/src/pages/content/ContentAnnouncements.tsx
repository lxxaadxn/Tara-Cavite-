import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { uploadSiteContentFile } from 'cavitour-shared/siteContent';
import { ContentCrudPage, CrudBadge, type CrudExtraFormCtx } from '../../components/ContentCrudPage';
import { DestinationMapPicker } from '../../components/DestinationMapPicker';
import {
  announcementDateLabel,
  createAnnouncementAdmin,
  deleteAnnouncementAdmin,
  fetchAnnouncementsAdmin,
  mapsLinkFromCoords,
  toDatetimeLocalValue,
  updateAnnouncementAdmin,
  type AnnouncementAdminRow,
  type AnnouncementVisibility,
} from '../../lib/adminAnnouncements';
import { parseCoordsFromMapsUrl } from '../../lib/staV3CatalogAdmin';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import styles from './ContentAnnouncements.module.css';

type AnnouncementForm = Omit<AnnouncementAdminRow, 'id'>;

const emptyForm: AnnouncementForm = {
  kind: 'event',
  title: '',
  place: '',
  body: '',
  source: 'admin',
  is_published: true,
  published_at: '',
  image_url: '',
  action_url: '',
  event_starts_at: '',
  event_ends_at: '',
  venue_name: '',
  google_maps_link: '',
  latitude: '',
  longitude: '',
  visibility: 'published',
};

function saveButtonLabel(form: AnnouncementForm): string {
  const v = form.visibility as AnnouncementVisibility;
  if (v === 'draft') return 'Save draft';
  if (v === 'scheduled') return 'Schedule';
  return 'Publish';
}

function statusTone(visibility: AnnouncementVisibility): 'neutral' | 'green' | 'amber' | 'blue' {
  if (visibility === 'published') return 'green';
  if (visibility === 'scheduled') return 'blue';
  return 'neutral';
}

function statusLabel(visibility: AnnouncementVisibility): string {
  if (visibility === 'scheduled') return 'Scheduled';
  if (visibility === 'published') return 'Published';
  return 'Draft';
}

function insertAroundSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string
): { next: string; caret: number } {
  const selected = value.slice(start, end) || 'text';
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
  return { next, caret: start + before.length + selected.length + after.length };
}

function VenueLocationMap({
  form,
  setForm,
  editingId,
}: {
  form: AnnouncementForm;
  setForm: Dispatch<SetStateAction<AnnouncementForm>>;
  editingId: string | null;
}) {
  const link = String(form.google_maps_link ?? '').trim();
  const lastSyncedLink = useRef<string | null>(null);

  useEffect(() => {
    lastSyncedLink.current = null;
  }, [editingId]);

  useEffect(() => {
    const parsed = parseCoordsFromMapsUrl(link);
    if (lastSyncedLink.current === null) {
      lastSyncedLink.current = link;
      if (!parsed) return;
      setForm((f) => {
        const hasLat = Number.isFinite(parseFloat(String(f.latitude)));
        const hasLng = Number.isFinite(parseFloat(String(f.longitude)));
        if (hasLat && hasLng) return f;
        return {
          ...f,
          latitude: parsed.lat.toFixed(7),
          longitude: parsed.lng.toFixed(7),
        };
      });
      return;
    }
    if (lastSyncedLink.current === link) return;
    lastSyncedLink.current = link;
    if (!parsed) return;
    setForm((f) => ({
      ...f,
      latitude: parsed.lat.toFixed(7),
      longitude: parsed.lng.toFixed(7),
    }));
  }, [link, setForm]);

  const parsed = parseCoordsFromMapsUrl(link);
  const latN = parseFloat(String(form.latitude ?? ''));
  const lngN = parseFloat(String(form.longitude ?? ''));
  const mapLat = Number.isFinite(latN) ? String(latN) : parsed ? String(parsed.lat) : '';
  const mapLng = Number.isFinite(lngN) ? String(lngN) : parsed ? String(parsed.lng) : '';

  return (
    <div className={styles.mapBlock}>
      <DestinationMapPicker
        key={editingId ?? 'create'}
        lat={mapLat}
        lng={mapLng}
        onPick={(la, ln) => {
          setForm((f) => ({
            ...f,
            latitude: la.toFixed(7),
            longitude: ln.toFixed(7),
            google_maps_link: mapsLinkFromCoords(String(la), String(ln)),
          }));
        }}
      />
    </div>
  );
}

function AnnouncementExtras({
  form,
  setForm,
  editingId: _editingId,
  saving,
}: CrudExtraFormCtx<AnnouncementAdminRow>) {
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onPickCover = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadSiteContentFile(supabase, 'announcements', file);
      setForm((prev) => ({ ...prev, image_url: url }));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const wrapBody = (before: string, after: string) => {
    const el = bodyRef.current;
    const value = String(form.body ?? '');
    if (!el) {
      setForm((prev) => ({ ...prev, body: `${before}${value || 'text'}${after}` }));
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const { next, caret } = insertAroundSelection(value, start, end, before, after);
    setForm((prev) => ({ ...prev, body: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const insertBullet = () => {
    const el = bodyRef.current;
    const value = String(form.body ?? '');
    if (!el) {
      setForm((prev) => ({ ...prev, body: value ? `${value}\n• ` : '• ' }));
      return;
    }
    const start = el.selectionStart ?? value.length;
    const prefix = start > 0 && value[start - 1] !== '\n' ? '\n• ' : '• ';
    const next = `${value.slice(0, start)}${prefix}${value.slice(start)}`;
    setForm((prev) => ({ ...prev, body: next }));
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + prefix.length;
      el.setSelectionRange(caret, caret);
    });
  };

  return (
    <>
      <div className={styles.coverBlock}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>
          Cover image
        </span>
        {form.image_url ? (
          <div className={styles.coverPreview}>
            <img src={form.image_url} alt="" />
          </div>
        ) : null}
        <div className={styles.coverActions}>
          <label className={styles.fileLabel}>
            {uploading ? 'Uploading…' : 'Upload image'}
            <input
              type="file"
              accept="image/*"
              disabled={saving || uploading}
              onChange={(e) => {
                void onPickCover(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          {form.image_url ? (
            <button
              type="button"
              className={styles.clearBtn}
              disabled={saving || uploading}
              onClick={() => setForm((prev) => ({ ...prev, image_url: '' }))}
            >
              Remove
            </button>
          ) : null}
        </div>
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary, #64748b)',
          }}
        >
          Or paste image URL
          <input
            value={form.image_url}
            disabled={saving || uploading}
            placeholder="https://"
            onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              fontSize: 14,
              fontFamily: 'inherit',
              fontWeight: 400,
            }}
          />
        </label>
        <p className={styles.mapHint}>Optional. Upload a file or paste an https link.</p>
        {uploadError ? <p className={styles.uploadError}>{uploadError}</p> : null}
      </div>

      <label
        className={styles.coverBlock}
        style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}
      >
        Register link
        <input
          value={form.action_url}
          disabled={saving}
          placeholder="www.example.com/register"
          onChange={(e) => setForm((prev) => ({ ...prev, action_url: e.target.value }))}
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            fontSize: 14,
            fontFamily: 'inherit',
            fontWeight: 400,
          }}
        />
        <span className={styles.mapHint}>Optional. https:// is added automatically if missing.</span>
      </label>

      <div className={styles.coverBlock}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>
          Details (See more)
        </span>
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.toolbarBtn}
            disabled={saving}
            onClick={() => wrapBody('**', '**')}
          >
            Bold
          </button>
          <button type="button" className={styles.toolbarBtn} disabled={saving} onClick={insertBullet}>
            Bullet
          </button>
        </div>
        <textarea
          ref={bodyRef}
          value={form.body}
          rows={6}
          disabled={saving}
          placeholder="What travelers should know"
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            fontSize: 14,
            fontFamily: 'inherit',
            fontWeight: 400,
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
          onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
        />
        <p className={styles.mapHint}>Use Bold for **emphasis**. Line breaks are kept on the traveler page.</p>
      </div>
    </>
  );
}

export function ContentAnnouncements() {
  const { session } = useAuth();
  const [rows, setRows] = useState<AnnouncementAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchAnnouncementsAdmin(supabase));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load announcements');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = async (form: AnnouncementForm) => {
    const authorId = session?.user?.id;
    if (!authorId) throw new Error('Sign in to post an announcement');
    await createAnnouncementAdmin(supabase, form, authorId);
    await reload();
  };

  const handleUpdate = async (id: string, form: AnnouncementForm) => {
    await updateAnnouncementAdmin(supabase, id, form);
    await reload();
  };

  const handleDelete = async (id: string) => {
    await deleteAnnouncementAdmin(supabase, id);
    await reload();
  };

  return (
    <ContentCrudPage<AnnouncementAdminRow>
      title="Announcements"
      rows={rows}
      loading={loading}
      error={error}
      emptyForm={emptyForm}
      modalSize="wide"
      saveLabel={(form) => saveButtonLabel(form)}
      toForm={(row) => ({
        kind: row.kind,
        title: row.title,
        place: row.place,
        body: row.body,
        source: row.source,
        is_published: row.is_published,
        published_at: toDatetimeLocalValue(row.published_at),
        image_url: row.image_url,
        action_url: row.action_url,
        event_starts_at: toDatetimeLocalValue(row.event_starts_at),
        event_ends_at: toDatetimeLocalValue(row.event_ends_at),
        venue_name: row.venue_name,
        google_maps_link: row.google_maps_link || mapsLinkFromCoords(row.latitude, row.longitude),
        latitude: row.latitude,
        longitude: row.longitude,
        visibility: row.visibility,
      })}
      addLabel="Add announcement"
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      searchKeys={['title', 'place', 'body', 'kind', 'venue_name']}
      statusFilter={{
        options: [
          { value: 'published', label: 'Published' },
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'draft', label: 'Draft' },
        ],
        match: (row, value) => row.visibility === value,
      }}
      fields={[
        { key: 'title', label: 'Title', required: true, placeholder: 'e.g. Amadeo Coffee Weekend', span: 'full' },
        {
          key: 'kind',
          label: 'Kind',
          type: 'select',
          options: [
            { value: 'event', label: 'Event' },
            { value: 'advisory', label: 'Advisory' },
          ],
        },
        {
          key: 'visibility',
          label: 'Visibility',
          type: 'select',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
            { value: 'scheduled', label: 'Scheduled' },
          ],
          helpText: 'Draft stays private. Scheduled goes live at the date below.',
        },
        {
          key: 'published_at',
          label: 'Posted / schedule date',
          type: 'datetime-local',
          helpText: 'For Published: when it went live. For Scheduled: when travelers should see it.',
          visibleWhen: (form) => form.visibility !== 'draft',
        },
        {
          key: 'place',
          label: 'Place / area',
          required: true,
          placeholder: 'City or corridor',
          helpText: 'Broad area shown on the card (e.g. Amadeo, Cavite).',
        },
        {
          key: 'venue_name',
          label: 'Venue name',
          placeholder: 'e.g. Pahimis Park',
          helpText: 'Optional specific venue shown with the place.',
        },
        {
          key: 'google_maps_link',
          label: 'Google Maps link',
          placeholder: 'https://www.google.com/maps/...',
          helpText: 'Paste a Google Maps place link to pin the venue on the map below.',
          span: 'full',
        },
        {
          key: 'event_starts_at',
          label: 'Event start',
          type: 'datetime-local',
          helpText: 'Required for events — when the event happens.',
          visibleWhen: (form) => form.kind === 'event',
        },
        {
          key: 'event_ends_at',
          label: 'Event end',
          type: 'datetime-local',
          helpText: 'Optional.',
          visibleWhen: (form) => form.kind === 'event',
        },
      ]}
      renderExtraForm={(ctx) => <AnnouncementExtras {...ctx} />}
      renderAfterField={(key, ctx) =>
        key === 'google_maps_link' ? (
          <VenueLocationMap form={ctx.form} setForm={ctx.setForm} editingId={ctx.editingId} />
        ) : null
      }
      columns={[
        { key: 'title', header: 'Title', render: (r) => <strong>{r.title}</strong> },
        {
          key: 'kind',
          header: 'Kind',
          render: (r) => (
            <CrudBadge label={r.kind === 'advisory' ? 'Advisory' : 'Event'} tone={r.kind === 'advisory' ? 'amber' : 'green'} />
          ),
        },
        {
          key: 'place',
          header: 'Place',
          render: (r) => (r.venue_name ? `${r.venue_name} · ${r.place}` : r.place),
        },
        {
          key: 'event',
          header: 'Event',
          render: (r) =>
            r.kind === 'event' ? announcementDateLabel(r.event_starts_at || null) || '—' : '—',
        },
        {
          key: 'status',
          header: 'Status',
          render: (r) => (
            <CrudBadge label={statusLabel(r.visibility)} tone={statusTone(r.visibility)} />
          ),
        },
        {
          key: 'when',
          header: 'Goes live',
          render: (r) => announcementDateLabel(r.published_at) || '—',
        },
      ]}
    />
  );
}
