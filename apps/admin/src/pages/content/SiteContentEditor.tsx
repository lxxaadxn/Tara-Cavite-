import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  fetchSiteContent,
  subscribeSiteContent,
  uploadSiteContentFile,
  upsertSiteContent,
} from 'cavitour-shared/siteContent';
import { useToastSoft } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import styles from './SiteContentEditor.module.css';

export type SiteContentField = {
  key: string;
  label: string;
  hint?: string;
  type?: 'text' | 'textarea' | 'image' | 'featureCard' | 'group';
  span?: 1 | 2;
  altKey?: string;
  altLabel?: string;
  /** Extra inputs rendered beside an image (e.g. favicon + tab title). */
  sideFields?: SiteContentField[];
  compact?: boolean;
  titleKey?: string;
  titleLabel?: string;
  bodyKey?: string;
  bodyLabel?: string;
  urlLabel?: string;
  /** Nested fields rendered inside one container (e.g. nav labels). */
  fields?: SiteContentField[];
};

function DevicePhotoPicker({
  src,
  emptyLabel,
  busy,
  previewClass,
  emptyClass,
  onPick,
}: {
  src: string;
  emptyLabel: string;
  busy: boolean;
  previewClass: string;
  emptyClass: string;
  onPick: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.devicePicker}>
      <button
        type="button"
        className={styles.previewHit}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {src ? <img className={previewClass} src={src} alt="" /> : <span className={emptyClass}>{emptyLabel}</span>}
      </button>
      <input
        ref={inputRef}
        className={styles.fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = '';
          onPick(file);
        }}
      />
      <button
        type="button"
        className={styles.uploadBtn}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'Uploading…' : src ? 'Replace photo' : 'Upload from device'}
      </button>
    </div>
  );
}

type Props = {
  title?: string;
  intro?: string;
  fields: SiteContentField[];
  folder?: string;
  layout?: 'stack' | 'twoColumn';
  /** No card chrome — for multi-column page layouts. */
  embedded?: boolean;
  children?: ReactNode;
};

