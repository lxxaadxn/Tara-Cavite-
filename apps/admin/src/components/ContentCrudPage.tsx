import { useMemo, useState, type ReactNode } from 'react';
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
  onChange: (rows: T[]) => void;
  addLabel?: string;
  toForm?: (row: T) => Omit<T, 'id'>;
  fromForm?: (form: Omit<T, 'id'>, id: string) => T;
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
  addLabel = 'Add',
  toForm,
  fromForm,
}: Props<T>) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<T, 'id'>>(emptyForm);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter && status !== 'all' && !statusFilter.match(row, status)) return false;
      if (!q) return true;
      return searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q));
    });
  }, [rows, query, status, searchKeys, statusFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row: T) => {
    setEditingId(row.id);
    setForm(toForm ? toForm(row) : (({ id: _id, ...rest }) => rest as Omit<T, 'id'>)(row));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = () => {
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

  const remove = (id: string) => {
    if (!window.confirm('Delete this item? (Demo only — local state.)')) return;
    onChange(rows.filter((r) => r.id !== id));
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
          <p className={styles.demoNote}>Demo CRUD — changes stay in this session only.</p>
        </div>
        <button type="button" className={styles.primaryBtn} onClick={openCreate}>
          {addLabel}
        </button>
      </header>

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
            {filtered.length === 0 ? (
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
                      <button type="button" className={styles.actionBtn} onClick={() => openEdit(row)}>
                        Edit
                      </button>
                      <button type="button" className={`${styles.actionBtn} ${styles.danger}`} onClick={() => remove(row.id)}>
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
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="crud-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="crud-modal-title">{editingId ? 'Edit' : 'Add'} {title.replace(/s$/, '')}</h2>
            <div className={styles.form}>
              {fields.map((field) => {
                const value = (form as Record<string, unknown>)[field.key];
                if (field.type === 'checkbox') {
                  return (
                    <label key={field.key} className={styles.checkLabel}>
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => setField(field.key, e.target.checked)}
                      />
                      {field.label}
                    </label>
                  );
                }
                if (field.type === 'textarea') {
                  return (
                    <label key={field.key} className={styles.field}>
                      {field.label}
                      <textarea
                        value={String(value ?? '')}
                        placeholder={field.placeholder}
                        rows={3}
                        onChange={(e) => setField(field.key, e.target.value)}
                      />
                    </label>
                  );
                }
                if (field.type === 'select') {
                  return (
                    <label key={field.key} className={styles.field}>
                      {field.label}
                      <select
                        value={String(value ?? '')}
                        onChange={(e) => setField(field.key, e.target.value)}
                      >
                        {(field.options ?? []).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }
                return (
                  <label key={field.key} className={styles.field}>
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
                    />
                  </label>
                );
              })}
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.actionBtn} onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className={styles.primaryBtn} onClick={save}>
                Save
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
