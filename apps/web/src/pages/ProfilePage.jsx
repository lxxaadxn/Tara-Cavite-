import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import {
  getAllDestinationReachedEntries,
  getThisMonthDestinationReachedEntries,
  DESTINATION_REACHED_UPDATED_EVENT,
} from '../lib/destinationReachedActivity';
import { readPublicSavedLists, readSavedLists, SAVED_LISTS_UPDATED_EVENT } from '../lib/savedPlaces';
import {
  hasCustomAvatarFromSources,
  resolveAvatarFromSources,
} from 'cavitour-shared/defaultAvatar';
import {
  CHANGE_PASSWORD_MIN_LENGTH,
  CHANGE_PASSWORD_SUCCESS_MESSAGE,
  CHANGE_PASSWORD_SUCCESS_TITLE,
  changePasswordWithSupabase,
} from 'cavitour-shared/changePassword';
import { deleteUserAvatarFiles } from '../lib/avatarStorage';
import { supabase } from '../lib/supabase';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80';

const ACCENT = {
  pink: '#f4b0b0',
  teal: '#98d8d1',
  green: '#d4ed91',
};

function deriveProfile(user, profileRow) {
  const meta = user?.user_metadata ?? {};
  const nickname =
    profileRow?.username ||
    meta.nickname ||
    meta.username ||
    (user?.email ? user.email.split('@')[0] : '');
  const fullName =
    meta.full_name ||
    meta.name ||
    [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
    nickname ||
    (user?.email ? user.email.split('@')[0] : 'Tara, Cavite! User');
  const created = user?.created_at ? new Date(user.created_at) : null;
  const daysOnPlatform = created ? Math.max(1, Math.floor((Date.now() - created.getTime()) / 86400000)) : 0;
  return {
    name: fullName,
    nickname,
    roleLabel: daysOnPlatform ? `Traveler · ${daysOnPlatform} days on the platform` : 'Traveler',
    city: profileRow?.city || meta.city || '',
    phone: profileRow?.phone || user?.phone || meta.phone || '',
    email: user?.email || 'No email on account',
    avatarUrl: resolveAvatarFromSources(profileRow, meta),
    hasCustomPhoto: hasCustomAvatarFromSources(profileRow, meta),
  };
}

function formatUpdatedLabel(iso) {
  if (!iso) return 'No recent activity';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'No recent activity';
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  return `Update: ${date}, ${time}`;
}

function countSavedPlaces() {
  return readSavedLists().reduce((sum, list) => sum + (Array.isArray(list.items) ? list.items.length : 0), 0);
}

function latestIsoFromEntries(entries) {
  let latest = null;
  for (const e of entries) {
    if (!e.savedAt) continue;
    if (!latest || e.savedAt > latest) latest = e.savedAt;
  }
  return latest;
}

function latestIsoFromLists(lists) {
  let latest = null;
  for (const list of lists) {
    const candidates = [list.updatedAt, list.createdAt];
    for (const item of list.items || []) {
      if (item.savedAt) candidates.push(item.savedAt);
    }
    for (const iso of candidates) {
      if (!iso) continue;
      if (!latest || iso > latest) latest = iso;
    }
  }
  return latest;
}

function ProfileStatBar({ label, value, color }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="min-h-[28px] text-[11px] font-medium leading-[14px] text-neutral-500">{label}</p>
      <p className="mt-1.5 font-['Poppins',sans-serif] text-2xl font-bold leading-[30px] text-neutral-900">{value}</p>
      <div className="mt-2 h-1 rounded-full" style={{ backgroundColor: color }} />
    </div>
  );
}

