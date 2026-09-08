import { useEffect, useState } from 'react';

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {'edit' | 'create'} [props.mode]
 * @param {{ id?: string, name?: string, privacy?: 'private' | 'public' } | null} props.list
 * @param {() => void} props.onClose
 * @param {(patch: { name: string, privacy: 'private' | 'public' }) => void} props.onSave
 * @param {string} [props.error]
 */
export function SavedListEditModal({ open, list, onClose, onSave, error = '', mode = 'edit' }) {
  const [nameDraft, setNameDraft] = useState('');
  const [privacy, setPrivacy] = useState('private');
  const isCreate = mode === 'create';

  useEffect(() => {
    if (!open) return;
    setNameDraft(list?.name || '');
    setPrivacy(list?.privacy === 'public' ? 'public' : 'private');
  }, [open, list]);

  if (!open) return null;
  if (!isCreate && !list) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = String(nameDraft ?? '').trim();
    if (!trimmed) return;
    onSave({ name: trimmed, privacy });
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-list-title"
      onClick={onClose}
    >
      <form
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="edit-list-title" className="font-['Poppins',sans-serif] text-lg font-bold text-neutral-900">
              {isCreate ? 'Create list' : 'Edit list'}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {isCreate
                ? 'Make a collection for places and itineraries you save.'
                : 'Change the name or who can see this collection.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <label className="mt-5 block text-xs font-semibold text-neutral-600" htmlFor="edit-list-name">
          List name
        </label>
        <input
          id="edit-list-name"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          placeholder="e.g. Weekend spots"
          className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none transition focus:border-[#10A37F]/50 focus:ring-2 focus:ring-[rgba(16,163,127,0.2)]"
          autoFocus
        />

        <fieldset className="mt-5">
          <legend className="text-xs font-semibold text-neutral-600">Privacy</legend>
          <div className="mt-2 space-y-2">
            {[
              { value: 'private', title: 'Private', desc: 'Only you can view and edit this list.' },
              { value: 'public', title: 'Public', desc: 'Others can discover and view this list.' },
            ].map((opt) => {
              const selected = privacy === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition ${
                    selected
                      ? 'border-[#10A37F] bg-[#F1F7F6] ring-1 ring-[#10A37F]/25'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="list-privacy"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setPrivacy(opt.value)}
                    className="mt-1 accent-[#10A37F]"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-neutral-900">{opt.title}</span>
                    <span className="mt-0.5 block text-xs text-neutral-500">{opt.desc}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-[#10A37F] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
          >
            {isCreate ? 'Create list' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
