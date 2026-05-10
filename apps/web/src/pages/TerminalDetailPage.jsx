import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { pitxGallery } from '../data/terminalPitx';
import { supabase } from '../lib/supabase';
import { fetchRouteRowsForTerminal, fetchTerminalsFromSupabase } from '../lib/terminalsFromSupabase';
import { getPreviewReviewEntries } from '../lib/ntdpDisplayLabels';

const teal = '#1f4f59';

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRadians = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

/** Optional same fallbacks as TerminalsPage when Supabase fails. */
const FALLBACK_BY_ID = {
  pitx: {
    id: 'pitx',
    name: 'PITX',
    subtitle: 'Parañaque Integrated Terminal Exchange',
    image: pitxGallery.hero,
    blurb: "The country's first landport — safe, convenient intercity connections.",
    city: 'Parañaque',
    lat: 14.5102,
    lng: 120.9927,
    status: 'Active',
  },
};

function extractOne(v) {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export function TerminalDetailPage() {
  const { id } = useParams();
  const [terminal, setTerminal] = useState(null);
  const [routeRows, setRouteRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCoords, setUserCoords] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setTerminal(null);
      setRouteRows([]);
      try {
        const list = await fetchTerminalsFromSupabase(supabase);
        if (cancelled) return;
        const found = list.find((t) => String(t.id) === String(id));
        if (found) {
          setTerminal(found);
          const rows = await fetchRouteRowsForTerminal(supabase, id);
          if (!cancelled) setRouteRows(rows);
        } else {
          const fb = FALLBACK_BY_ID[id];
          if (fb) setTerminal(fb);
        }
      } catch {
        if (!cancelled) {
          const fb = FALLBACK_BY_ID[id];
          if (fb) setTerminal(fb);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.navigator?.geolocation) return;
    let cancelled = false;
    window.navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const previewReviews = useMemo(() => {
    if (!terminal?.name) return [];
    return getPreviewReviewEntries(terminal.name, null);
  }, [terminal?.name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white font-['Inter',sans-serif]">
        <AppHeader />
        <p className="px-6 py-20 text-center text-neutral-500">Loading terminal…</p>
      </div>
    );
  }

  if (!terminal) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader />
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <p className="mb-4 text-neutral-600">Terminal not found.</p>
          <Link to="/terminals" className="font-semibold" style={{ color: teal }}>
            ← All terminals
          </Link>
        </div>
      </div>
    );
  }

  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${terminal.lng - 0.06}%2C${terminal.lat - 0.05}%2C${terminal.lng + 0.06}%2C${terminal.lat + 0.05}&layer=mapnik&marker=${terminal.lat}%2C${terminal.lng}`;
  const distanceToTerminalKm =
    userCoords ? haversineDistanceKm(userCoords.lat, userCoords.lng, terminal.lat, terminal.lng) : null;

  return (
    <div className="min-h-screen bg-white font-['Inter',sans-serif]">
      <AppHeader />

      <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between text-neutral-700">
          <Link to="/terminals" className="inline-flex items-center gap-1.5 text-xl font-bold hover:underline">
            <span aria-hidden className="text-2xl leading-none">
              ‹
            </span>
            {terminal.name}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-3xl border border-neutral-200 bg-[#f7f7f7] p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
              <div className="overflow-hidden rounded-2xl">
                <img src={terminal.image} alt={terminal.name} className="h-[240px] w-full object-cover sm:h-[320px]" />
              </div>
              <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <iframe title="Map" src={mapSrc} className="h-[200px] w-full border-0 sm:h-full sm:min-h-[240px]" />
              </div>
            </div>

            <p className="mt-3 text-sm text-neutral-600">{terminal.blurb ?? terminal.subtitle}</p>
            {distanceToTerminalKm != null ? (
              <div className="mt-3 rounded-xl border border-[rgba(31,79,89,0.15)] bg-[#f5faf8] p-3">
                <p className="text-xs font-semibold text-[#1f4f59]">From your current location</p>
                <p className="mt-1 text-xs text-neutral-700">
                  You are approximately {distanceToTerminalKm.toFixed(1)} km away from {terminal.name}.
                </p>
              </div>
            ) : null}

            <div className="mt-4">
              <h2 className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">Routes touching this terminal</h2>
              {routeRows.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-500">No route rows in Supabase for this stop, or using demo terminal data.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {routeRows.map((row) => {
                    const r = extractOne(row.cavitour_routes);
                    const tt = extractOne(row.cavitour_transport_types);
                    const label = r?.route_name ?? `Route ${row.route_id}`;
                    const ends = r ? `${r.origin} → ${r.destination}` : '';
                    return (
                      <li key={`${row.route_id}-${label}`} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">
                        <span className="font-semibold text-neutral-900">{label}</span>
                        {ends ? <span className="ml-2 text-xs text-neutral-500">{ends}</span> : null}
                        {tt?.transport_name ? (
                          <span className="mt-1 block text-xs text-neutral-600">{tt.transport_name}</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
              <h2 className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">Reviews</h2>
              <p className="mt-1 text-xs text-neutral-500">Preview only — guest reviews are not live yet (same as the mobile app).</p>
              <div className="mt-3 space-y-3">
                {previewReviews.map((rev, idx) => (
                  <article
                    key={`${rev.name}-${idx}`}
                    className="rounded-xl border border-neutral-200 bg-[#fafafa] p-3"
                  >
                    <div className="flex items-start gap-3">
                      <img src={rev.image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-neutral-900">{rev.name}</p>
                        <p className="mt-1 text-xs leading-relaxed text-neutral-600">{rev.text}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-neutral-200 bg-[#f7f7f7] p-4 lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-lg font-semibold text-neutral-800">Details</h2>
            <dl className="mt-3 space-y-2 text-sm text-neutral-700">
              <div>
                <dt className="text-xs text-neutral-500">Area</dt>
                <dd>{terminal.city}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Status</dt>
                <dd>{terminal.status}</dd>
              </div>
            </dl>
            <Link
              to="/terminals"
              className="mt-4 inline-block text-sm font-semibold hover:underline"
              style={{ color: teal }}
            >
              ← All terminals
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}
