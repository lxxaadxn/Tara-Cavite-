import { useEffect, useMemo, useState } from 'react';
import {
  fetchAppFilterCategoryOptions,
  keywordMapFromOptions,
  labelMapFromOptions,
  staticCategoryOptions,
} from '../lib/appFilterCategories';
import { fetchLguFilterOptions, locationLabelMapFromOptions } from '../lib/lguFilterOptions';
import { WEB_CITY_OPTIONS, WEB_MUNICIPALITY_OPTIONS } from '../lib/dashboardFilterOptions';
import {
  getDefaultCategoryKeywords,
  placePassesAppliedFilters,
  setRuntimeCategoryKeywords,
  setRuntimeCategoryLabels,
  setRuntimeLocationLabels,
} from '../lib/placeFilterHelpers';
import { paletteForFilterCategory, paletteForLguKind } from 'cavitour-shared/ntdpFilterMeta';
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

function SectionLabel({ children, color }) {
  return (
    <p className="mb-2.5 flex items-center gap-2 text-[13px] font-medium" style={{ color: color || '#9CA3AF' }}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color || '#9CA3AF' }} aria-hidden />
      {children}
    </p>
  );
}

function CheckMark({ color }) {
  return (
    <svg className="h-4 w-4 shrink-0" style={{ color: color || '#10A37F' }} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12.5l5 5L20 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FilterPill({ label, selected, onClick, icon, title, palette }) {
  const color = palette?.color || '#10A37F';
  const tint = palette?.tint || '#E4F3EE';
  const selectedText = palette?.selectedText || '#16352E';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={title || label}
      className="flex min-h-[46px] w-full items-center gap-2 rounded-full border px-2.5 py-1.5 text-left transition-all duration-150"
      style={
        selected
          ? { borderColor: color, backgroundColor: tint, color: selectedText }
          : {
              borderColor: palette ? `${color}40` : '#E5E7EB',
              backgroundColor: '#fff',
              color: '#4B5563',
            }
      }
      onMouseEnter={(e) => {
        if (selected) return;
        e.currentTarget.style.backgroundColor = tint;
        e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        if (selected) return;
        e.currentTarget.style.backgroundColor = '#fff';
        e.currentTarget.style.borderColor = palette ? `${color}40` : '#E5E7EB';
      }}
    >
      {icon ? (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: selected ? 'rgba(255,255,255,0.85)' : `${color}18` }}
        >
          {icon}
        </span>
      ) : (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      )}
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-tight">{label}</span>
      {selected ? <CheckMark color={color} /> : <span className="h-4 w-4 shrink-0" aria-hidden />}
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
 * @param {boolean} [props.hideCategories] — hide category grid when not needed
 * @param {string} [props.resultNoun] — unused; apply copy is "Find N results"
 */
export function FilterModal({
  open,
  onClose,
  appliedFilters = null,
  onApply,
  places = [],
  hideCategories = false,
  resultNoun = 'place',
}) {
  const [categories, setCategories] = useState(() => new Set());
  const [cities, setCities] = useState(() => new Set());
  const [municipalities, setMunicipalities] = useState(() => new Set());
  const [categoryOptions, setCategoryOptions] = useState(() => staticCategoryOptions());
  const [cityOptions, setCityOptions] = useState(() =>
    WEB_CITY_OPTIONS.map((o) => ({ key: o.label, label: o.label }))
  );
  const [municipalityOptions, setMunicipalityOptions] = useState(() =>
    WEB_MUNICIPALITY_OPTIONS.map((o) => ({ key: o.label, label: o.label }))
  );

  useEffect(() => {
    let cancelled = false;
    void fetchAppFilterCategoryOptions().then((opts) => {
      if (cancelled) return;
      setCategoryOptions(opts);
      setRuntimeCategoryKeywords(keywordMapFromOptions(opts, getDefaultCategoryKeywords()));
      setRuntimeCategoryLabels(labelMapFromOptions(opts));
    });
    void fetchLguFilterOptions().then(({ cities: cityOpts, municipalities: munOpts }) => {
      if (cancelled) return;
      setCityOptions(cityOpts);
      setMunicipalityOptions(munOpts);
      setRuntimeLocationLabels(locationLabelMapFromOptions(cityOpts, munOpts));
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const activeSelectionCount = hideCategories
    ? cities.size + municipalities.size
    : selectionCount(categories, cities, municipalities);

  const handleApply = () => {
    onApply?.(pending);
    onClose();
  };

  if (!open) return null;

  const noun = resultNoun;
  const nounPlural = `${noun}${noun.endsWith('s') ? '' : 's'}`;
  const applyLabel =
    previewCount != null
      ? `Find ${previewCount} results`
      : activeSelectionCount > 0
        ? 'Find results'
        : `Find all ${nounPlural}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-neutral-900/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="filters-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-[#E5E7EB] bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:max-h-[88vh] sm:rounded-[24px] sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-neutral-200 sm:hidden" aria-hidden />

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E5E7EB] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <svg
              className="h-[18px] w-[18px] shrink-0 text-[#10A37F]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M4 7h16M7 12h10M10 17h4" />
            </svg>
            <h2 id="filters-title" className="font-['Poppins',sans-serif] text-[17px] font-semibold text-[#16352E]">
              Filter
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#6B7280] transition hover:bg-neutral-100"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {hideCategories ? null : (
            <section>
              <SectionLabel color="#10A37F">Category</SectionLabel>
              <div className="grid grid-cols-2 gap-2.5">
                {categoryOptions.map((opt) => {
                  const selected = categories.has(opt.key);
                  const palette = paletteForFilterCategory(opt);
                  return (
                    <FilterPill
                      key={opt.key}
                      label={opt.shortLabel || opt.label}
                      title={opt.label}
                      selected={selected}
                      palette={palette}
                      onClick={() => toggleSet(setCategories, opt.key)}
                      icon={
                        <FilterCategoryIcon name={opt.icon} selected={selected} size={20} color={palette.color} />
                      }
                    />
                  );
                })}
              </div>
            </section>
          )}

          <section className={hideCategories ? '' : 'mt-5'}>
            <div className="mb-5">
              <SectionLabel color={paletteForLguKind('city').color}>Cities</SectionLabel>
              <div className="grid grid-cols-2 gap-2.5">
                {cityOptions.map((opt) => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    selected={cities.has(opt.key)}
                    palette={paletteForLguKind('city')}
                    onClick={() => toggleSet(setCities, opt.key)}
                  />
                ))}
              </div>
            </div>

            <div>
              <SectionLabel color={paletteForLguKind('municipality').color}>Municipalities</SectionLabel>
              <div className="grid grid-cols-2 gap-2.5">
                {municipalityOptions.map((opt) => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    selected={municipalities.has(opt.key)}
                    palette={paletteForLguKind('municipality')}
                    onClick={() => toggleSet(setMunicipalities, opt.key)}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-[#E5E7EB] bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={clearAll}
            className="rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-[13px] font-medium text-[#6B7280] transition hover:bg-neutral-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#10A37F] py-3 text-sm font-semibold text-white shadow-md shadow-[#10A37F]/20 transition hover:bg-[#168F7A] active:scale-[0.99]"
          >
            <svg
              className="h-4 w-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-4-4" />
            </svg>
            {applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
