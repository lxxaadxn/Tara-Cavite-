import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  announcementVisibilityStatus,
  createAnnouncement,
  deleteAnnouncement,
  fetchOwnAnnouncements,
  formatAnnouncementDateLabel,
  formatAnnouncementDateTimeParts,
  updateAnnouncement,
} from 'cavitour-shared/announcements';
import {
  announcementFormToWriteInput,
  mapsLinkFromCoords,
  toDatetimeLocalValue,
} from '@admin/lib/adminAnnouncements';
import { RowMenu } from '@admin/components/RowMenu';
import { PencilIcon } from '@admin/components/rowIcons';
import { AnnouncementCard, AnnouncementDetailModal } from '../../components/announcementCards';
import { supabase } from '../../lib/supabase';
import { fetchOwnListing, uploadListingPhoto } from '../../lib/establishmentListing';
import { defaultPlace } from './ownerDisplay';
import styles from '../EstablishmentPortal.module.css';

function coordText(value) {
  return value == null || !Number.isFinite(value) ? '' : String(value);
}

/**
 * Blank form. The coordinates and Maps link are not editable here; they ride
 * along from the establishment's own pin so Open map on the traveler card
 * lands on the place instead of a name search.
 */
function emptyForm(place, listing) {
  const latitude = coordText(listing?.latitude);
  const longitude = coordText(listing?.longitude);
  return {
    kind: 'event',
    title: '',
    place,
    body: '',
    is_published: true,
    published_at: '',
    image_url: '',
    action_url: '',
    event_starts_at: '',
    event_ends_at: '',
    venue_name: '',
    google_maps_link: listing?.googleMapsLink || mapsLinkFromCoords(latitude, longitude),
    latitude,
    longitude,
    visibility: 'published',
  };
}

function formFrom(item, place) {
  const latitude = coordText(item.latitude);
  const longitude = coordText(item.longitude);
  return {
    kind: item.kind === 'advisory' ? 'advisory' : 'event',
    title: item.title ?? '',
    // Always the owner's own listing, never whatever was stored before.
    place,
    body: item.body ?? '',
    is_published: item.isPublished,
    published_at: toDatetimeLocalValue(item.publishedAt),
    image_url: item.imageUrl ?? '',
    action_url: item.actionUrl ?? '',
    event_starts_at: toDatetimeLocalValue(item.eventStartsAt),
    event_ends_at: toDatetimeLocalValue(item.eventEndsAt),
    venue_name: item.venueName ?? '',
    google_maps_link: item.mapsUrl || mapsLinkFromCoords(latitude, longitude),
    latitude,
    longitude,
    visibility: announcementVisibilityStatus(item),
  };
}

function saveButtonLabel(visibility) {
  if (visibility === 'draft') return 'Save draft';
  if (visibility === 'scheduled') return 'Schedule';
  return 'Publish';
}

function statusToneClass(visibility) {
  if (visibility === 'published') return styles.toneGreen;
  if (visibility === 'scheduled') return styles.toneBlue;
  return styles.toneNeutral;
}

function statusLabel(visibility) {
  if (visibility === 'published') return 'Published';
  if (visibility === 'scheduled') return 'Scheduled';
  return 'Draft';
}

function eventDateCell(item) {
  if (item.kind !== 'event') return '—';
  const [starts] = formatAnnouncementDateTimeParts(item.eventStartsAt, item.eventEndsAt);
  return starts || '—';
}

function insertAroundSelection(value, start, end, before, after) {
  const selected = value.slice(start, end) || 'text';
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
  return { next, caret: start + before.length + selected.length + after.length };
}

