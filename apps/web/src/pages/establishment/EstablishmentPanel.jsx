import { useCallback, useEffect, useRef, useState } from 'react';
import { parseCoordsFromMapsUrl } from '@admin/lib/staV3CatalogAdmin';
import { EstablishmentPreview } from '../../components/EstablishmentPreview';
import { ListingLocationPicker } from '../../components/ListingLocationPicker';
import {
  fetchOwnListing,
  listingBlockers,
  saveOwnListing,
  uploadListingPhoto,
} from '../../lib/establishmentListing';
import styles from '../EstablishmentPortal.module.css';

const emptyDraft = {
  description: '',
  gallery: [],
  openingHours: '',
  closingHours: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  googleMapsLink: '',
  latitude: null,
  longitude: null,
};

function draftFrom(listing) {
  if (!listing) return { ...emptyDraft };
  return {
    description: listing.description,
    gallery: listing.gallery,
    openingHours: listing.openingHours,
    closingHours: listing.closingHours,
    phone: listing.phone,
    email: listing.email,
    website: listing.website,
    address: listing.address,
    googleMapsLink: listing.googleMapsLink,
    latitude: listing.latitude,
    longitude: listing.longitude,
  };
}

/** One titled card of the listing form. */
function Section({ title, hint, children }) {
  return (
    <article className={styles.dossier}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        <p className={styles.sectionHint}>{hint}</p>
      </div>
      <div className={styles.body}>
        <div className={styles.grid}>{children}</div>
      </div>
    </article>
  );
}