function SummaryCard({ title, count, bg, updatedLabel, to }) {
  const inner = (
    <article
      className="relative flex min-h-[130px] flex-col justify-between rounded-[22px] p-4 transition hover:brightness-[0.98]"
      style={{ backgroundColor: bg }}
    >
      <h3 className="font-['Poppins',sans-serif] text-sm font-semibold text-neutral-800">{title}</h3>
      <div className="mt-4 flex items-end justify-between gap-2">
        <p className="text-[11px] text-neutral-700/80">{updatedLabel}</p>
        <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-white/80 px-2 font-['Poppins',sans-serif] text-sm font-bold text-neutral-900 shadow-sm">
          {count}
        </span>
      </div>
    </article>
  );
  if (to) {
    return (
      <Link to={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f4f59]/40 rounded-[22px]">
        {inner}
      </Link>
    );
  }
  return inner;
}

function RecentVisitCard({ card }) {
  const isPlaceholder = card.id === 'empty';
  const body = (
    <article className="group overflow-hidden rounded-[22px] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
      <div className="relative aspect-[4/3] bg-neutral-100">
        <img src={card.image} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        <span
          className="absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
          style={{ backgroundColor: '#7ea00e' }}
        >
          Visited
        </span>
        {!isPlaceholder ? (
          <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-semibold text-neutral-900">{card.name}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{card.subtitle}</p>
      </div>
    </article>
  );

  if (isPlaceholder || !card.id) return body;
  return (
    <Link to={`/place/${encodeURIComponent(card.id)}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f4f59]/40 rounded-[22px]">
      {body}
    </Link>
  );
}

function ProfilePublicListCard({ list }) {
  const listId = list.id || list.name;
  const cover = list.items[0]?.image || PLACEHOLDER_IMG;

  return (
    <article className="w-full overflow-hidden rounded-[22px] border border-neutral-100 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
      <div className="relative aspect-[4/3] bg-neutral-100">
        <img src={cover} alt="" className="h-full w-full object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-[#1f4f59]">Public</span>
        <Link
          to={`/saved?list=${encodeURIComponent(listId)}`}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-sm hover:bg-white"
          aria-label={`View ${list.name}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 font-['Poppins',sans-serif] text-sm font-semibold text-neutral-900">{list.name}</h3>
        <p className="mt-0.5 text-xs text-neutral-500">
          {list.items.length} {list.items.length === 1 ? 'place' : 'places'}
        </p>
      </div>
    </article>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => deriveProfile(null, null));
  const [mapVisitUserId, setMapVisitUserId] = useState('');
  const [visitRefresh, setVisitRefresh] = useState(0);
  const [savedRefresh, setSavedRefresh] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [removeAvatarConfirmOpen, setRemoveAvatarConfirmOpen] = useState(false);
  const [deleteAccountConfirmOpen, setDeleteAccountConfirmOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccessOpen, setPasswordSuccessOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publicListsRefresh, setPublicListsRefresh] = useState(0);
  const [refreshingSection, setRefreshingSection] = useState(null);

  const refreshStats = async (section) => {
    if (refreshingSection) return;
    setRefreshingSection(section);
    try {
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          setVisitRefresh((n) => n + 1);
          setSavedRefresh((n) => n + 1);
          setPublicListsRefresh((n) => n + 1);
          resolve();
        });
      });
      await new Promise((r) => setTimeout(r, 450));
    } finally {
      setRefreshingSection(null);
    }
  };

  const publicLists = useMemo(() => {
    void publicListsRefresh;
    return readPublicSavedLists().map((list) => ({
      ...list,
      items: list.items.map((item) => ({
        ...item,
        image: item.image || PLACEHOLDER_IMG,
      })),
    }));
  }, [publicListsRefresh]);

  const savedPlaceCount = useMemo(() => {
    void savedRefresh;
    return countSavedPlaces();
  }, [savedRefresh]);

  const allTimeVisits = useMemo(() => {
    void visitRefresh;
    return getAllDestinationReachedEntries(mapVisitUserId);
  }, [mapVisitUserId, visitRefresh]);

  const activityThisMonth = useMemo(() => {
    void visitRefresh;
    const entries = getThisMonthDestinationReachedEntries(mapVisitUserId);
    return entries.map((e) => ({
      id: e.id,
      name: e.name,
      image: e.image || PLACEHOLDER_IMG,
      subtitle: 'Destination reached this month',
      savedAt: e.savedAt,
    }));
  }, [mapVisitUserId, visitRefresh]);

  const summaryMeta = useMemo(() => {
    const monthUpdated = formatUpdatedLabel(latestIsoFromEntries(activityThisMonth));
    const savedLists = readSavedLists();
    const savedUpdated = formatUpdatedLabel(latestIsoFromLists(savedLists));
    const publicUpdated = formatUpdatedLabel(latestIsoFromLists(publicLists));
    return { monthUpdated, savedUpdated, publicUpdated };
  }, [activityThisMonth, publicLists, savedRefresh]);

  useEffect(() => {
    const reloadPublicLists = () => {
      setPublicListsRefresh((n) => n + 1);
      setSavedRefresh((n) => n + 1);
    };
    window.addEventListener(SAVED_LISTS_UPDATED_EVENT, reloadPublicLists);
    window.addEventListener('focus', reloadPublicLists);
    return () => {
      window.removeEventListener(SAVED_LISTS_UPDATED_EVENT, reloadPublicLists);
      window.removeEventListener('focus', reloadPublicLists);
    };
  }, []);

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

  const recentVisits = activityThisMonth.slice(0, 3);

  const openEdit = () => {
    setEditNickname(profile.nickname || profile.name || '');
    setEditEmail(profile.email === 'No email on account' ? '' : profile.email);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setEditOpen(true);
  };

  const changePassword = async () => {
    setChangingPassword(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const u = authData?.user;
      if (!u?.email) {
        window.alert('Sign in with an email account to change your password.');
        return;
      }
      await changePasswordWithSupabase(supabase, {
        email: u.email,
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccessOpen(true);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Could not change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const saveEdits = async () => {
    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const u = authData?.user;
      if (!u) return;
      const nick = String(editNickname ?? '').trim();
      const emailTrim = String(editEmail ?? '').trim().toLowerCase();
      const currentEmail = String(u.email ?? '')
        .trim()
        .toLowerCase();

      if (!nick) {
        window.alert('Please enter a nickname.');
        return;
      }
      if (!emailTrim) {
        window.alert('Please enter an email address.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
        window.alert('Please enter a valid email address.');
        return;
      }

      let emailChangePending = false;
      if (emailTrim !== currentEmail) {
        const { error: emailErr } = await supabase.auth.updateUser(
          { email: emailTrim },
          { emailRedirectTo: `${window.location.origin}/profile` }
        );
        if (emailErr) {
          const msg = emailErr.message || '';
          if (/already registered|already been registered|user already registered/i.test(msg)) {
            throw new Error('That email is already used by another account. Try a different address.');
          }
          if (/reauthentication|re-auth|same as the old/i.test(msg)) {
            throw new Error(
              'Email could not be changed right now. Sign out, sign in again, then try updating your email.'
            );
          }
          throw emailErr;
        }
        emailChangePending = true;
      }

      await supabase.from('user_profiles').upsert(
        {
          id: u.id,
          username: nick,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      await supabase.auth.updateUser({
        data: { ...u.user_metadata, username: nick, nickname: nick },
      });
      const { data: profileRow } = await supabase.from('user_profiles').select('username, avatar_url, city, phone').eq('id', u.id).single();
      const { data: refreshed } = await supabase.auth.getUser();
      setProfile(deriveProfile(refreshed?.user ?? u, profileRow ?? null));
      setEditOpen(false);
      if (emailChangePending) {
        window.alert(
          'Profile saved. We sent a confirmation link to your new email — open it to finish changing your address. This works for Google and email sign-in accounts.'
        );
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const userHasRemovableAvatar = (user, profileRow) =>
    hasCustomAvatarFromSources(profileRow, user?.user_metadata ?? {});

  const openRemoveAvatarConfirm = () => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user;
      if (!u) return;
      const { data: profileRow } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('id', u.id)
        .maybeSingle();
      if (!userHasRemovableAvatar(u, profileRow)) return;
      setRemoveAvatarConfirmOpen(true);
    })();
  };

  const removeAvatar = async () => {
    setUploading(true);
    try {
      const { data: authData, error: authReadErr } = await supabase.auth.getUser();
      if (authReadErr) throw authReadErr;
      const u = authData?.user;
      if (!u) {
        window.alert('Sign in to remove your profile picture.');
        return;
      }

      const { data: profileBefore } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('id', u.id)
        .maybeSingle();

      if (!userHasRemovableAvatar(u, profileBefore)) {
        window.alert('No profile photo to remove.');
        return;
      }

      const currentUrl =
        profileBefore?.avatar_url ||
        u.user_metadata?.avatar_url ||
        u.user_metadata?.picture ||
        null;

      try {
        await deleteUserAvatarFiles(supabase, u.id, typeof currentUrl === 'string' ? currentUrl : null);
      } catch (storageErr) {
        const msg = storageErr instanceof Error ? storageErr.message : '';
        if (/policy|permission|row-level security|not authorized|denied/i.test(msg)) {
          throw new Error(
            'Could not delete the file from storage. In Supabase, run storage-policies.sql so your account can delete files in the avatars bucket.'
          );
        }
        throw storageErr;
      }

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
          avatar_url: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (profileErr) throw profileErr;

      const { error: metaErr } = await supabase.auth.updateUser({
        data: {
          ...u.user_metadata,
          avatar_url: null,
          picture: null,
          cavitour_use_default_avatar: true,
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
      setRemoveAvatarConfirmOpen(false);
      setEditOpen(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not remove profile photo.');
    } finally {
      setUploading(false);
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
          cavitour_use_default_avatar: false,
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
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      setSignOutConfirmOpen(false);
      navigate('/', { replace: true });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not sign out.');
    } finally {
      setSigningOut(false);
    }
  };

  const deleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const { data: authData, error: authReadErr } = await supabase.auth.getUser();
      if (authReadErr) throw authReadErr;
      if (!authData?.user) {
        window.alert('Sign in to delete your account.');
        return;
      }

      const { error: rpcErr } = await supabase.rpc('delete_own_account');
      if (rpcErr) {
        const msg = rpcErr.message || '';
        if (/function.*does not exist|could not find/i.test(msg)) {
          throw new Error(
            'Account deletion is not enabled yet. Run the migration supabase/migrations/20260520140000_delete_own_account.sql in the Supabase SQL Editor.'
          );
        }
        throw rpcErr;
      }

      try {
        await deleteUserAvatarFiles(supabase, authData.user.id, null);
      } catch {
      }

      await supabase.auth.signOut();
      setDeleteAccountConfirmOpen(false);
      setEditOpen(false);
      navigate('/', { replace: true });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete account.');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f9] font-['Inter',sans-serif]">
      <AppHeader />

      <div className="mx-auto w-full max-w-[1150px] px-4 py-7 sm:px-6 lg:px-8">
        {/* Profile header */}
        <section className="rounded-[28px] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start">
            <div className="relative mx-auto shrink-0 md:mx-0">
              <div className="relative h-28 w-28 overflow-hidden rounded-full sm:h-32 sm:w-32">
                <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-white to-transparent" />
              </div>
              <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm hover:bg-neutral-50">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} disabled={uploading} aria-label="Upload profile photo" />
              </label>
              {profile.hasCustomPhoto ? (
                <button
                  type="button"
                  onClick={openRemoveAvatarConfirm}
                  disabled={uploading}
                  className="absolute -bottom-1 -left-1 flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50"
                  aria-label="Remove profile photo"
                  title="Remove profile photo"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="font-['Poppins',sans-serif] text-2xl font-bold text-neutral-900 sm:text-[1.65rem]">
                    {profile.nickname || 'Add nickname in Edit profile'}
                  </h1>
                  <p className="mt-0.5 text-sm text-neutral-500">{profile.roleLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openEdit}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:bg-neutral-50"
                    aria-label="Edit profile"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-neutral-600 sm:grid-cols-2">
                <p className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M20 21a8 8 0 0 0-16 0" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {profile.name}
                </p>
                <p className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M4 4h16v16H4z" strokeLinejoin="round" />
                    <path d="m22 6-10 7L2 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="truncate">{profile.email}</span>
                </p>
                <p className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {profile.city || 'Cavite, Philippines'}
                </p>
                <p className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeLinecap="round" strokeLinejoin="round" />
                    <rect width="20" height="14" x="2" y="6" rx="2" />
                  </svg>
                  Tara, Cavite! traveler
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3 border-t border-neutral-100 pt-5 sm:gap-4">
            <ProfileStatBar label="Saved places" value={savedPlaceCount} color={ACCENT.pink} />
            <ProfileStatBar label="Destinations reached" value={allTimeVisits.length} color={ACCENT.teal} />
            <ProfileStatBar label="Public collections" value={publicLists.length} color={ACCENT.green} />
          </div>
        </section>

        {/* My Summary */}
        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-['Poppins',sans-serif] text-xl font-bold text-neutral-900">My Summary</h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600">This month</span>
              <button
                type="button"
                onClick={() => void refreshStats('summary')}
                disabled={refreshingSection !== null}
                aria-busy={refreshingSection === 'summary'}
                aria-label="Refresh stats"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg className={`h-4 w-4 ${refreshingSection === 'summary' ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 16h5v5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard
              title="Visits this month"
              count={activityThisMonth.length}
              bg={ACCENT.green}
              updatedLabel={summaryMeta.monthUpdated}
            />
            <SummaryCard
              title="Saved places"
              count={savedPlaceCount}
              bg={ACCENT.teal}
              updatedLabel={summaryMeta.savedUpdated}
              to="/saved"
            />
            <SummaryCard
              title="Public collections"
              count={publicLists.length}
              bg={ACCENT.pink}
              updatedLabel={summaryMeta.publicUpdated}
              to="/saved"
            />
          </div>
        </section>

        {/* Recent visits */}
        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-['Poppins',sans-serif] text-xl font-bold text-neutral-900">
              Recent visits ({activityThisMonth.length})
            </h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600">This month</span>
              <button
                type="button"
                onClick={() => void refreshStats('visits')}
                disabled={refreshingSection !== null}
                aria-busy={refreshingSection === 'visits'}
                aria-label="Refresh visits"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg className={`h-4 w-4 ${refreshingSection === 'visits' ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 16h5v5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          {recentVisits.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentVisits.map((card) => (
                <RecentVisitCard key={card.id} card={card} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">You haven&apos;t reached a destination yet.</p>
          )}
        </section>

        {publicLists.length > 0 ? (
          <section className="mt-5 rounded-[28px] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-['Poppins',sans-serif] text-xl font-bold text-neutral-900">
                Public collections ({publicLists.length})
              </h2>
              <Link
                to="/saved"
                className="rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Manage saved
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {publicLists.map((list) => (
                <ProfilePublicListCard key={list.id || list.name} list={list} />
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setSignOutConfirmOpen(true)}
            className="rounded-full border border-red-200 bg-red-50 px-5 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            Sign out
          </button>
        </div>
      </div>

      {signOutConfirmOpen ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sign-out-title"
          onClick={() => {
            if (!signingOut) setSignOutConfirmOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-[28px] border border-neutral-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="sign-out-title" className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">
              Sign out?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              You will need to sign in again to access your profile, saved lists, and activity.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSignOutConfirmOpen(false)}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                disabled={signingOut}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="rounded-xl border border-red-200 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editOpen ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[28px] border border-neutral-200 bg-white p-5 shadow-xl">
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
            <label className="mt-3 block text-xs font-semibold text-neutral-600" htmlFor="pf-email">
              Email
            </label>
            <input
              id="pf-email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
            />
            <p className="mt-1.5 text-[11px] text-neutral-500">
              Google and email accounts can change address here. If you change email, confirm the link we send to the new inbox.
            </p>

            <div className="mt-5 border-t border-neutral-100 pt-4">
              <p className="text-sm font-semibold text-neutral-900">Change password</p>
              <p className="mt-1 text-[11px] text-neutral-500">
                Enter your current password, then choose a new one (at least {CHANGE_PASSWORD_MIN_LENGTH} characters).
              </p>
              <label className="mt-3 block text-xs font-semibold text-neutral-600" htmlFor="pf-current-password">
                Current password
              </label>
              <input
                id="pf-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
              />
              <label className="mt-3 block text-xs font-semibold text-neutral-600" htmlFor="pf-new-password">
                New password
              </label>
              <input
                id="pf-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
              />
              <label className="mt-3 block text-xs font-semibold text-neutral-600" htmlFor="pf-confirm-password">
                Confirm password
              </label>
              <input
                id="pf-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
              />
              <button
                type="button"
                onClick={() => void changePassword()}
                disabled={saving || uploading || deletingAccount || changingPassword}
                className="mt-3 w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 disabled:opacity-50"
              >
                {changingPassword ? 'Updating password…' : 'Update password'}
              </button>
            </div>

            {profile.hasCustomPhoto ? (
              <button
                type="button"
                onClick={openRemoveAvatarConfirm}
                disabled={uploading || saving || changingPassword}
                className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                {uploading ? 'Removing…' : 'Remove profile photo'}
              </button>
            ) : null}
            <div className="mt-5 border-t border-neutral-100 pt-4">
              <button
                type="button"
                onClick={() => setDeleteAccountConfirmOpen(true)}
                disabled={saving || uploading || deletingAccount || changingPassword}
                className="w-full rounded-xl border border-red-200 bg-white py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              >
                Delete account
              </button>
              <p className="mt-1.5 text-[11px] text-neutral-500">
                Permanently removes your profile, cloud data, and sign-in access.
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                disabled={saving || deletingAccount || changingPassword}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveEdits()}
                disabled={saving || deletingAccount || changingPassword}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: '#1f4f59' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {passwordSuccessOpen ? (
        <div
          className="fixed inset-0 z-[1003] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="password-success-title"
          onClick={() => setPasswordSuccessOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[28px] border border-neutral-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="password-success-title" className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">
              {CHANGE_PASSWORD_SUCCESS_TITLE}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{CHANGE_PASSWORD_SUCCESS_MESSAGE}</p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setPasswordSuccessOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: '#1f4f59' }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteAccountConfirmOpen ? (
        <div
          className="fixed inset-0 z-[1002] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          onClick={() => {
            if (!deletingAccount) setDeleteAccountConfirmOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-[28px] border border-neutral-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="delete-account-title" className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">
              Delete your account?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              This cannot be undone. Your account, profile, reviews, and cloud saved lists will be permanently deleted.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteAccountConfirmOpen(false)}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                disabled={deletingAccount}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteAccount()}
                disabled={deletingAccount}
                className="rounded-xl border border-red-200 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {deletingAccount ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {removeAvatarConfirmOpen ? (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-avatar-title"
          onClick={() => {
            if (!uploading) setRemoveAvatarConfirmOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-[28px] border border-neutral-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="remove-avatar-title" className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">
              Remove profile photo?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Your uploaded picture will be deleted and the default avatar will be used. You can upload a new photo anytime.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveAvatarConfirmOpen(false)}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void removeAvatar()}
                disabled={uploading}
                className="rounded-xl border border-red-200 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {uploading ? 'Removing…' : 'Remove photo'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