export function SiteContentEditor({
  title,
  intro,
  fields,
  folder = 'cms',
  layout = 'stack',
  embedded = false,
  children,
}: Props) {
  const toast = useToastSoft();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const fieldKeys = (list: SiteContentField[]) => {
    const keys: string[] = [];
    for (const field of list) {
      if (field.type === 'group' && field.fields?.length) {
        keys.push(...fieldKeys(field.fields));
        continue;
      }
      keys.push(field.key);
      if (field.altKey) keys.push(field.altKey);
      if (field.titleKey) keys.push(field.titleKey);
      if (field.bodyKey) keys.push(field.bodyKey);
      if (field.sideFields?.length) keys.push(...fieldKeys(field.sideFields));
    }
    return keys;
  };

  const load = () =>
    fetchSiteContent(supabase)
      .then((map: Record<string, unknown>) => {
        const next: Record<string, string> = {};
        for (const key of fieldKeys(fields)) next[key] = String(map[key] ?? '');
        setValues(next);
      })
      .catch((e: unknown) => toast(e instanceof Error ? e.message : 'Could not load content', 'error'))
      .finally(() => setLoading(false));

  useEffect(() => {
    setLoading(true);
    void load();
    return subscribeSiteContent(supabase, () => {
      fetchSiteContent(supabase)
        .then((map: Record<string, unknown>) => {
          const next: Record<string, string> = {};
          for (const key of fieldKeys(fields)) next[key] = String(map[key] ?? '');
          setValues(next);
        })
        .catch(() => {});
    });
    // fields are static per page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const key of fieldKeys(fields)) payload[key] = values[key] ?? '';
      await upsertSiteContent(supabase, payload);
      toast('Saved. Travelers see this live.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (key: string, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Choose a JPG, PNG, or WebP image from your device.', 'error');
      return;
    }
    setUploadingKey(key);
    try {
      const url = await uploadSiteContentFile(supabase, folder, file);
      setValues((prev) => ({ ...prev, [key]: url }));
      await upsertSiteContent(supabase, { [key]: url });
      toast('Photo uploaded. Travelers see it live.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploadingKey(null);
    }
  };

  return (
    <form
      className={`${styles.page} ${layout === 'twoColumn' ? styles.pageWide : ''} ${embedded ? styles.pageBare : ''}`}
      onSubmit={(e) => void onSave(e)}
    >
      {title ? <h2 className={styles.heading}>{title}</h2> : null}
      {intro ? <p className={styles.intro}>{intro}</p> : null}
      {loading ? <p className={styles.meta}>Loading…</p> : null}
      <div className={layout === 'twoColumn' ? styles.grid : undefined}>
        {fields.map((field) => (
          <div
            key={field.key}
            className={`${styles.field} ${field.span === 2 && layout === 'twoColumn' ? styles.span2 : ''}`}
          >
            <span className={styles.label}>{field.label}</span>
            {field.hint && field.type === 'textarea' ? <span className={styles.hint}>{field.hint}</span> : null}
            {field.type === 'group' && field.fields?.length ? (
              <div className={styles.fieldGroup}>
                {field.fields.map((child) => (
                  <div
                    key={child.key}
                    className={`${styles.field} ${child.span === 2 ? styles.span2 : ''}`}
                  >
                    <span className={styles.label}>{child.label}</span>
                    {child.type === 'textarea' ? (
                      <textarea
                        className={`${styles.textarea} ${child.compact ? styles.textareaCompact : ''}`}
                        rows={child.compact ? 2 : 3}
                        value={values[child.key] ?? ''}
                        onChange={(e) =>
                          setValues((prev) => ({ ...prev, [child.key]: e.target.value }))
                        }
                      />
                    ) : (
                      <input
                        className={styles.input}
                        placeholder={child.hint}
                        value={values[child.key] ?? ''}
                        onChange={(e) =>
                          setValues((prev) => ({ ...prev, [child.key]: e.target.value }))
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : field.type === 'featureCard' ? (
              <div className={styles.featureCard}>
                <div className={styles.featureMedia}>
                  <DevicePhotoPicker
                    src={values[field.key] ?? ''}
                    emptyLabel="No photo yet — upload from your device"
                    busy={uploadingKey === field.key}
                    previewClass={styles.featurePreview}
                    emptyClass={styles.featurePreviewEmpty}
                    onPick={(file) => void onUpload(field.key, file)}
                  />
                </div>
                <div className={styles.featureCopy}>
                  <span className={styles.label}>{field.titleLabel || 'Title'}</span>
                  <input
                    className={styles.input}
                    value={values[field.titleKey ?? ''] ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.titleKey as string]: e.target.value }))
                    }
                  />
                  <span className={styles.label}>{field.bodyLabel || 'Description'}</span>
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    value={values[field.bodyKey ?? ''] ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.bodyKey as string]: e.target.value }))
                    }
                  />
                </div>
              </div>
            ) : field.type === 'textarea' ? (
              <textarea
                className={`${styles.textarea} ${field.compact ? styles.textareaCompact : ''}`}
                rows={field.compact ? 2 : layout === 'twoColumn' ? 3 : 4}
                value={values[field.key] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              />
            ) : field.type === 'image' ? (
              <div
                className={
                  field.altKey || field.sideFields?.length ? styles.imageSplit : styles.imageRow
                }
              >
                <div className={styles.imageMedia}>
                  <DevicePhotoPicker
                    src={values[field.key] ?? ''}
                    emptyLabel="No photo yet — upload from your device"
                    busy={uploadingKey === field.key}
                    previewClass={styles.preview}
                    emptyClass={styles.previewEmpty}
                    onPick={(file) => void onUpload(field.key, file)}
                  />
                </div>
                <div className={styles.imageMeta}>
                  {field.altKey ? (
                    <>
                      <span className={styles.label}>{field.altLabel || 'Alt text'}</span>
                      <input
                        className={styles.input}
                        value={values[field.altKey] ?? ''}
                        onChange={(e) =>
                          setValues((prev) => ({ ...prev, [field.altKey as string]: e.target.value }))
                        }
                      />
                    </>
                  ) : null}
                  {field.sideFields?.map((side) => (
                    <div key={side.key} className={styles.field}>
                      <span className={styles.label}>{side.label}</span>
                      {side.type === 'textarea' ? (
                        <textarea
                          className={`${styles.textarea} ${side.compact ? styles.textareaCompact : ''}`}
                          rows={side.compact ? 2 : 3}
                          value={values[side.key] ?? ''}
                          onChange={(e) =>
                            setValues((prev) => ({ ...prev, [side.key]: e.target.value }))
                          }
                        />
                      ) : (
                        <input
                          className={styles.input}
                          placeholder={side.hint}
                          value={values[side.key] ?? ''}
                          onChange={(e) =>
                            setValues((prev) => ({ ...prev, [side.key]: e.target.value }))
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <input
                className={styles.input}
                placeholder={field.hint}
                value={values[field.key] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>
      {children}
      <button type="submit" className={styles.save} disabled={saving || loading}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
