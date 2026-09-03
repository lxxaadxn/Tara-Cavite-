import { useEffect, useId } from 'react';

const DEFAULT_PRIMARY = '#10A37F';

function IconBookmarkSmall(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden {...props}>
      <path d="M6 4h12v16l-6-4-6 4V4z" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronRight(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function pluralCountLabel(count, label) {
  if (count === 1) {
    return label.endsWith('s') ? label.slice(0, -1) : label;
  }
  return label;
}

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {string} [props.itemLabel]
 * @param {Array<{ id?: string, name: string, items?: unknown[] }>} [props.lists]
 * @param {string} props.listNameDraft
 * @param {(value: string) => void} props.onListNameChange
 * @param {(listId: string) => void} props.onSelectList
 * @param {() => void} props.onCreateList
 * @param {boolean} [props.createDisabled]
 * @param {string} [props.primaryButtonLabel]
 * @param {string} [props.primaryColor]
 * @param {string} [props.countLabel]
 */
export function SaveToListModal({
  open,
  onClose,
  title = 'Save to list',
  subtitle = 'Choose a list or create a new one.',
  itemLabel,
  lists = [],
  listNameDraft,
  onListNameChange,
  onSelectList,
  onCreateList,
  createDisabled,
  primaryButtonLabel = 'Create list',
  primaryColor = DEFAULT_PRIMARY,
  countLabel = 'places',
}) {
  const titleId = useId();
  const inputId = useId();
  const hasLists = lists.length > 0;
  const createBlocked = createDisabled ?? !String(listNameDraft ?? '').trim();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !createBlocked) {
      e.preventDefault();
      onCreateList();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-end justify-center bg-neutral-900/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:rounded-3xl sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-neutral-200 sm:hidden" aria-hidden />

        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-1 pt-4 sm:pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>
            {itemLabel ? (
              <p className="mt-1 truncate text-sm font-medium text-neutral-700">{itemLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-3">
          {hasLists ? (
            <ul className="max-h-48 space-y-0.5 overflow-y-auto overscroll-contain">
              {lists.map((l) => {
                const count = Array.isArray(l.items) ? l.items.length : 0;
                const listKey = l.id ?? l.name;
                return (
                  <li key={listKey}>
                    <button
                      type="button"
                      onClick={() => onSelectList(l.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-neutral-50 active:scale-[0.99]"
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E4F3EE] text-[#10A37F]"
                        aria-hidden
                      >
                        <IconBookmarkSmall />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-neutral-900">{l.name}</span>
                        <span className="text-xs text-neutral-500">
                          {count} {pluralCountLabel(count, countLabel)}
                        </span>
                      </span>
                      <IconChevronRight className="shrink-0 text-neutral-400" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">No lists yet — create one below.</p>
          )}

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-neutral-100" />
            </div>
            <p className="relative mx-auto w-fit bg-white px-3 text-xs text-neutral-500">Or create a list</p>
          </div>

          <label htmlFor={inputId} className="sr-only">
            List name
          </label>
          <input
            id={inputId}
            type="text"
            value={listNameDraft}
            onChange={(e) => onListNameChange(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="List name"
            autoFocus={!hasLists}
            className="h-11 w-full rounded-xl border border-neutral-200 px-3.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(16, 163, 127,0.22)]"
          />
        </div>

        <div className="shrink-0 border-t border-neutral-100 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onCreateList}
            disabled={createBlocked}
            className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
            style={{
              backgroundColor: primaryColor,
              boxShadow: createBlocked ? undefined : `0 4px 14px ${primaryColor}33`,
            }}
          >
            {primaryButtonLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full py-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
