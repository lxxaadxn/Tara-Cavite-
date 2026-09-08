import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { CaviteVisitMap } from '../components/CaviteVisitMap';
import { getItineraryStartsCount } from '../lib/itineraryStartsActivity';
import { fetchPublicProfileTravel } from '../lib/profileActivity';
import { fetchPublicReviewCount, fetchPublicTravelerProfile } from '../lib/publicTravelerProfile';
import { isItinerarySavedItem } from '../lib/savedPlaces';
import { fetchPublicListsForUser } from '../lib/savedPlacesSupabase';
import { countSavedPlaces } from '../lib/travelerProfile';
import { supabase } from '../lib/supabase';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80';

function StatBox({ icon, value, label }) {
  return (
    <li className="min-w-0">
      <div className="flex min-w-0 w-full items-center gap-3 rounded-xl bg-neutral-50 px-3 py-3 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#1B8A70] ring-1 ring-neutral-200/90">
          {icon}
        </span>
        <span className="min-w-0 text-left">
          <span className="block font-['Poppins',sans-serif] text-lg font-semibold leading-tight text-neutral-900">
            {value}
          </span>
          <span className="block text-xs text-neutral-500">{label}</span>
        </span>
      </div>
    </li>
  );
}

function EmptyPanel({ title, description }) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-xl bg-neutral-50 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-neutral-800">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-neutral-500">{description}</p>
    </div>
  );
}

