import { useEffect } from 'react';

/** Sample Cavite areas for filter chips (UI only). */
const CAVITE_AREA_LABELS = [
  'Amadeo',
  'Alfonso',
  'Bacoor City',
  'Carmona City',
  'Cavite City',
  'Dasmariñas City',
  'General Mariano Alvarez',
  'General Trias City',
  'Imus City',
  'Indang',
  'Magallanes',
  'Mendez-Nuñez',
  'Noveleta',
  'Silang',
  'Tagaytay City',
  'Tanza',
  'Trece Martires City',
];

const olive = '#7ea00e';
const CATEGORIES = [
    { label: 'Nature tourism', icon: '🌿' },
    { label: 'Mice & events', icon: '🥂' },
    { label: 'Restaurant', icon: '☕' },
    { label: 'Health, wellness & retirement', icon: '🌈' },
    { label: 'Cultural tourism', icon: '🏰' },
    { label: 'Education', icon: '📚' },
    { label: 'Leisure and entertainment', icon: '👑' },
    { label: 'Shopping', icon: '🛍️' },
];
export function FilterModal({ open, onClose }) {
    useEffect(() => {
        if (!open)
            return;
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open)
        return null;
    return (<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true" aria-labelledby="filters-title">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-neutral-200">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-neutral-100 rounded-t-3xl">
          <h2 id="filters-title" className="font-['Poppins',sans-serif] font-bold text-xl text-neutral-900">
            Filters
          </h2>
          <button type="button" onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center text-neutral-500 hover:bg-neutral-100" aria-label="Close">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-8">
          <section>
            <h3 className="font-['Poppins',sans-serif] font-semibold text-sm text-neutral-800 mb-3 uppercase tracking-wide">
              Tourism categories
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map(({ label, icon }) => (<button key={label} type="button" className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-neutral-200 hover:border-neutral-300 bg-neutral-50/50 text-center transition-colors">
                  <span className="text-2xl" aria-hidden>
                    {icon}
                  </span>
                  <span className="text-[10px] leading-tight font-semibold text-neutral-700 uppercase tracking-tight">
                    {label}
                  </span>
                </button>))}
            </div>
          </section>

          <section>
            <h3 className="font-['Poppins',sans-serif] font-semibold text-sm text-neutral-800 mb-3">
              Cities &amp; municipalities (Cavite)
            </h3>
            <div className="flex flex-wrap gap-2">
              {CAVITE_AREA_LABELS.map((c) => (<button key={c} type="button" className="px-4 py-2 rounded-full text-sm border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700">
                  {c}
                </button>))}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 px-6 py-4 border-t border-neutral-100 bg-white rounded-b-3xl flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-50">
            Clear
          </button>
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-white font-semibold" style={{ backgroundColor: olive, border: `1px solid ${olive}` }}>
            Apply
          </button>
        </div>
      </div>
    </div>);
}
