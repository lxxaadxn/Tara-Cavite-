import { useEffect, useMemo, useState } from 'react';

const olive = '#7ea00e';

function prettySlug(slug) {
  return String(slug ?? '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function Section({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-3">
        <h3 className="font-['Poppins',sans-serif] text-sm font-semibold text-neutral-900">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function FilterModal({ open, onClose, places = [] }) {
  const [query, setQuery] = useState('');
  const [selectedNtdpCategories, setSelectedNtdpCategories] = useState(() => new Set());
  const [selectedTypeCodes, setSelectedTypeCodes] = useState(() => new Set());
  const [selectedCities, setSelectedCities] = useState(() => new Set());
  const [selectedLgus, setSelectedLgus] = useState(() => new Set());

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const optionSets = useMemo(() => {
    const taCategories = new Set();
    const ntdpCategories = new Set();
    const typeCodes = new Set();
    const cities = new Set();
    const lgus = new Set();
    const years = new Set();

    for (const place of places) {
      if (place.ta_category) taCategories.add(place.ta_category);
      else if (place.type) taCategories.add(place.type);
      if (place.ntdp_category) ntdpCategories.add(place.ntdp_category);
      if (place.type_code) typeCodes.add(place.type_code);
      else if (place.type) typeCodes.add(place.type);
      if (place.city_mun) cities.add(place.city_mun);
      if (place.lgu_slug) lgus.add(place.lgu_slug);
      if (place.created_at) {
        const year = new Date(place.created_at).getFullYear();
        if (Number.isFinite(year)) years.add(String(year));
      }
    }

    const sortAlpha = (a, b) => String(a).localeCompare(String(b));
    const sortYearDesc = (a, b) => Number(b) - Number(a);

    return {
      taCategories: Array.from(taCategories).sort(sortAlpha),
      ntdpCategories: Array.from(ntdpCategories).sort(sortAlpha),
      typeCodes: Array.from(typeCodes).sort(sortAlpha),
      cities: Array.from(cities).sort(sortAlpha),
      lgus: Array.from(lgus).sort(sortAlpha),
      years: Array.from(years).sort(sortYearDesc),
    };
  }, [places]);

  const toggleSet = (setter, value) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const clearAll = () => {
    setQuery('');
    setSelectedNtdpCategories(new Set());
    setSelectedTypeCodes(new Set());
    setSelectedCities(new Set());
    setSelectedLgus(new Set());
  };

  if (!open) return null;

  const queryLower = query.trim().toLowerCase();
  const visibleCount = queryLower
    ? places.filter((p) => `${p.name} ${p.address} ${p.city_mun} ${p.ta_category} ${p.ntdp_category}`.toLowerCase().includes(queryLower)).length
    : places.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="filters-title">
      <div className="max-h-[92vh] w-full max-w-[860px] overflow-y-auto rounded-3xl border border-neutral-200 bg-[#f8f9f8] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white/95 px-6 py-4 backdrop-blur">
          <div>
            <h2 id="filters-title" className="font-['Poppins',sans-serif] text-xl font-bold text-neutral-900">
              Filters
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">{visibleCount} Supabase places available</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <Section title="Searchable Text" subtitle="`name`, `address`, `city_mun`, `ta_category`, `ntdp_category`">
            <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter options by keyword"
                  className="w-full bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400"
                />
              </div>
            </div>
          </Section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section title="NTDP Category" subtitle="Supabase column: `ntdp_category`">
              {optionSets.ntdpCategories.length > 0 ? (
                <div className="space-y-1.5">
                  {optionSets.ntdpCategories.map((value) => (
                    <label key={value} className="flex items-center gap-2 text-xs text-neutral-700">
                      <input
                        type="checkbox"
                        checked={selectedNtdpCategories.has(value)}
                        onChange={() => toggleSet(setSelectedNtdpCategories, value)}
                        className="h-3.5 w-3.5 rounded border-neutral-300 text-[--ct-olive] focus:ring-[--ct-olive]"
                        style={{ accentColor: olive }}
                      />
                      {value}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400">No NTDP categories found.</p>
              )}
            </Section>

            <Section title="Type Code" subtitle="Supabase column: `type_code`">
              {optionSets.typeCodes.length > 0 ? (
                <div className="space-y-1.5">
                  {optionSets.typeCodes.map((value) => (
                    <label key={value} className="flex items-center gap-2 text-xs text-neutral-700">
                      <input
                        type="checkbox"
                        checked={selectedTypeCodes.has(value)}
                        onChange={() => toggleSet(setSelectedTypeCodes, value)}
                        className="h-3.5 w-3.5 rounded border-neutral-300 text-[--ct-olive] focus:ring-[--ct-olive]"
                        style={{ accentColor: olive }}
                      />
                      {value}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400">No type codes found.</p>
              )}
            </Section>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section title="City / Municipality" subtitle="Supabase column: `city_mun`">
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {optionSets.cities.map((value) => (
                  <label key={value} className="flex items-center gap-2 text-xs text-neutral-700">
                    <input
                      type="checkbox"
                      checked={selectedCities.has(value)}
                      onChange={() => toggleSet(setSelectedCities, value)}
                      className="h-3.5 w-3.5 rounded border-neutral-300 text-[--ct-olive] focus:ring-[--ct-olive]"
                      style={{ accentColor: olive }}
                    />
                    {value}
                  </label>
                ))}
              </div>
            </Section>

            <Section title="LGU" subtitle="Supabase column: `lgu_slug`">
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {optionSets.lgus.map((value) => (
                  <label key={value} className="flex items-center gap-2 text-xs text-neutral-700">
                    <input
                      type="checkbox"
                      checked={selectedLgus.has(value)}
                      onChange={() => toggleSet(setSelectedLgus, value)}
                      className="h-3.5 w-3.5 rounded border-neutral-300 text-[--ct-olive] focus:ring-[--ct-olive]"
                      style={{ accentColor: olive }}
                    />
                    {prettySlug(value)}
                  </label>
                ))}
              </div>
            </Section>
          </div>

        </div>

        <div className="sticky bottom-0 flex items-center justify-between border-t border-neutral-200 bg-white px-6 py-4">
          <p className="text-xs text-neutral-500">Supabase schema-aware filter layout</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearAll}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3.5 py-2 text-xs font-semibold text-white"
              style={{ backgroundColor: olive }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
