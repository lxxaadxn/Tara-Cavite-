import { useEffect, useMemo, useState } from 'react';
import {
  WEB_CATEGORY_OPTIONS,
  WEB_CITY_OPTIONS,
  WEB_MUNICIPALITY_OPTIONS,
} from '../lib/dashboardFilterOptions';
import { placePassesAppliedFilters } from '../lib/placeFilterHelpers';
import { FilterCategoryIcon } from './FilterCategoryIcon';

/**
 * @typedef {import('../lib/placeFilterHelpers').AppliedPlaceFilters} AppliedPlaceFilters
 */

function setsFromFilters(f) {
  return {
    categories: new Set(f?.selectedCategoryKeys ?? []),
    cities: new Set(f?.selectedCityKeys ?? []),
    municipalities: new Set(f?.selectedMunicipalityKeys ?? []),
  };
}

function emptySets() {
  return { categories: new Set(), cities: new Set(), municipalities: new Set() };
}

function pendingFilters(categories, cities, municipalities) {
  return {
    selectedCategoryKeys: Array.from(categories),
    selectedCityKeys: Array.from(cities),
    selectedMunicipalityKeys: Array.from(municipalities),
  };
}

function selectionCount(categories, cities, municipalities) {
  return categories.size + cities.size + municipalities.size;
}

function SectionLabel({ children }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{children}</p>
  );
}

function LocationPill({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full px-3.5 py-2 text-[13px] font-medium transition-all duration-150 ${
        selected
          ? 'bg-[#7EA00E] text-white shadow-sm shadow-[#7EA00E]/25'
          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80'
      }`}
    >
      {label}
    </button>
  );
}

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {AppliedPlaceFilters | null} [props.appliedFilters]
 * @param {(filters: AppliedPlaceFilters) => void} [props.onApply]
 * @param {any[]} [props.places] — current search list for live result count
 */
export function FilterModal({ open, onClose, appliedFilters = null, onApply, places = [] }) {
  const [categories, setCategories] = useState(() => new Set());
  const [cities, setCities] = useState(() => new Set());
  const [municipalities, setMunicipalities] = useState(() => new Set());

  useEffect(() => {
    if (!open) return;
    const s = setsFromFilters(appliedFilters);
    setCategories(s.categories);
    setCities(s.cities);
    setMunicipalities(s.municipalities);
  }, [open, appliedFilters]);

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

  const toggleSet = (setter, value) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const clearAll = () => {
    const s = emptySets();
    setCategories(s.categories);
    setCities(s.cities);
    setMunicipalities(s.municipalities);
  };

  const pending = useMemo(
    () => pendingFilters(categories, cities, municipalities),
    [categories, cities, municipalities]
  );

  const previewCount = useMemo(() => {
    if (!places.length) return null;
    return places.filter((p) => placePassesAppliedFilters(p, pending)).length;
  }, [places, pending]);

  const activeSelectionCount = selectionCount(categories, cities, municipalities);

  const handleApply = () => {
    onApply?.(pending);
    onClose();
  };

  if (!open) return null;

  const applyLabel =
    previewCount != null
      ? `Show ${previewCount} place${previewCount === 1 ? '' : 's'}`
      : activeSelectionCount > 0
        ? 'Apply filters'
        : 'Show all places';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-neutral-900/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="filters-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex max-h-[min(92vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:max-h-[88vh] sm:rounded-3xl sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-neutral-200 sm:hidden" aria-hidden />

        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-1 pt-4 sm:pt-5">
          <div>
            <h2 id="filters-title" className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">
              Filters
            </h2>
            {activeSelectionCount > 0 ? (
              <p className="mt-0.5 text-xs text-neutral-500">{activeSelectionCount} selected</p>
            ) : (
              <p className="mt-0.5 text-xs text-neutral-500">Refine your search</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {activeSelectionCount > 0 ? (
              <button
                type="button"
                onClick={clearAll}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#7EA00E] transition hover:bg-[#7EA00E]/10"
              >
                Reset
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3">
          <section>
            <SectionLabel>Category</SectionLabel>
            <div className="grid grid-cols-4 gap-2.5">
              {WEB_CATEGORY_OPTIONS.map((opt) => {
                const selected = categories.has(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    title={opt.label}
                    onClick={() => toggleSet(setCategories, opt.key)}
                    aria-pressed={selected}
                    className={`group flex min-h-[92px] flex-col items-center justify-center gap-2.5 rounded-2xl px-1.5 py-3.5 transition-all duration-200 ${
                      selected
                        ? 'bg-[#eef4df] ring-2 ring-[#7EA00E]/50'
                        : 'bg-[#f0f0ee] hover:bg-[#e8e8e6] active:scale-[0.98]'
                    }`}
                  >
                    <FilterCategoryIcon name={opt.icon} selected={selected} />
                    <span
                      className={`text-center text-[12px] font-semibold leading-tight tracking-tight ${
                        selected ? 'text-[#5a7a0a]' : 'text-neutral-700'
                      }`}
                    >
                      {opt.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-3">
              <p className="mb-2 text-xs font-medium text-neutral-500">Cities</p>
              <div className="flex flex-wrap gap-2">
                {WEB_CITY_OPTIONS.map((opt) => (
                  <LocationPill
                    key={opt.key}
                    label={opt.label}
                    selected={cities.has(opt.key)}
                    onClick={() => toggleSet(setCities, opt.key)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-neutral-500">Municipalities</p>
              <div className="flex flex-wrap gap-2">
                {WEB_MUNICIPALITY_OPTIONS.map((opt) => (
                  <LocationPill
                    key={opt.key}
                    label={opt.label}
                    selected={municipalities.has(opt.key)}
                    onClick={() => toggleSet(setMunicipalities, opt.key)}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="shrink-0 border-t border-neutral-100 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleApply}
            className="w-full rounded-2xl bg-[#7EA00E] py-3.5 text-sm font-semibold text-white shadow-md shadow-[#7EA00E]/20 transition hover:bg-[#6f9009] active:scale-[0.99]"
          >
            {applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