// `query` comes from the search box in the top bar beside the page title.
export function AnnouncementsPanel({ owner, query, adding, onCloseAdd }) {
  const [posts, setPosts] = useState([]);
  const [listing, setListing] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  // A row opens the form seeded for editing. Creating is driven by `adding`,
  // because the Add button lives in the top bar beside the page title.
  const [editTarget, setEditTarget] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // An establishment announcement is always tagged to its own listing, so the
  // place is read straight off the owner record instead of being editable.
  const place = defaultPlace(owner);

  const reload = useCallback(async () => {
    try {
      setPosts(await fetchOwnAnnouncements(supabase, owner.id));
    } catch {
      setPosts([]);
    }
  }, [owner.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Only needed to pin a new announcement at the establishment by default.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const row = await fetchOwnListing(owner.staPlaceId);
      if (!cancelled) setListing(row);
    })();
    return () => {
      cancelled = true;
    };
  }, [owner.staPlaceId]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return posts;
    return posts.filter((item) =>
      `${item.title} ${item.venueName} ${item.body} ${item.kind}`.toLowerCase().includes(needle)
    );
  }, [posts, query]);

  const closeForm = () => {
    setEditTarget(null);
    onCloseAdd();
  };

  const afterSave = async (text) => {
    closeForm();
    setError('');
    setMessage(text);
    await reload();
  };

  return (
    <article className={styles.dossier}>
      <div className={styles.body}>
        {message ? <p className={styles.ok}>{message}</p> : null}
        {error ? <p className={styles.err}>{error}</p> : null}

        {posts.length === 0 ? (
          <p className={styles.empty}>You have not posted any announcements yet.</p>
        ) : filtered.length === 0 ? (
          <p className={styles.empty}>No announcements match your search.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cover</th>
                  <th>Title</th>
                  <th>Kind</th>
                  <th>Event date</th>
                  <th>Status</th>
                  <th>Goes live</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const visibility = announcementVisibilityStatus(item);
                  return (
                    <tr key={item.id}>
                      <td>
                        {item.imageUrl ? (
                          <img className={styles.tableThumb} src={item.imageUrl} alt="" />
                        ) : (
                          <span className={styles.thumbEmpty}>—</span>
                        )}
                      </td>
                      <td>
                        <strong>{item.title}</strong>
                        {item.venueName ? (
                          <p className={styles.cellSub}>{item.venueName}</p>
                        ) : null}
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            item.kind === 'advisory' ? styles.toneAmber : styles.toneGreen
                          }`}
                        >
                          {item.kind === 'advisory' ? 'Advisory' : 'Event'}
                        </span>
                      </td>
                      <td>{eventDateCell(item)}</td>
                      <td>
                        <span className={`${styles.badge} ${statusToneClass(visibility)}`}>
                          {statusLabel(visibility)}
                        </span>
                      </td>
                      <td>
                        {item.publishedAt ? formatAnnouncementDateLabel(item.publishedAt) : '—'}
                      </td>
                      <td>
                        <div className={styles.rowTools}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            aria-label={`Edit ${item.title}`}
                            title="Edit"
                            onClick={() => {
                              setMessage('');
                              setEditTarget(item);
                            }}
                          >
                            <PencilIcon />
                          </button>
                          <RowMenu
                            label={`More actions for ${item.title}`}
                            items={[
                              {
                                label: 'View as traveler',
                                onSelect: () => setViewing(item),
                              },
                              {
                                label: 'Delete',
                                onSelect: () => setDeleting(item),
                                danger: true,
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editTarget || adding ? (
        <AnnouncementFormDialog
          owner={owner}
          place={place}
          listing={listing}
          item={editTarget}
          onClose={closeForm}
          onSaved={afterSave}
        />
      ) : null}

      {viewing ? (
        <TravelerViewDialog
          item={viewing}
          onSeeMore={setDetail}
          onClose={() => {
            setViewing(null);
            setDetail(null);
          }}
        />
      ) : null}

      <AnnouncementDetailModal item={detail} onClose={() => setDetail(null)} />

      {deleting ? (
        <DeleteAnnouncementDialog
          item={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={async () => {
            setDeleting(null);
            setMessage('Announcement deleted.');
            await reload();
          }}
        />
      ) : null}
    </article>
  );
}

function AnnouncementFormDialog({ owner, place, listing, item, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    item ? formFrom(item, place) : emptyForm(place, listing)
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const coverRef = useRef(null);
  const bodyRef = useRef(null);

  const busy = saving || uploading;
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  // Covers go to the owner's own place-images folder, the one bucket their
  // storage policy already allows them to write to.
  const pickCover = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadListingPhoto(owner.staPlaceId, file);
      set('image_url', url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload the image.');
    } finally {
      setUploading(false);
      if (coverRef.current) coverRef.current.value = '';
    }
  };

  const wrapBody = (before, after) => {
    const el = bodyRef.current;
    const value = String(form.body ?? '');
    if (!el) {
      set('body', `${before}${value || 'text'}${after}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const { next, caret } = insertAroundSelection(value, start, end, before, after);
    set('body', next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const insertBullet = () => {
    const el = bodyRef.current;
    const value = String(form.body ?? '');
    if (!el) {
      set('body', value ? `${value}\n• ` : '• ');
      return;
    }
    const start = el.selectionStart ?? value.length;
    const prefix = start > 0 && value[start - 1] !== '\n' ? '\n• ' : '• ';
    set('body', `${value.slice(0, start)}${prefix}${value.slice(start)}`);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + prefix.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      // Same mapper the admin console uses, so visibility, scheduling and
      // coordinate fallbacks behave identically on both sides.
      const input = announcementFormToWriteInput(form);
      if (item) {
        await updateAnnouncement(supabase, item.id, input);
        await onSaved('Announcement updated.');
      } else {
        await createAnnouncement(supabase, {
          ...input,
          source: 'establishment',
          authorId: owner.id,
          establishmentOwnerId: owner.id,
        });
        await onSaved(
          form.visibility === 'draft' ? 'Draft saved.' : 'Announcement posted.'
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the announcement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className={styles.formModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-form-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className={styles.previewHead}>
          <h2 id="announcement-form-title" className={styles.previewTitle}>
            {item ? 'Edit announcement' : 'Add announcement'}
          </h2>
          <button
            type="button"
            className={styles.previewClose}
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className={styles.formBody}>
          <div className={styles.grid}>
            <label className={`${styles.field} ${styles.span2}`}>
              <span className={styles.label}>Title</span>
              <input
                className={styles.input}
                value={form.title}
                disabled={busy}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Amadeo Coffee Weekend"
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Kind</span>
              <select
                className={styles.select}
                value={form.kind}
                disabled={busy}
                onChange={(e) => set('kind', e.target.value)}
              >
                <option value="event">Event</option>
                <option value="advisory">Advisory</option>
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Visibility</span>
              <select
                className={styles.select}
                value={form.visibility}
                disabled={busy}
                onChange={(e) => set('visibility', e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
              </select>
              <p className={styles.mapNote}>
                Draft stays private. Scheduled goes live at the date below.
              </p>
            </label>

            {form.visibility !== 'draft' ? (
              <label className={styles.field}>
                <span className={styles.label}>Posted / schedule date</span>
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={form.published_at}
                  disabled={busy}
                  onChange={(e) => set('published_at', e.target.value)}
                />
                <p className={styles.mapNote}>
                  For Published: when it went live. For Scheduled: when travelers should see it.
                </p>
              </label>
            ) : null}

            <label className={styles.field}>
              <span className={styles.label}>Place / area</span>
              <input className={`${styles.input} ${styles.inputLocked}`} value={place} readOnly />
              <p className={styles.mapNote}>
                Always your establishment. Update it from the Establishment tab.
              </p>
            </label>

            <label className={`${styles.field} ${styles.span2}`}>
              <span className={styles.label}>Venue name</span>
              <input
                className={styles.input}
                value={form.venue_name}
                disabled={busy}
                onChange={(e) => set('venue_name', e.target.value)}
                placeholder="e.g. Garden deck"
              />
              <p className={styles.mapNote}>Optional specific venue shown with the place.</p>
            </label>

            {form.kind === 'event' ? (
              // Own grid so the pair stays side by side however the fields
              // above it flow.
              <div className={`${styles.grid} ${styles.span2}`}>
                <label className={styles.field}>
                  <span className={styles.label}>Event start</span>
                  <input
                    className={styles.input}
                    type="datetime-local"
                    value={form.event_starts_at}
                    disabled={busy}
                    onChange={(e) => set('event_starts_at', e.target.value)}
                    required
                  />
                  <p className={styles.mapNote}>Required for events — when the event happens.</p>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Event end</span>
                  <input
                    className={styles.input}
                    type="datetime-local"
                    value={form.event_ends_at}
                    disabled={busy}
                    onChange={(e) => set('event_ends_at', e.target.value)}
                  />
                  <p className={styles.mapNote}>Optional.</p>
                </label>
              </div>
            ) : null}

            <div className={`${styles.field} ${styles.span2}`}>
              <span className={styles.label}>Cover image</span>
              {form.image_url ? (
                <div className={styles.coverPreview}>
                  <img src={form.image_url} alt="" />
                </div>
              ) : null}
              <div className={styles.coverActions}>
                <label className={styles.ghostBtn}>
                  {uploading ? 'Uploading…' : 'Upload image'}
                  <input
                    ref={coverRef}
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={busy}
                    onChange={(e) => void pickCover(e.target.files?.[0])}
                  />
                </label>
                {form.image_url ? (
                  <button
                    type="button"
                    className={styles.dangerBtn}
                    disabled={busy}
                    onClick={() => set('image_url', '')}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>

            <label className={`${styles.field} ${styles.span2}`}>
              <span className={styles.label}>Or paste image URL</span>
              <input
                className={styles.input}
                value={form.image_url}
                disabled={busy}
                placeholder="https://"
                onChange={(e) => set('image_url', e.target.value)}
              />
              <p className={styles.mapNote}>Optional. Upload a file or paste an https link.</p>
            </label>

            <label className={`${styles.field} ${styles.span2}`}>
              <span className={styles.label}>Register link</span>
              <input
                className={styles.input}
                value={form.action_url}
                disabled={busy}
                placeholder="www.example.com/register"
                onChange={(e) => set('action_url', e.target.value)}
              />
              <p className={styles.mapNote}>Optional. https:// is added automatically if missing.</p>
            </label>

            <div className={`${styles.field} ${styles.span2}`}>
              <span className={styles.label}>Details (See more)</span>
              <div className={styles.bodyToolbar}>
                <button
                  type="button"
                  className={styles.toolbarBtn}
                  disabled={busy}
                  onClick={() => wrapBody('**', '**')}
                >
                  Bold
                </button>
                <button
                  type="button"
                  className={styles.toolbarBtn}
                  disabled={busy}
                  onClick={insertBullet}
                >
                  Bullet
                </button>
              </div>
              <textarea
                ref={bodyRef}
                className={styles.textarea}
                rows={6}
                value={form.body}
                disabled={busy}
                onChange={(e) => set('body', e.target.value)}
                placeholder="What travelers should know"
                required
              />
              <p className={styles.mapNote}>
                Use Bold for **emphasis**. Line breaks are kept on the traveler page.
              </p>
            </div>
          </div>

          {error ? <p className={styles.err}>{error}</p> : null}
        </div>

        <div className={styles.formFoot}>
          <button type="button" className={styles.ghostBtn} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={styles.primaryBtn} disabled={busy}>
            {saving ? 'Saving…' : saveButtonLabel(form.visibility)}
          </button>
        </div>
      </form>
    </div>
  );
}

function TravelerViewDialog({ item, onSeeMore, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.viewModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-view-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.previewHead}>
          <h2 id="announcement-view-title" className={styles.previewTitle}>
            How travelers see it
          </h2>
          <button
            type="button"
            className={styles.previewClose}
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className={styles.viewBody}>
          <p className={styles.hint}>
            Your card in the traveler Announcements feed. Choose See more to read it the way
            travelers do.
          </p>
          <div className={styles.cardStage}>
            <AnnouncementCard item={item} onSeeMore={onSeeMore} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteAnnouncementDialog({ item, onClose, onDeleted }) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !removing) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [removing, onClose]);

  const confirm = async () => {
    setRemoving(true);
    setError('');
    try {
      await deleteAnnouncement(supabase, item.id);
      await onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete it.');
      setRemoving(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={() => {
        if (!removing) onClose();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-delete-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="announcement-delete-title" className={styles.modalTitle}>
          Delete this announcement?
        </h2>
        <p className={styles.hint}>
          “{item.title}” disappears from the traveler Announcements page and the notification bell
          right away. This cannot be undone.
        </p>
        {error ? <p className={styles.err}>{error}</p> : null}
        <div className={styles.modalActions}>
          <button type="button" className={styles.ghostBtn} onClick={onClose} disabled={removing}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.dangerSolidBtn}
            onClick={() => void confirm()}
            disabled={removing}
          >
            {removing ? 'Deleting…' : 'Delete announcement'}
          </button>
        </div>
      </div>
    </div>
  );
}