function Skel({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-200/80 ${className}`} />;
}

function PublicProfileSkeleton() {
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(260px,320px)_1fr] lg:gap-6" aria-busy="true" aria-label="Loading profile">
      <aside>
        <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200/90">
          <Skel className="h-24 w-full rounded-none sm:h-28" />
          <div className="relative px-5 pb-6 pt-0 text-center sm:px-6">
            <div className="relative mx-auto -mt-12 w-fit sm:-mt-14">
              <Skel className="h-28 w-28 rounded-full ring-4 ring-white sm:h-32 sm:w-32" />
            </div>
            <Skel className="mx-auto mt-4 h-6 w-36" />
            <Skel className="mx-auto mt-3 h-4 w-48" />
            <div className="mt-3 flex justify-center gap-1.5">
              <Skel className="h-6 w-16 rounded-full" />
              <Skel className="h-6 w-14 rounded-full" />
            </div>
          </div>
        </section>
      </aside>
      <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
        <section className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200/90 sm:p-5">
          <ul className="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-3">
                <Skel className="h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skel className="h-5 w-8" />
                  <Skel className="h-3 w-16" />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200/90 sm:p-5">
          <Skel className="h-5 w-40" />
          <Skel className="mt-2 h-4 w-64 max-w-full" />
          <Skel className="mt-4 h-64 w-full rounded-xl sm:h-80" />
        </section>
        <section className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200/90 sm:p-5">
          <Skel className="h-5 w-28" />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3 p-2">
                <Skel className="h-16 w-16 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2 py-0.5">
                  <Skel className="h-4 w-32" />
                  <Skel className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function PublicProfilePage() {
  const { userId: userIdParam } = useParams();
  const profileUserId = String(userIdParam ?? '').trim();

  const [viewerId, setViewerId] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewCount, setReviewCount] = useState(0);
  const [checkinCount, setCheckinCount] = useState(0);
  const [visits, setVisits] = useState([]);
  const [publicLists, setPublicLists] = useState([]);

  const isOwnPublicView = Boolean(viewerId && profileUserId && viewerId === profileUserId);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setViewerId(data?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setViewerId(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!profileUserId) {
        setProfile(null);
        setLoadError('Profile not found.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError('');
      try {
        const [pub, reviewN, travel, lists] = await Promise.all([
          fetchPublicTravelerProfile(supabase, profileUserId),
          fetchPublicReviewCount(supabase, profileUserId),
          fetchPublicProfileTravel(supabase, profileUserId),
          fetchPublicListsForUser(profileUserId).catch(() => []),
        ]);
        if (cancelled) return;
        if (!pub) {
          setProfile(null);
          setLoadError('This traveler profile is not available.');
          setReviewCount(0);
          setCheckinCount(0);
          setVisits([]);
          setPublicLists([]);
        } else {
          setProfile(pub);
          setReviewCount(reviewN);
          setCheckinCount(travel.checkinCount);
          setVisits(travel.visits);
          setPublicLists(lists);
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
          setLoadError('Could not load this profile.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [profileUserId]);

  const itinerariesUsedCount = useMemo(() => {
    if (!isOwnPublicView) return 0;
    return getItineraryStartsCount(profileUserId);
  }, [isOwnPublicView, profileUserId]);

  const savedPlaceCount = useMemo(() => countSavedPlaces(publicLists), [publicLists]);

  const listCards = useMemo(() => {
    return (publicLists ?? [])
      .map((list) => {
        const items = Array.isArray(list.items) ? list.items : [];
        const coverItem =
          items.find((item) => !isItinerarySavedItem(item) && String(item.image ?? item.imageUrl ?? '').trim()) ||
          items.find((item) => String(item.image ?? item.imageUrl ?? '').trim()) ||
          null;
        const cover = coverItem
          ? String(coverItem.image ?? coverItem.imageUrl ?? '').trim() || PLACEHOLDER_IMG
          : PLACEHOLDER_IMG;
        return {
          id: String(list.id ?? list.name ?? ''),
          name: String(list.name ?? '').trim() || 'Saved list',
          itemCount: items.length,
          cover,
        };
      })
      .filter((list) => list.id);
  }, [publicLists]);

  return (
    <div className="min-h-screen bg-neutral-50 font-['Poppins',sans-serif]">
      <AppHeader />

      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {loading ? (
          <PublicProfileSkeleton />
        ) : loadError || !profile ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-200/90">
            <p className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">
              {loadError || 'Profile not found'}
            </p>
            <Link to="/search" className="mt-4 inline-flex text-sm font-semibold text-[#1B8A70] hover:underline">
              Back to Search
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(260px,320px)_1fr] lg:gap-6">
            <aside className="lg:sticky lg:top-24">
              <section className="overflow-hidden rounded-2xl bg-white text-center ring-1 ring-neutral-200/90">
                <div
                  className="relative h-24 w-full bg-gradient-to-br from-[#1B8A70] via-[#2A9B7F] to-[#D4EFE8] sm:h-28"
                  style={
                    profile.coverUrl
                      ? {
                          backgroundImage: `url(${profile.coverUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : undefined
                  }
                />
                <div className="relative px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                  <div className="relative mx-auto -mt-12 w-fit sm:-mt-14">
                    <div className="relative h-28 w-28 overflow-hidden rounded-full bg-neutral-100 ring-4 ring-white sm:h-32 sm:w-32">
                      <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  </div>

                  <h1 className="mt-4 font-['Poppins',sans-serif] text-xl font-semibold tracking-tight text-neutral-900">
                    {profile.username}
                  </h1>
                  {profile.bio ? (
                    <p className="mt-2 text-sm leading-relaxed text-neutral-600">{profile.bio}</p>
                  ) : null}
                  {profile.interestTags?.length ? (
                    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                      {profile.interestTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[#F1F7F6] px-2.5 py-1 text-[11px] font-semibold text-[#1B8A70] ring-1 ring-[#1B8A70]/15"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {isOwnPublicView ? (
                    <p className="mt-5 border-t border-neutral-100 pt-4 text-sm text-neutral-500">
                      This is you.{' '}
                      <Link to="/profile" className="font-semibold text-[#1B8A70] hover:underline">
                        Edit profile
                      </Link>
                    </p>
                  ) : null}
                </div>
              </section>
            </aside>

            <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
              <section className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200/90 sm:p-5">
                <ul className="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4">
                  <StatBox
                    value={checkinCount}
                    label="Destinations"
                    icon={
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden>
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    }
                  />
                  <StatBox
                    value={reviewCount}
                    label="Reviews"
                    icon={
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden>
                        <path d="m12 3 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.8 7.2 17.9l.9-5.4L4.2 8.7l5.4-.8L12 3Z" strokeLinejoin="round" />
                      </svg>
                    }
                  />
                  <StatBox
                    value={itinerariesUsedCount}
                    label="Itineraries used"
                    icon={
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden>
                        <path d="M4 19V5" strokeLinecap="round" />
                        <path d="M4 7h12l-2 3 2 3H4" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M14 17h6" strokeLinecap="round" />
                        <path d="m17 14 3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    }
                  />
                  <StatBox
                    value={savedPlaceCount}
                    label="Saved places"
                    icon={
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden>
                        <path
                          d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"
                          strokeLinejoin="round"
                        />
                      </svg>
                    }
                  />
                </ul>
              </section>

              <CaviteVisitMap visits={visits} />

              <section className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200/90 sm:p-5">
                <h2 className="font-['Poppins',sans-serif] text-[15px] font-semibold text-neutral-900 sm:text-base">
                  Public lists
                </h2>
                {listCards.length === 0 ? (
                  <EmptyPanel title="No public lists" description="This traveler has not shared any lists yet." />
                ) : (
                  <ul className="mt-4 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
                    {listCards.map((list) => (
                      <li key={list.id}>
                        <div className="flex gap-3 rounded-xl p-2">
                          <img
                            src={list.cover}
                            alt=""
                            className="h-16 w-16 shrink-0 rounded-lg bg-neutral-100 object-cover"
                            loading="lazy"
                          />
                          <span className="min-w-0 flex-1 py-0.5">
                            <span className="block truncate text-sm font-semibold text-neutral-900">{list.name}</span>
                            <span className="mt-0.5 block text-xs text-neutral-500">
                              {list.itemCount === 1 ? '1 item' : `${list.itemCount} items`}
                            </span>
                            <span className="mt-1 inline-flex rounded-full bg-[#F1F7F6] px-2 py-0.5 text-[11px] font-semibold text-[#1B8A70] ring-1 ring-[#1B8A70]/15">
                              Public
                            </span>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