export function EstablishmentPanel({ owner, previewOpen = false, onClosePreview }) {
  const [listing, setListing] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const placeId = owner.staPlaceId;

  const loadListing = useCallback(async () => {
    const row = await fetchOwnListing(placeId);
    setListing(row);
    setDraft(draftFrom(row));
  }, [placeId]);

  useEffect(() => {
    void loadListing();
  }, [loadListing]);

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  /** Pasting a Maps link moves the pin, the same way the admin catalog form works. */
  const setMapsLink = (value) => {
    const parsed = parseCoordsFromMapsUrl(value);
    setDraft((d) => ({
      ...d,
      googleMapsLink: value,
      latitude: parsed ? parsed.lat : d.latitude,
      longitude: parsed ? parsed.lng : d.longitude,
    }));
  };

  const setPin = useCallback((lat, lng) => {
    setDraft((d) => ({ ...d, latitude: lat, longitude: lng }));
  }, []);

  const addPhotos = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      const urls = [];
      for (const file of files) {
        urls.push(await uploadListingPhoto(placeId, file));
      }
      setDraft((d) => ({ ...d, gallery: [...d.gallery, ...urls] }));
      setMessage('Photos added. Save to publish them.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload the photo.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const movePhoto = (index, step) => {
    setDraft((d) => {
      const next = [...d.gallery];
      const target = index + step;
      if (target < 0 || target >= next.length) return d;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...d, gallery: next };
    });
  };

  const removePhoto = (index) => {
    setDraft((d) => ({ ...d, gallery: d.gallery.filter((_, i) => i !== index) }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveOwnListing(draft);
      setMessage('Your listing was updated.');
      await loadListing();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your listing.');
    } finally {
      setSaving(false);
    }
  };

  const blockers = listingBlockers(listing);

  return (
    <div className={styles.stack}>
      {placeId ? (
        <form onSubmit={save} className={styles.stack}>
          {blockers.length > 0 ? (
            <p className={styles.notice}>
              Not visible to travelers yet. Your listing still needs {blockers.join(', ')}.
            </p>
          ) : null}

          <Section
            title="About and hours"
            hint="The opening lines and the times travelers read on your page."
          >
            <label className={`${styles.field} ${styles.span2}`}>
              <span className={styles.label}>About</span>
              <textarea
                className={styles.textarea}
                rows={5}
                value={draft.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Tell travelers what makes your place worth the trip."
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Opening</span>
              <input
                className={styles.input}
                type="time"
                value={draft.openingHours}
                onChange={(e) => set('openingHours', e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Closing</span>
              <input
                className={styles.input}
                type="time"
                value={draft.closingHours}
                onChange={(e) => set('closingHours', e.target.value)}
              />
            </label>
          </Section>

          <Section title="Contact" hint="How travelers reach you from your page.">
            <label className={styles.field}>
              <span className={styles.label}>Public phone</span>
              <input
                className={styles.input}
                value={draft.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Public email</span>
              <input
                className={styles.input}
                type="email"
                value={draft.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </label>
            <label className={`${styles.field} ${styles.span2}`}>
              <span className={styles.label}>Social media</span>
              <input
                className={styles.input}
                type="url"
                placeholder="https://…"
                value={draft.website}
                onChange={(e) => set('website', e.target.value)}
              />
            </label>
          </Section>

          <Section title="Location" hint="Where the map sends travelers when they tap directions.">
            <label className={styles.field}>
              <span className={styles.label}>Address</span>
              <input
                className={styles.input}
                value={draft.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Street, barangay, city or municipality, Cavite"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Google Maps link</span>
              <input
                className={styles.input}
                type="url"
                placeholder="https://www.google.com/maps/..."
                value={draft.googleMapsLink}
                onChange={(e) => setMapsLink(e.target.value)}
              />
            </label>
            <div className={`${styles.field} ${styles.span2}`}>
              <p className={styles.mapNote}>
                Paste the link above to drop the pin, then drag it or click the map to adjust
                exactly where travelers are sent.
              </p>
              <div className={styles.mapFrame}>
                <ListingLocationPicker lat={draft.latitude} lng={draft.longitude} onPick={setPin} />
              </div>
              <p className={styles.mapCoords}>
                {Number.isFinite(draft.latitude) && Number.isFinite(draft.longitude)
                  ? `Pin at ${draft.latitude.toFixed(6)}, ${draft.longitude.toFixed(6)}`
                  : 'No pin yet. Click the map to place one.'}
              </p>
            </div>
          </Section>

          <Section title="Photos" hint="The first photo is the cover travelers see first.">
            <div className={`${styles.field} ${styles.span2}`}>
              <div className={styles.photoGrid}>
                {draft.gallery.map((url, index) => (
                  <div key={url} className={styles.photoTile}>
                    <img className={styles.photoImg} src={url} alt="" />
                    {index === 0 ? <span className={styles.photoCover}>Cover</span> : null}
                    <div className={styles.photoTools}>
                      <button
                        type="button"
                        className={styles.photoBtn}
                        onClick={() => movePhoto(index, -1)}
                        disabled={index === 0}
                        aria-label="Move photo earlier"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className={styles.photoBtn}
                        onClick={() => movePhoto(index, 1)}
                        disabled={index === draft.gallery.length - 1}
                        aria-label="Move photo later"
                      >
                        ›
                      </button>
                      <button
                        type="button"
                        className={styles.photoBtn}
                        onClick={() => removePhoto(index)}
                        aria-label="Remove photo"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className={styles.photoAdd}
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading…' : '+ Add photos'}
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => void addPhotos([...(e.target.files ?? [])])}
              />
            </div>
          </Section>

          <footer className={styles.pageFoot}>
            <button type="submit" className={styles.primaryBtn} disabled={saving || uploading}>
              {saving ? 'Saving…' : 'Save listing'}
            </button>
            {message ? <p className={styles.ok}>{message}</p> : null}
            {error ? <p className={styles.err}>{error}</p> : null}
          </footer>
        </form>
      ) : (
        <p className={styles.hint}>
          No catalog listing is linked to this account yet, so there is nothing to edit. The Cavite
          Tourism Administration creates it when your establishment is added.
        </p>
      )}

      {previewOpen ? (
        <PreviewModal onClose={onClosePreview}>
          <EstablishmentPreview listing={listing} draft={draft} blockers={blockers} />
        </PreviewModal>
      ) : null}
    </div>
  );
}

/** Shows the preview at the width travelers actually browse it on. */
function PreviewModal({ onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.previewModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="traveler-preview-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.previewHead}>
          <h2 id="traveler-preview-title" className={styles.previewTitle}>
            Traveler preview
          </h2>
          <button
            type="button"
            className={styles.previewClose}
            onClick={onClose}
            aria-label="Close traveler preview"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className={styles.previewBody}>{children}</div>
      </div>
    </div>
  );
}
