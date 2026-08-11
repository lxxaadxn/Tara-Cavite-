import { useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import styles from './ContentCrudPage.module.css';

export type CrudColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

export type CrudField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'select' | 'checkbox';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  /** In wide modal grid, span both columns. */
  span?: 'full' | 'half';
};

export type CrudExtraFormCtx<T extends { id: string }> = {
  form: Omit<T, 'id'>;
  setForm: Dispatch<SetStateAction<Omit<T, 'id'>>>;
  editingId: string | null;
  saving: boolean;
};

type Props<T extends { id: string }> = {
  title: string;
  description?: string;
  rows: T[];
  columns: CrudColumn<T>[];
  fields: CrudField[];
  searchKeys: (keyof T)[];
  statusFilter?: {
    options: { value: string; label: string }[];
    match: (row: T, value: string) => boolean;
  };
  emptyForm: Omit<T, 'id'>;
  /** Local/demo mutation path. Used when async hooks are not provided. */
  onChange?: (rows: T[]) => void;
  /** When set, Save/Delete call these instead of mutating via onChange. */
  onCreate?: (form: Omit<T, 'id'>) => Promise<void>;
  onUpdate?: (id: string, form: Omit<T, 'id'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  addLabel?: string;
  toForm?: (row: T) => Omit<T, 'id'>;
  fromForm?: (form: Omit<T, 'id'>, id: string) => T;
  /** Optional note under description (defaults based on live vs demo). */
  persistenceNote?: string | null;
  loading?: boolean;
  error?: string | null;
  /** Extra controls below standard fields (e.g. About + images). */
  renderExtraForm?: (ctx: CrudExtraFormCtx<T>) => ReactNode;
  /** Called when the modal closes (cancel, overlay, or successful save). */
  onModalClose?: () => void;
  /** Called when the Add modal opens (reset staging state). */
  onOpenCreate?: () => void;
  /** Wide modal + 2-column form grid for denser edit UIs. */
  modalSize?: 'default' | 'wide';
};

function newId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ContentCrudPage<T extends { id: string }>({
  title,
  description,
  rows,
  columns,
  fields,
  searchKeys,
  statusFilter,
  emptyForm,
  onChange,
  onCreate,
  onUpdate,
  onDelete,
  addLabel = 'Add',
  toForm,
  fromForm,
  persistenceNote,
  loading = false,
  error = null,
  renderExtraForm,
  onModalClose,
  onOpenCreate,
  modalSize = 'default',
}: Props<T>) {
  const isWide = modalSize === 'wide';
  const isLive = Boolean(onCreate || onUpdate || onDelete);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<T, 'id'>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter && status !== 'all' && !statusFilter.match(row, status)) return false;
      if (!q) return true;
      return searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q));
    });
  }, [rows, query, status, searchKeys, statusFilter]);

  const note =
    persistenceNote === null
      ? null
      : persistenceNote ??
        (isLive
          ? 'Live Supabase — changes update the public catalog.'
          : 'Demo CRUD — changes stay in this session only.');

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setActionError(null);
    onOpenCreate?.();
    setModalOpen(true);
  };

  const openEdit = (row: T) => {
    setEditingId(row.id);
    setForm(toForm ? toForm(row) : (({ id: _id, ...rest }) => rest as Omit<T, 'id'>)(row));
    setActionError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setActionError(null);
    onModalClose?.();
  };

  const save = async () => {
    setActionError(null);
    if (isLive) {
      setSaving(true);
      try {
        if (editingId) {
          if (!onUpdate) throw new Error('Update is not supported');
          await onUpdate(editingId, form);
        } else {
          if (!onCreate) throw new Error('Create is not supported');
          await onCreate(form);
        }
        setModalOpen(false);
        setEditingId(null);
        setForm(emptyForm);
        onModalClose?.();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!onChange) return;
    if (editingId) {
      onChange(
        rows.map((r) =>
          r.id === editingId ? (fromForm ? fromForm(form, editingId) : ({ ...form, id: editingId } as T)) : r
        )
      );
    } else {
      const id = newId();
      onChange([...rows, fromForm ? fromForm(form, id) : ({ ...form, id } as T)]);
    }
    closeModal();
  };

  const remove = async (id: string) => {
    const confirmMsg = isLive
      ? 'Delete this attraction from Supabase? This affects the public catalog.'
      : 'Delete this item? (Demo only — local state.)';
    if (!window.confirm(confirmMsg)) return;

    if (isLive) {
      if (!onDelete) return;
      try {
        await onDelete(id);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Delete failed');
      }
      return;
    }

    onChange?.(rows.filter((r) => r.id !== id));
  };

  const setField = (key: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
          {note ? <p className={styles.demoNote}>{note}</p> : null}
        </div>
        <button type="button" className={styles.primaryBtn} onClick={openCreate} disabled={loading || saving}>
          {addLabel}
        </button>
      </header>

      {error ? <p className={styles.loadError}>{error}</p> : null}
      {loading ? <p className={styles.loadState}>Loading…</p> : null}

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {statusFilter ? (
          <select
            className={styles.filter}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Status filter"
          >
            <option value="all">All statuses</option>
            {statusFilter.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className={styles.empty}>
                  No records match your search.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td key={col.key}>{col.render(row)}</td>
                  ))}
                  <td>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => openEdit(row)}
                        disabled={saving}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.danger}`}
                        onClick={() => void remove(row.id)}
                        disabled={saving}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen ? (
        <div className={styles.overlay} role="presentation" onClick={closeModal}>
          <div
            className={`${styles.modal} ${isWide ? styles.modalWide : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="crud-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="crud-modal-title">{editingId ? 'Edit' : 'Add'} {title.replace(/s$/, '')}</h2>
            <div className={isWide ? styles.formGrid : styles.form}>
              {fields.map((field) => {
                const value = (form as Record<string, unknown>)[field.key];
                const spanFull =
                  field.span === 'full' ||
                  field.type === 'textarea' ||
                  field.type === 'checkbox';
                const fieldClass = `${styles.field}${spanFull && isWide ? ` ${styles.spanFull}` : ''}`;
                if (field.type === 'checkbox') {
                  return (
                    <label
                      key={field.key}
                      className={`${styles.checkLabel}${isWide ? ` ${styles.spanFull}` : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => setField(field.key, e.target.checked)}
                        disabled={saving}
                      />
                      {field.label}
                    </label>
                  );
                }
                if (field.type === 'textarea') {
                  return (
                    <label key={field.key} className={fieldClass}>
                      {field.label}
                      <textarea
                        value={String(value ?? '')}
                        placeholder={field.placeholder}
                        rows={3}
                        onChange={(e) => setField(field.key, e.target.value)}
                        disabled={saving}
                      />
                    </label>
                  );
                }
                if (field.type === 'select') {
                  const current = String(value ?? '');
                  const options = [...(field.options ?? [])];
                  if (
                    current &&
                    !options.some((o) => o.value === current)
                  ) {
                    options.push({ value: current, label: `${current} (not in lookup)` });
                  }
                  return (
                    <label key={field.key} className={fieldClass}>
                      {field.label}
                      <select
                        value={current}
                        onChange={(e) => setField(field.key, e.target.value)}
                        disabled={saving}
                      >
                        {options.map((o) => (
                          <option key={o.value || '__empty'} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }
                return (
                  <label key={field.key} className={fieldClass}>
                    {field.label}
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={value == null ? '' : String(value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      onChange={(e) =>
                        setField(
                          field.key,
                          field.type === 'number' ? Number(e.target.value) : e.target.value
                        )
                      }
                      disabled={saving}
                    />
                  </label>
                );
              })}
              {renderExtraForm ? (
                <div className={isWide ? styles.spanFull : undefined}>
                  {renderExtraForm({ form, setForm, editingId, saving })}
                </div>
              ) : null}
            </div>
            {actionError ? <p className={styles.loadError}>{actionError}</p> : null}
            <div className={styles.modalActions}>
              <button type="button" className={styles.actionBtn} onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="button" className={styles.primaryBtn} onClick={() => void save()} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CrudBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue';
}) {
  return <span className={`${styles.badge} ${styles[`tone_${tone}`]}`}>{label}</span>;
}
