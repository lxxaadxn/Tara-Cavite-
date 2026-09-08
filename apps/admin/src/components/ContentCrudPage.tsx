import { Fragment, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { RowMenu, type RowMenuItem } from './RowMenu';
import { PencilIcon } from './rowIcons';
import styles from './ContentCrudPage.module.css';

const DEFAULT_PAGE_SIZE = 30;

function pageList(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) out.push('gap');
    out.push(page);
  });
  return out;
}

function itemLabel<T extends { id: string }>(row: T): string {
  const rec = row as Record<string, unknown>;
  for (const key of ['name', 'ta_name', 'label', 'title']) {
    const value = rec[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function pluralNoun(noun: string): string {
  if (noun.endsWith('y')) return `${noun.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/.test(noun)) return `${noun}es`;
  return `${noun}s`;
}

function itemNoun(title: string): string {
  const t = title.trim().toLowerCase();
  if (t === 'tourist attractions') return 'attraction';
  if (t === 'cities/municipalities' || t === 'cities') return 'city';
  if (t === 'municipalities') return 'municipality';
  if (t === 'categories') return 'category';
  if (t.endsWith('ies')) return `${t.slice(0, -3)}y`;
  if (t.endsWith('s')) return t.slice(0, -1);
  return t || 'item';
}

export type CrudColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

export type CrudField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'datetime-local';
  placeholder?: string;
  /** Shown under the control (preferred over long placeholders). */
  helpText?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  /** In wide modal grid, span both columns. */
  span?: 'full' | 'half';
  /** Skip rendering when false. */
  visibleWhen?: (form: Record<string, unknown>) => boolean;
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
  /** Extra UI after a named field (e.g. map under Google Maps link). */
  renderAfterField?: (key: string, ctx: CrudExtraFormCtx<T>) => ReactNode;
  /** Dropdowns beside search (e.g. city / municipality). */
  selectFilters?: {
    key: string;
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  }[];
  /** Additional row predicate after status + search. */
  rowFilter?: (row: T) => boolean;
  /** Called when the modal closes (cancel, overlay, or successful save). */
  onModalClose?: () => void;
  /** Called when the Add modal opens (reset staging state). */
  onOpenCreate?: () => void;
  /** Wide modal + 2-column form grid for denser edit UIs. */
  modalSize?: 'default' | 'wide';
  /** Size to content when nested (e.g. landing page). */
  embedded?: boolean;
  /** Override columns based on the active status tab. */
  getColumns?: (status: string) => CrudColumn<T>[];
  /** Extra entries listed above Delete in the row's kebab menu. */
  rowMenuItems?: (row: T, ctx: { status: string; saving: boolean }) => RowMenuItem[];
  /** Primary save button label (defaults to Save / Saving…). */
  saveLabel?: string | ((form: Omit<T, 'id'>) => string);
  /** Show Delete in the edit modal footer (requires onDelete). Default true when onDelete is set. */
  modalDelete?: boolean;
  /** Rows per page. 0 lists every row; embedded tables are never paginated. */
  pageSize?: number;
};

function newId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ContentCrudPage<T extends { id: string }>({
  title,
  description: _description,
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
  persistenceNote: _persistenceNote,
  loading = false,
  error = null,
  renderExtraForm,
  renderAfterField,
  selectFilters,
  rowFilter,
  onModalClose,
  onOpenCreate,
  modalSize = 'default',
  embedded = false,
  getColumns,
  rowMenuItems,
  saveLabel,
  modalDelete,
  pageSize = DEFAULT_PAGE_SIZE,
}: Props<T>) {
  const isWide = modalSize === 'wide';
  const isLive = Boolean(onCreate || onUpdate || onDelete);
  const showModalDelete = modalDelete ?? Boolean(onDelete);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<T, 'id'>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const activeColumns = useMemo(
    () => (getColumns ? getColumns(status) : columns),
    [getColumns, columns, status]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter && status !== 'all' && !statusFilter.match(row, status)) return false;
      if (rowFilter && !rowFilter(row)) return false;
      if (!q) return true;
      return searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q));
    });
  }, [rows, query, status, searchKeys, statusFilter, rowFilter]);

  const paginated = !embedded && pageSize > 0;
  const pageCount = paginated ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
  const currentPage = Math.min(page, pageCount);
  const pageStart = paginated ? (currentPage - 1) * pageSize : 0;
  const visible = paginated ? filtered.slice(pageStart, pageStart + pageSize) : filtered;

  const noun = itemNoun(title);
  const pageSummary =
    filtered.length === 0
      ? `Showing 0 ${pluralNoun(noun)}`
      : `Showing ${pageStart + 1}–${pageStart + visible.length} of ${filtered.length} ${
          filtered.length === 1 ? noun : pluralNoun(noun)
        }`;

  useEffect(() => {
    setPage(1);
  }, [query, status, filtered.length]);

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

  const requestRemove = (row: T) => {
    if (saving || deleting) return;
    setDeleteError(null);
    setPendingDelete({ id: row.id, label: itemLabel(row) });
  };

  const cancelRemove = () => {
    if (deleting) return;
    setPendingDelete(null);
    setDeleteError(null);
  };

  const confirmRemove = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;

    if (isLive) {
      if (!onDelete) return;
      setDeleting(true);
      setDeleteError(null);
      try {
        await onDelete(id);
        setPendingDelete(null);
        if (modalOpen && editingId === id) {
          setModalOpen(false);
          setEditingId(null);
          setForm(emptyForm);
          onModalClose?.();
        }
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : 'Delete failed');
      } finally {
        setDeleting(false);
      }
      return;
    }

    onChange?.(rows.filter((r) => r.id !== id));
    setPendingDelete(null);
    if (modalOpen && editingId === id) {
      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      onModalClose?.();
    }
  };

  const setField = (key: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const searchAndAdd = (
    <div className={styles.toolbarRight}>
      {(selectFilters ?? []).map((filter) => (
        <select
          key={filter.key}
          className={styles.filterSelect}
          value={filter.value}
          aria-label={filter.label}
          onChange={(e) => filter.onChange(e.target.value)}
        >
          {filter.options.map((opt) => (
            <option key={opt.value || `${filter.key}-all`} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
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
      {onCreate ? (
        <button type="button" className={styles.primaryBtn} onClick={openCreate} disabled={loading || saving}>
          {addLabel}
        </button>
      ) : null}
    </div>
  );

  return (
    <div className={`${styles.page}${embedded ? ` ${styles.embedded}` : ''}`}>
      <header className={styles.header}>
        {!statusFilter ? searchAndAdd : null}
      </header>

      {error ? <p className={styles.loadError}>{error}</p> : null}

      {statusFilter ? (
        <div className={styles.toolbar}>
          <div className={styles.tabs} role="tablist" aria-label="Status filter">
            <button
              type="button"
              role="tab"
              aria-selected={status === 'all'}
              className={`${styles.tab} ${status === 'all' ? styles.tabActive : ''}`}
              onClick={() => setStatus('all')}
            >
              All
            </button>
            {statusFilter.options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="tab"
                aria-selected={status === o.value}
                className={`${styles.tab} ${status === o.value ? styles.tabActive : ''}`}
                onClick={() => setStatus(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
          {searchAndAdd}
        </div>
      ) : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {activeColumns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
              <th className={styles.actionsHead}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && visible.length === 0 ? (
              <tr className={styles.rowCard}>
                <td colSpan={activeColumns.length + 1} className={styles.empty}>
                  No records match your search.
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={row.id} className={styles.rowCard}>
                  {activeColumns.map((col) => (
                    <td key={col.key}>{col.render(row)}</td>
                  ))}
                  <td className={styles.actionsHead}>
                    <div className={styles.rowTools}>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        aria-label={`Edit ${itemLabel(row) || noun}`}
                        title="Edit"
                        onClick={() => openEdit(row)}
                        disabled={saving}
                      >
                        <PencilIcon />
                      </button>
                      <RowMenu
                        label={`More actions for ${itemLabel(row) || noun}`}
                        items={[
                          ...(rowMenuItems?.(row, { status, saving }) ?? []),
                          {
                            label: 'Delete',
                            onSelect: () => requestRemove(row),
                            danger: true,
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {paginated ? (
          <div className={styles.pagination}>
            <span className={styles.pageInfo}>{pageSummary}</span>
            <div className={styles.pageBtns}>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              >
                Prev
              </button>
              {pageList(currentPage, pageCount).map((item, index) =>
                item === 'gap' ? (
                  <span key={`gap-${index}`} className={styles.pageGap}>
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    className={`${styles.pageBtn} ${item === currentPage ? styles.pageBtnActive : ''}`}
                    aria-current={item === currentPage ? 'page' : undefined}
                    onClick={() => setPage(item)}
                  >
                    {item}
                  </button>
                )
              )}
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
                disabled={currentPage >= pageCount}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
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
            <h2 id="crud-modal-title">{editingId ? 'Edit' : 'Add'} {itemNoun(title)}</h2>
            <div className={isWide ? styles.formGrid : styles.form}>
              {fields.map((field) => {
                if (field.visibleWhen && !field.visibleWhen(form as Record<string, unknown>)) {
                  return null;
                }
                const value = (form as Record<string, unknown>)[field.key];
                const spanFull =
                  field.span === 'full' ||
                  field.type === 'textarea' ||
                  field.type === 'checkbox';
                const fieldClass = `${styles.field}${spanFull && isWide ? ` ${styles.spanFull}` : ''}`;
                const extraCtx = { form, setForm, editingId, saving };
                const help = field.helpText ? (
                  <span className={styles.fieldHelp}>{field.helpText}</span>
                ) : null;
                let control: ReactNode;
                if (field.type === 'checkbox') {
                  control = (
                    <div className={isWide ? styles.spanFull : undefined}>
                      <label className={styles.checkLabel}>
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(e) => setField(field.key, e.target.checked)}
                          disabled={saving}
                        />
                        {field.label}
                      </label>
                      {help}
                    </div>
                  );
                } else if (field.type === 'textarea') {
                  control = (
                    <label className={fieldClass}>
                      {field.label}
                      <textarea
                        value={String(value ?? '')}
                        placeholder={field.placeholder}
                        rows={5}
                        onChange={(e) => setField(field.key, e.target.value)}
                        disabled={saving}
                      />
                      {help}
                    </label>
                  );
                } else if (field.type === 'select') {
                  const current = String(value ?? '');
                  const options = [...(field.options ?? [])];
                  if (
                    current &&
                    !options.some((o) => o.value === current)
                  ) {
                    options.push({ value: current, label: `${current} (not in lookup)` });
                  }
                  control = (
                    <label className={fieldClass}>
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
                      {help}
                    </label>
                  );
                } else {
                  const inputType =
                    field.type === 'number'
                      ? 'number'
                      : field.type === 'datetime-local'
                        ? 'datetime-local'
                        : 'text';
                  control = (
                    <label className={fieldClass}>
                      {field.label}
                      <input
                        type={inputType}
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
                      {help}
                    </label>
                  );
                }
                return (
                  <Fragment key={field.key}>
                    {control}
                    {renderAfterField?.(field.key, extraCtx)}
                  </Fragment>
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
              {showModalDelete && editingId ? (
                <button
                  type="button"
                  className={styles.modalDeleteBtn}
                  onClick={() => {
                    const row = rows.find((r) => r.id === editingId);
                    if (row) requestRemove(row);
                  }}
                  disabled={saving || deleting}
                >
                  Delete
                </button>
              ) : (
                <span className={styles.modalActionsSpacer} aria-hidden />
              )}
              <div className={styles.modalActionsRight}>
                <button type="button" className={styles.actionBtn} onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button type="button" className={styles.primaryBtn} onClick={() => void save()} disabled={saving}>
                  {saving
                    ? 'Saving…'
                    : typeof saveLabel === 'function'
                      ? saveLabel(form)
                      : saveLabel || 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={
          pendingDelete?.label
            ? `Delete “${pendingDelete.label}”?`
            : `Delete this ${itemNoun(title)}?`
        }
        message={
          isLive
            ? 'This removes it from Supabase and the public catalog. This cannot be undone.'
            : 'This only removes it from local demo state.'
        }
        confirming={deleting}
        error={deleteError}
        onConfirm={() => void confirmRemove()}
        onCancel={cancelRemove}
      />
    </div>
  );
}

export function CrudBadge({
  label,
  tone = 'neutral',
  icon,
  title,
}: {
  label: string;
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue';
  icon?: ReactNode;
  title?: string;
}) {
  return (
    <span className={`${styles.badge} ${styles[`tone_${tone}`]}`} title={title}>
      {icon}
      {label}
    </span>
  );
}
