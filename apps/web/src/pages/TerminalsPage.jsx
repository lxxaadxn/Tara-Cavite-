import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { pitxGallery } from '../data/terminalPitx';
import { supabase } from '../lib/supabase';
import { fetchTerminalsFromSupabase } from '../lib/terminalsFromSupabase';
import { planTerminalTransitBetween } from '../lib/terminalTransitPlanner';

const FALLBACK_TERMINALS = [
  {
    id: 'pitx',
    name: 'PITX',
    subtitle: 'Parañaque Integrated Terminal Exchange',
    image: pitxGallery.facade,
    blurb: "The country's first landport — safe, convenient intercity connections.",
    city: 'Parañaque',
    routes: 156,
    lat: 14.5102,
    lng: 120.9927,
    status: 'Active',
  },
  {
    id: 'bicutan',
    name: 'Bicutan Interchange',
    subtitle: 'Taguig',
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=900&q=80',
    blurb: 'Key staging area for buses and UV express routes toward Cavite.',
    city: 'Taguig',
    routes: 54,
    lat: 14.4867,
    lng: 121.0453,
    status: 'Active',
  },
  {
    id: 'dasma-terminal',
    name: 'Dasmariñas Terminal',
    subtitle: 'Dasmariñas, Cavite',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=900&q=80',
    blurb: 'Primary transfer point for commuters heading to Imus and Bacoor.',
    city: 'Dasmariñas',
    routes: 73,
    lat: 14.3294,
    lng: 120.9367,
    status: 'Busy',
  },
  {
    id: 'imus-terminal',
    name: 'Imus Transport Hub',
    subtitle: 'Imus, Cavite',
    image: 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=900&q=80',
    blurb: 'Large-capacity transport hub connecting southbound routes.',
    city: 'Imus',
    routes: 81,
    lat: 14.4297,
    lng: 120.9362,
    status: 'Active',
  },
];

const olive = '#7ea00e';

