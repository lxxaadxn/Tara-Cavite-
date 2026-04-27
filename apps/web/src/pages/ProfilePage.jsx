import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { supabase } from '../lib/supabase';
import { fetchAllPlacesFromSupabase } from '../lib/placesFromSupabase';
import { readSavedLists, SAVED_LISTS_UPDATED_EVENT } from '../lib/savedPlaces';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80';

function deriveProfile(user) {
    const meta = user?.user_metadata ?? {};
    const fullName = meta.full_name ||
        meta.name ||
        [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
        (user?.email ? user.email.split('@')[0] : 'CaviTour User');
    const created = user?.created_at ? new Date(user.created_at) : null;
    const daysOnPlatform = created ? Math.max(1, Math.floor((Date.now() - created.getTime()) / 86400000)) : 0;
    return {
        name: fullName,
        roleLabel: daysOnPlatform ? `Traveler • ${daysOnPlatform} days on the platform` : 'Traveler',
        phone: user?.phone || meta.phone || 'No phone on account',
        email: user?.email || 'No email on account',
        location: meta.location || meta.city || 'Cavite, Philippines',
        organization: meta.organization || meta.company || 'CaviTour Member',
        avatarUrl: meta.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&q=80',
    };
}

export function ProfilePage() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(() => deriveProfile(null));
    const [systemStats, setSystemStats] = useState({
        placesInSystem: 0,
        terminalsInSystem: 0,
        placesSaved: 0,
        listsCreated: 0,
    });
    const [savedLists, setSavedLists] = useState([]);

    useEffect(() => {
        let cancelled = false;
        const loadProfile = async () => {
            const { data } = await supabase.auth.getUser();
            if (cancelled) return;
            setProfile(deriveProfile(data?.user ?? null));
        };
        const loadSystemData = async () => {
            const lists = readSavedLists();
            const placesSaved = lists.reduce((sum, list) => sum + (Array.isArray(list.items) ? list.items.length : 0), 0);
            let placesInSystem = 0;
            let terminalsInSystem = 0;
            try {
                const places = await fetchAllPlacesFromSupabase(supabase, 1000);
                placesInSystem = places.length;
            } catch {
                placesInSystem = 0;
            }
            try {
                const { count } = await supabase
                    .from('cavitour_terminals')
                    .select('terminal_id', { count: 'exact', head: true });
                terminalsInSystem = count ?? 0;
            } catch {
                terminalsInSystem = 0;
            }
            if (cancelled) return;
            setSavedLists(lists);
            setSystemStats({
                placesInSystem,
                terminalsInSystem,
                placesSaved,
                listsCreated: lists.length,
            });
        };

        loadProfile();
        loadSystemData();
        window.addEventListener(SAVED_LISTS_UPDATED_EVENT, loadSystemData);
        window.addEventListener('focus', loadSystemData);
        const { data: { subscription }, } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!cancelled) setProfile(deriveProfile(session?.user ?? null));
        });

        return () => {
            cancelled = true;
            window.removeEventListener(SAVED_LISTS_UPDATED_EVENT, loadSystemData);
            window.removeEventListener('focus', loadSystemData);
            subscription.unsubscribe();
        };
    }, []);

    const stats = [
        { label: 'Destinations in system', value: systemStats.placesInSystem, accent: '#ffb7c3' },
        { label: 'Terminals in system', value: systemStats.terminalsInSystem, accent: '#b7d4ff' },
        { label: 'Places saved', value: systemStats.placesSaved, accent: '#8be4dc' },
        { label: 'Lists created', value: systemStats.listsCreated, accent: '#ffe08a' },
    ];
    const summaryCards = useMemo(() => {
        const nowLabel = new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
        return [
            { title: 'Saved Lists', update: nowLabel, value: systemStats.listsCreated, tone: 'bg-[#eaf6c7]' },
            { title: 'Saved Places', update: nowLabel, value: systemStats.placesSaved, tone: 'bg-[#c8f0f1]' },
            { title: 'Cavite Terminals', update: nowLabel, value: systemStats.terminalsInSystem, tone: 'bg-[#dce7ff]' },
        ];
    }, [systemStats]);
    const recentObjects = useMemo(() => {
        const rows = [];
        for (const list of savedLists) {
            for (const item of list.items ?? []) {
                rows.push({
                    id: item.id,
                    label: list.name || 'Saved',
                    image: item.image || PLACEHOLDER_IMG,
                    name: item.name || 'Saved place',
                    subtitle: item.subtitle || 'Cavite, Philippines',
                });
            }
        }
        return rows.slice(0, 3);
    }, [savedLists]);
    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
        }
        finally {
            navigate('/', { replace: true });
        }
    };

    return (<div className="min-h-screen bg-[#f4f8fb] font-['Inter',sans-serif]">
      <AppHeader />

      <div className="mx-auto w-full max-w-[1150px] px-4 py-7 sm:px-6 lg:px-8">
        <h1 className="font-['Poppins',sans-serif] text-4xl font-bold text-neutral-900">My Activity</h1>

        <section className="mt-4 rounded-2xl border border-[#e4edf4] bg-white p-4 shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <img
              src={profile.avatarUrl}
              alt="Profile"
              className="h-24 w-24 rounded-xl object-cover"
            />

            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold text-neutral-900">{profile.name}</p>
                  <p className="text-xs text-neutral-500">{profile.roleLabel}</p>
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                >
                  Edit profile
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-1.5 text-sm text-neutral-600 sm:grid-cols-2">
                <p className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92V19a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3 4.18 2 2 0 0 1 5 2h2.09a2 2 0 0 1 2 1.72c.12.89.32 1.76.61 2.6a2 2 0 0 1-.45 2.11L8.15 9.85a16 16 0 0 0 6 6l1.42-1.11a2 2 0 0 1 2.11-.45c.84.29 1.71.49 2.6.61A2 2 0 0 1 22 16.92z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {profile.phone}
                </p>
                <p className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16v16H4z" strokeLinejoin="round" />
                    <path d="m22 6-10 7L2 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {profile.email}
                </p>
                <p className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M12 2.25a7.5 7.5 0 00-7.5 7.5c0 5.25 7.5 12 7.5 12s7.5-6.75 7.5-12a7.5 7.5 0 00-7.5-7.5zm0 10.5a3 3 0 100-6 3 3 0 000 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {profile.location}
                </p>
                <p className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3v18M3 12h18" strokeLinecap="round" />
                  </svg>
                  {profile.organization}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 divide-y divide-neutral-100 border-t border-neutral-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {stats.map((stat) => (
              <div key={stat.label} className="p-3.5">
                <p className="text-xs font-medium text-neutral-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-neutral-900">{Number(stat.value).toLocaleString()}</p>
                <div className="mt-2 h-1.5 rounded-full bg-neutral-100">
                  <div className="h-full rounded-full" style={{ width: '65%', backgroundColor: stat.accent }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#e4edf4] bg-white p-4 shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-['Poppins',sans-serif] text-2xl font-bold text-neutral-900">My Summary</h2>
            <button
              type="button"
              className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50"
            >
              This Month
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {summaryCards.map((card) => (
              <article key={card.title} className={`rounded-2xl p-3 ${card.tone}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-neutral-800">{card.title}</p>
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 bg-white/70 text-neutral-600"
                    aria-label={`Open ${card.title}`}
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M7 17 17 7M8 7h9v9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <p className="mt-4 text-[11px] text-neutral-500">Update: {card.update}</p>
                <p className="mt-1 text-right text-2xl font-bold text-neutral-900">{Number(card.value).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#e4edf4] bg-white p-4 shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-['Poppins',sans-serif] text-2xl font-bold text-neutral-900">New Objects</h2>
            <button
              type="button"
              className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50"
            >
              This Month
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(recentObjects.length ? recentObjects : [
                pitCard('featured-1', 'Featured', PLACEHOLDER_IMG, 'No saved places yet', 'Start saving places'),
            ]).map((card) => (
              <article key={card.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <div className="relative h-40 bg-neutral-100">
                  <img src={card.image} alt="" className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-neutral-700">
                    {card.label}
                  </span>
                </div>
                <div className="p-3">
                  <p className="line-clamp-1 text-sm font-semibold text-neutral-900">{card.name}</p>
                  <p className="line-clamp-1 text-xs text-neutral-500">{card.subtitle}</p>
                  <button type="button" className="text-sm font-semibold text-neutral-700 hover:underline">
                    View details
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>);
}

function pitCard(id, label, image, name, subtitle) {
    return { id, label, image, name, subtitle };
}
