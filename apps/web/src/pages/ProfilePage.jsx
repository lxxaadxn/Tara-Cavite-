import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { supabase } from '../lib/supabase';
import {
  getThisMonthDestinationReachedEntries,
  DESTINATION_REACHED_UPDATED_EVENT,
} from '../lib/destinationReachedActivity';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80';
const DEFAULT_PROFILE_LOGO =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='16' fill='%23eaf5cf'/><circle cx='32' cy='32' r='19' fill='%237ea00e'/><text x='32' y='38' text-anchor='middle' font-family='Arial,sans-serif' font-size='18' font-weight='700' fill='white'>CT</text></svg>";

function deriveProfile(user, profileRow) {
  const meta = user?.user_metadata ?? {};
  const fullName =
    profileRow?.username ||
    meta.full_name ||
    meta.name ||
    meta.nickname ||
    [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
    (user?.email ? user.email.split('@')[0] : 'CaviTour User');
  const created = user?.created_at ? new Date(user.created_at) : null;
  const daysOnPlatform = created ? Math.max(1, Math.floor((Date.now() - created.getTime()) / 86400000)) : 0;
  return {
    name: fullName,
    nickname: profileRow?.username || meta.nickname || meta.username || (user?.email ? user.email.split('@')[0] : ''),
    roleLabel: daysOnPlatform ? `Traveler · ${daysOnPlatform} days on the platform` : 'Traveler',
    phone: profileRow?.phone || user?.phone || meta.phone || '',
    email: user?.email || 'No email on account',
    avatarUrl: profileRow?.avatar_url || meta.avatar_url || meta.picture || DEFAULT_PROFILE_LOGO,
  };
}

export function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => deriveProfile(null, null));
  const [mapVisitUserId, setMapVisitUserId] = useState('');
  const [visitRefresh, setVisitRefresh] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user ?? null;
      if (!u) {
        if (!cancelled) {
          setProfile(deriveProfile(null, null));
          setMapVisitUserId('');
        }
        return;
      }
      const { data: profileRow } = await supabase.from('user_profiles').select('username, avatar_url, city, phone').eq('id', u.id).single();
      if (!cancelled) {
        setProfile(deriveProfile(u, profileRow ?? null));
        setMapVisitUserId(u?.id ?? '');
      }
    };

    const onDestinationReachedUpdated = () => setVisitRefresh((n) => n + 1);

    loadProfile();
    window.addEventListener(DESTINATION_REACHED_UPDATED_EVENT, onDestinationReachedUpdated);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const u = session?.user ?? null;
      if (!u) {
        setProfile(deriveProfile(null, null));
        setMapVisitUserId('');
        return;
      }
      setMapVisitUserId(u.id);
      void (async () => {
        const { data: profileRow } = await supabase.from('user_profiles').select('username, avatar_url, city, phone').eq('id', u.id).single();
        if (!cancelled) setProfile(deriveProfile(u, profileRow ?? null));
      })();
    });

    return () => {
      cancelled = true;
      window.removeEventListener(DESTINATION_REACHED_UPDATED_EVENT, onDestinationReachedUpdated);
      subscription.unsubscribe();
    };
  }, []);

  const activityThisMonth = useMemo(() => {
    void visitRefresh;
    const entries = getThisMonthDestinationReachedEntries(mapVisitUserId);
    return entries.map((e) => ({
      id: e.id,
      name: e.name,
      image: e.image || PLACEHOLDER_IMG,
      subtitle: 'Destination reached this month',
      listName: '',
      savedAt: e.savedAt,
    }));
  }, [mapVisitUserId, visitRefresh]);

  const openEdit = () => {
    setEditNickname(profile.nickname || profile.name || '');
    setEditPhone(profile.phone || '');
    setEditOpen(true);
  };

  const saveEdits = async () => {
    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const u = authData?.user;
      if (!u) return;
      const nick = String(editNickname ?? '').trim();
      const phone = String(editPhone ?? '').trim();
      if (!nick) {
        window.alert('Please enter a nickname.');
        return;
      }
      await supabase.from('user_profiles').upsert(
        {
          id: u.id,
          username: nick,
          phone: phone || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      await supabase.auth.updateUser({
        data: { ...u.user_metadata, username: nick, nickname: nick, phone: phone || undefined },
      });
      const { data: profileRow } = await supabase.from('user_profiles').select('username, avatar_url, city, phone').eq('id', u.id).single();
      const { data: refreshed } = await supabase.auth.getUser();
      setProfile(deriveProfile(refreshed?.user ?? u, profileRow ?? null));
      setEditOpen(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const onAvatarChange = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      window.alert('Please choose an image under 5 MB.');
      input.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      window.alert('Please choose an image file.');
      input.value = '';
      return;
    }

    setUploading(true);
    try {
      const { data: authData, error: authReadErr } = await supabase.auth.getUser();
      if (authReadErr) throw authReadErr;
      const u = authData?.user;
      if (!u) {
        window.alert('Sign in to upload a profile picture.');
        return;
      }

      const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase().replace('jpeg', 'jpg');
      const safeExt = ['jpg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg';
      const mime =
        file.type && file.type.startsWith('image/')
          ? file.type
          : safeExt === 'png'
            ? 'image/png'
            : safeExt === 'webp'
              ? 'image/webp'
              : 'image/jpeg';

      const path = `${u.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;

      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        contentType: mime,
        cacheControl: '3600',
      });

      if (upErr) {
        const msg = upErr.message || '';
        if (/policy|permission|row-level security|not authorized|denied/i.test(msg)) {
          throw new Error(
            'Upload blocked by storage rules. In Supabase: create a public "avatars" bucket, then run storage-policies.sql from the project repo (SQL Editor).'
          );
        }
        if (/bucket|not found|does not exist/i.test(msg)) {
          throw new Error(
            'Storage bucket "avatars" is missing. Create it under Storage in the Supabase Dashboard, mark it public if you use public URLs, then apply storage-policies.sql.'
          );
        }
        throw upErr;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const usernameForRow =
        profile.nickname?.trim() ||
        profile.name?.trim() ||
        u.user_metadata?.nickname ||
        u.user_metadata?.username ||
        (u.email ? u.email.split('@')[0] : 'User');

      const { error: profileErr } = await supabase.from('user_profiles').upsert(
        {
          id: u.id,
          username: usernameForRow,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (profileErr) throw profileErr;

      const { error: metaErr } = await supabase.auth.updateUser({
        data: {
          ...u.user_metadata,
          avatar_url: publicUrl,
          picture: publicUrl,
        },
      });
      if (metaErr) throw metaErr;

      await supabase.auth.refreshSession();

      const { data: refreshed } = await supabase.auth.getUser();
      const sessionUser = refreshed?.user ?? u;
      const { data: profileRow } = await supabase
        .from('user_profiles')
        .select('username, avatar_url, city, phone')
        .eq('id', u.id)
        .maybeSingle();

      setProfile(deriveProfile(sessionUser, profileRow ?? null));
      window.dispatchEvent(new CustomEvent('cavitour:avatar-updated'));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      input.value = '';
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f8fb] font-['Inter',sans-serif]">
      <AppHeader />

      <div className="mx-auto w-full max-w-[1150px] px-4 py-7 sm:px-6 lg:px-8">
        <h1 className="font-['Poppins',sans-serif] text-4xl font-bold text-neutral-900">My Activity</h1>

        <section className="mt-4 rounded-2xl border border-[#e4edf4] bg-white p-4 shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <img src={profile.avatarUrl} alt="Profile" className="h-24 w-24 rounded-xl object-cover" />

            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold text-neutral-900">{profile.name}</p>
                  <p className="text-xs text-neutral-500">{profile.roleLabel}</p>
                  {profile.nickname ? (
                    <p className="mt-1 text-sm text-neutral-600">
                      <span className="font-medium text-neutral-500">Nickname:</span> {profile.nickname}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={openEdit}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                >
                  Edit profile
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-1.5 text-sm text-neutral-600 sm:grid-cols-2">
                <p className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path
                      d="M22 16.92V19a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3 4.18 2 2 0 0 1 5 2h2.09a2 2 0 0 1 2 1.72c.12.89.32 1.76.61 2.6a2 2 0 0 1-.45 2.11L8.15 9.85a16 16 0 0 0 6 6l1.42-1.11a2 2 0 0 1 2.11-.45c.84.29 1.71.49 2.6.61A2 2 0 0 1 22 16.92z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {profile.phone || 'Add phone in Edit profile'}
                </p>
                <p className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16v16H4z" strokeLinejoin="round" />
                    <path d="m22 6-10 7L2 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {profile.email}
                </p>
              </div>

              <div className="mt-4 border-t border-neutral-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Profile photo</p>
                <label className="mt-2 inline-flex cursor-pointer rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100">
                  {uploading ? 'Uploading…' : 'Upload new picture'}
                  <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} disabled={uploading} />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#e4edf4] bg-white p-4 shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-['Poppins',sans-serif] text-2xl font-bold text-neutral-900">Activity this month</h2>
            <div className="flex flex-col items-end">
              <span className="font-['Poppins',sans-serif] text-4xl font-bold leading-none text-[#5d7211]">
                {activityThisMonth.length}
              </span>
              <span className="mt-1 text-xs text-neutral-500">destinations reached</span>
            </div>
          </div>
          {activityThisMonth.length === 0 ? (
            <p className="mb-3 text-xs leading-relaxed text-[#1f4f59]">
              Open a place → Route tab → tap “Destination Reached” (above See full map). Opening the map alone does not
              count.
            </p>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(activityThisMonth.length ? activityThisMonth : [{ id: 'empty', name: 'No trips completed yet', subtitle: 'After a trip, tap “Destination Reached” on the place Route tab to count it here.', image: PLACEHOLDER_IMG, listName: '' }]).map((card) => (
              <article key={card.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <div className="relative h-40 bg-neutral-100">
                  <img src={card.image} alt="" className="h-full w-full object-cover" />
                  {card.listName ? (
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-neutral-700">{card.listName}</span>
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="line-clamp-1 text-sm font-semibold text-neutral-900">{card.name}</p>
                  <p className="line-clamp-2 text-xs text-neutral-500">{card.subtitle}</p>
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

      {editOpen ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <p className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">Edit profile</p>
            <label className="mt-4 block text-xs font-semibold text-neutral-600" htmlFor="pf-nick">
              Nickname
            </label>
            <input
              id="pf-nick"
              value={editNickname}
              onChange={(e) => setEditNickname(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
            />
            <label className="mt-3 block text-xs font-semibold text-neutral-600" htmlFor="pf-phone">
              Phone
            </label>
            <input
              id="pf-phone"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              type="tel"
              className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
            />
            <p className="mt-2 text-[11px] text-neutral-500">Phone is stored on your account for display in the app.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveEdits()}
                disabled={saving}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: '#1f4f59' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