export function TerminalsPage() {
  const [terminals, setTerminals] = useState(FALLBACK_TERMINALS);
  const [selectedTerminalId, setSelectedTerminalId] = useState(FALLBACK_TERMINALS[0].id);
  const [search, setSearch] = useState('');
  const [fromTerminalId, setFromTerminalId] = useState(FALLBACK_TERMINALS[0].id);
  const [toTerminalId, setToTerminalId] = useState(
    FALLBACK_TERMINALS[1]?.id ?? FALLBACK_TERMINALS[0].id
  );
  const [transitPlan, setTransitPlan] = useState(null);
  const [transitLoading, setTransitLoading] = useState(false);
  const [transitError, setTransitError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const live = await fetchTerminalsFromSupabase(supabase);
        if (!cancelled && live.length > 0) {
          setTerminals(live);
          setSelectedTerminalId((prev) => (live.some((terminal) => terminal.id === prev) ? prev : live[0].id));
          setFromTerminalId(live[0].id);
          setToTerminalId(live.length > 1 ? live[1].id : live[0].id);
        }
      } catch {
        if (!cancelled) setTerminals(FALLBACK_TERMINALS);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFindTransit = async () => {
    if (!fromTerminalId || !toTerminalId) return;
    if (fromTerminalId === toTerminalId) {
      setTransitError('Choose two different terminals.');
      setTransitPlan(null);
      return;
    }
    setTransitLoading(true);
    setTransitError('');
    setTransitPlan(null);
    try {
      const plan = await planTerminalTransitBetween(supabase, fromTerminalId, toTerminalId);
      if (!plan) {
        setTransitError('No route connects these terminals in the Cavite routes graph.');
        return;
      }
      setTransitPlan(plan);
    } catch (err) {
      setTransitError(err?.message ?? 'Could not load routes.');
    } finally {
      setTransitLoading(false);
    }
  };

  const terminalName = (id) => terminals.find((t) => String(t.id) === String(id))?.name ?? id;

  const filteredTerminals = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return terminals;
    return terminals.filter(
      (terminal) =>
        `${terminal.name} ${terminal.subtitle} ${terminal.city}`.toLowerCase().includes(q)
    );
  }, [search, terminals]);

  const selectedTerminal =
    filteredTerminals.find((terminal) => terminal.id === selectedTerminalId) ??
    filteredTerminals[0] ??
    terminals[0];

  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${selectedTerminal.lng - 0.08}%2C${selectedTerminal.lat - 0.06}%2C${selectedTerminal.lng + 0.08}%2C${selectedTerminal.lat + 0.06}&layer=mapnik&marker=${selectedTerminal.lat}%2C${selectedTerminal.lng}`;

  return (
    <div className="min-h-screen bg-[#eef1ec] font-['Inter',sans-serif]">
      <AppHeader />

      <div className="mx-auto w-full max-w-[1460px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_14px_34px_rgba(0,0,0,0.08)]">
          <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
            <section className="border-b border-neutral-200 bg-[#f8faf7] p-4 lg:border-b-0 lg:border-r">
              <div className="mb-3">
                <h1 className="font-['Poppins',sans-serif] text-2xl font-bold text-neutral-900">Terminals</h1>
                <p className="text-xs text-neutral-500">Track major transport hubs and nearby routes.</p>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search terminal"
                    className="w-full bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400"
                  />
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-[#cddcab] bg-[#f7faef] p-3">
                <p className="text-xs font-semibold text-neutral-800">Terminal-to-terminal route</p>
                <p className="mt-0.5 text-[11px] leading-snug text-neutral-500">
                  Same logic as the mobile app: builds a graph from{' '}
                  <code className="rounded bg-white/80 px-1 text-[10px]">cavitour_terminal_routes</code> and finds a path (BFS).
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block text-[11px] font-medium text-neutral-600">
                    From
                    <select
                      value={fromTerminalId}
                      onChange={(e) => setFromTerminalId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm text-neutral-900"
                    >
                      {terminals.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-[11px] font-medium text-neutral-600">
                    To
                    <select
                      value={toTerminalId}
                      onChange={(e) => setToTerminalId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm text-neutral-900"
                    >
                      {terminals.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleFindTransit}
                  disabled={transitLoading || !fromTerminalId || !toTerminalId || fromTerminalId === toTerminalId}
                  className="mt-2 w-full rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: olive }}
                >
                  {transitLoading ? 'Planning…' : 'Find route'}
                </button>
                {transitError ? <p className="mt-2 text-xs text-red-600">{transitError}</p> : null}
                {transitPlan ? (
                  <div className="mt-3 space-y-2 border-t border-[#dfe8d3] pt-3">
                    <p className="text-[11px] text-neutral-600">
                      <span className="font-semibold text-neutral-800">{transitPlan.originTerminal.name}</span>
                      <span className="mx-1 text-neutral-400">→</span>
                      <span className="font-semibold text-neutral-800">{transitPlan.destinationTerminal.name}</span>
                    </p>
                    {transitPlan.legs.length === 0 ? (
                      <p className="text-xs text-neutral-500">Same terminal — no transfers needed.</p>
                    ) : (
                      <ol className="list-decimal space-y-2 pl-4 text-xs text-neutral-800">
                        {transitPlan.legs.map((leg, index) => (
                          <li key={`${leg.fromTerminalId}-${leg.toTerminalId}-${index}`}>
                            <span className="font-semibold">{terminalName(leg.fromTerminalId)}</span>
                            {' → '}
                            <span className="font-semibold">{terminalName(leg.toTerminalId)}</span>
                            <span className="mt-0.5 block text-[11px] font-normal text-neutral-500">
                              {leg.routeName} · {leg.transportName}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ) : null}
              </div>

              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Terminal stops <span className="ml-1 rounded-full bg-[#e6efcf] px-2 py-0.5 text-[#6f8718]">{filteredTerminals.length}</span>
              </p>

              <div className="mt-2.5 space-y-2 overflow-y-auto pr-1 lg:max-h-[63vh]">
                {filteredTerminals.map((terminal) => (
                  <button
                    key={terminal.id}
                    type="button"
                    onClick={() => setSelectedTerminalId(terminal.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedTerminal.id === terminal.id
                        ? 'border-[#95bb23] bg-white shadow-[0_8px_20px_rgba(126,160,14,0.18)]'
                        : 'border-neutral-200 bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-neutral-900">{terminal.name}</p>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                        {terminal.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">{terminal.subtitle}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-lg bg-neutral-50 px-2 py-1.5">
                        <p className="text-neutral-400">City</p>
                        <p className="font-semibold text-neutral-700">{terminal.city}</p>
                      </div>
                      <div className="rounded-lg bg-neutral-50 px-2 py-1.5">
                        <p className="text-neutral-400">Routes</p>
                        <p className="font-semibold text-neutral-700">{terminal.routes}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="relative p-3">
              <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
                <iframe
                  title={`${selectedTerminal.name} map`}
                  src={mapSrc}
                  className="h-[82vh] min-h-[560px] w-full border-0"
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/80 to-transparent" />
              </div>

              <article className="absolute left-7 top-7 max-w-[340px] rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-[0_12px_30px_rgba(0,0,0,0.15)] backdrop-blur-sm">
                <div className="overflow-hidden rounded-xl bg-neutral-100">
                  <img src={selectedTerminal.image} alt={selectedTerminal.name} className="h-28 w-full object-cover" />
                </div>
                <div className="mt-2.5">
                  <p className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">{selectedTerminal.name}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{selectedTerminal.subtitle}</p>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-600">{selectedTerminal.blurb}</p>
                  <Link
                    to={`/terminals/${selectedTerminal.id}`}
                    className="mt-3 inline-flex rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                  >
                    Open terminal
                  </Link>
                </div>
              </article>
            </section>
          </div>
        </div>
      </div>

    </div>
  );
}
