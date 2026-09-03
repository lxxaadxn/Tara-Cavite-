import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import {
  CHANGE_PASSWORD_MIN_LENGTH,
  CHANGE_PASSWORD_SUCCESS_MESSAGE,
  CHANGE_PASSWORD_SUCCESS_TITLE,
} from 'cavitour-shared/changePassword';
import {
  getAllDestinationReachedEntries,
  DESTINATION_REACHED_UPDATED_EVENT,
} from '../lib/destinationReachedActivity';
import { SAVED_LISTS_UPDATED_EVENT } from '../lib/savedPlaces';
import { fetchSavedListsForUser } from '../lib/savedPlacesSupabase';
import { supabase } from '../lib/supabase';
import { fetchProfileActivity } from '../lib/profileActivity';
import {
  canRemoveAvatar,
  countSavedPlaces,
  deleteOwnAccount,
  deriveProfile,
  displayBirthday,
  fetchProfileRow,
  removeUserAvatar,
  saveProfileIdentity,
  updateAccountPassword,
  uploadUserAvatar,
  usernameForRow,
} from '../lib/travelerProfile';

const inputClass =
  'mt-1.5 h-11 w-full rounded-xl bg-neutral-50 px-3 text-sm text-neutral-900 outline-none ring-1 ring-neutral-200/90 focus:ring-2 focus:ring-[#1B8A70]/30';

function AboutMeta({ icon, children }) {
  return (
    <p className="inline-flex min-w-0 max-w-full items-center gap-2 text-sm text-neutral-600">
      <svg className="h-4 w-4 shrink-0 text-[#1B8A70]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        {icon}
      </svg>
      <span className="min-w-0 truncate">{children}</span>
    </p>
  );
}

function StatBox({ icon, value, label }) {
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-xl bg-neutral-50 px-3 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#1B8A70] ring-1 ring-neutral-200/90">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-['Poppins',sans-serif] text-lg font-semibold leading-tight text-neutral-900">{value}</span>
        <span className="block text-xs text-neutral-500">{label}</span>
      </span>
    </li>
  );
}

function SettingsRow({ to, onClick, icon, title, hint }) {
  const inner = (
    <>
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1F7F6] text-[#1B8A70]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-['Poppins',sans-serif] text-[15px] font-semibold text-neutral-900">{title}</span>
        <span className="mt-0.5 block text-sm text-neutral-500">{hint}</span>
      </span>
      <svg className="mt-2 h-4 w-4 shrink-0 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
  );
  const className =
    'flex w-full items-start gap-3 rounded-2xl px-1 py-3 text-left transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B8A70]/40';
  if (to) {
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

function DialogShell({ labelledBy, onBackdrop, children, wide, layer = 'z-[1000]' }) {
  return (
    <div
      className={`fixed inset-0 ${layer} flex items-center justify-center bg-black/40 p-4`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={onBackdrop}
    >
      <div
        className={`w-full rounded-2xl bg-white p-5 shadow-xl ring-1 ring-neutral-200/90 ${wide ? 'max-h-[90vh] max-w-md overflow-y-auto' : 'max-w-sm'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => deriveProfile(null, null));
  const [userId, setUserId] = useState('');
  const [visitRefresh, setVisitRefresh] = useState(0);
  const [activityRefresh, setActivityRefresh] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [removeAvatarConfirmOpen, setRemoveAvatarConfirmOpen] = useState(false);
  const [deleteAccountConfirmOpen, setDeleteAccountConfirmOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccessOpen, setPasswordSuccessOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [focusPassword, setFocusPassword] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [checkinCount, setCheckinCount] = useState(0);
  const [accountSavedLists, setAccountSavedLists] = useState([]);

  const allTimeVisits = useMemo(() => {
    void visitRefresh;
    return getAllDestinationReachedEntries(userId);
  }, [userId, visitRefresh]);

  useEffect(() => {
    let cancelled = false;
    const loadActivity = async () => {
      if (!userId) {
        if (!cancelled) {
          setReviewCount(0);
          setCheckinCount(0);
          setAccountSavedLists([]);
        }
        return;
      }
      try {
        const [activity, lists] = await Promise.all([
          fetchProfileActivity(supabase, userId),
          fetchSavedListsForUser(userId),
        ]);
        if (!cancelled) {
          setReviewCount(activity.reviewCount);
          setCheckinCount(activity.checkinCount);
          setAccountSavedLists(lists);
        }
      } catch {
        if (!cancelled) {
          setReviewCount(0);
          setCheckinCount(0);
          setAccountSavedLists([]);
        }
      }
    };
    void loadActivity();
    return () => {
      cancelled = true;
    };
  }, [userId, activityRefresh]);

  useEffect(() => {
    let cancelled = false;
    const applyUser = async (u) => {
      if (!u) {
        setProfile(deriveProfile(null, null));
        setUserId('');
        return;
      }
      const profileRow = await fetchProfileRow(supabase, u.id);
      if (cancelled) return;
      setProfile(deriveProfile(u, profileRow));
      setUserId(u.id);
    };

    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) await applyUser(data?.user ?? null);
    };

    const onActivityUpdated = () => {
      setVisitRefresh((n) => n + 1);
      setActivityRefresh((n) => n + 1);
    };

    void loadProfile();
    window.addEventListener(DESTINATION_REACHED_UPDATED_EVENT, onActivityUpdated);
    window.addEventListener(SAVED_LISTS_UPDATED_EVENT, onActivityUpdated);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      void applyUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      window.removeEventListener(DESTINATION_REACHED_UPDATED_EVENT, onActivityUpdated);
      window.removeEventListener(SAVED_LISTS_UPDATED_EVENT, onActivityUpdated);
      subscription.unsubscribe();
    };
  }, []);

  const savedPlaceCount = useMemo(() => countSavedPlaces(accountSavedLists), [accountSavedLists]);

  const openEdit = (opts = {}) => {
    setEditNickname(profile.nickname || profile.name || '');
    setEditEmail(profile.email === 'No email on account' ? '' : profile.email);
    setEditPhone(profile.phone || '');
    setEditCity(profile.city || '');
    setEditBirthday(profile.birthday || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setFocusPassword(Boolean(opts.focusPassword));
    setEditOpen(true);
  };

  useEffect(() => {
    if (!editOpen || !focusPassword) return;
    const timer = window.setTimeout(() => {
      document.getElementById('pf-password-block')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [editOpen, focusPassword]);

  const changePassword = async () => {
    setChangingPassword(true);
    try {
      await updateAccountPassword(supabase, { currentPassword, newPassword, confirmPassword });
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
      const result = await saveProfileIdentity(supabase, {
        nickname: editNickname,
        email: editEmail,
        phone: editPhone,
        city: editCity,
        birthday: editBirthday,
      });
      setProfile(deriveProfile(result.user, result.profileRow));
      setEditOpen(false);
      if (result.birthdaySkipped) {
        window.alert('Saved nickname, city, and phone. Birthday could not be stored until the profile table is updated.');
      }
      if (result.emailChangePending) {
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

  const openRemoveAvatarConfirm = () => {
    void (async () => {
      if (await canRemoveAvatar(supabase)) setRemoveAvatarConfirmOpen(true);
    })();
  };

  const removeAvatar = async () => {
    setUploading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const result = await removeUserAvatar(supabase, usernameForRow(profile, data?.user));
      setProfile(deriveProfile(result.user, result.profileRow));
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
    setUploading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const result = await uploadUserAvatar(supabase, file, usernameForRow(profile, data?.user));
      setProfile(deriveProfile(result.user, result.profileRow));
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
      await deleteOwnAccount(supabase);
      setDeleteAccountConfirmOpen(false);
      setEditOpen(false);
      navigate('/', { replace: true });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete account.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const busy = saving || uploading || deletingAccount || changingPassword;
  const birthdayLabel = displayBirthday(profile.birthday);

  return (
    <div className="min-h-screen bg-neutral-50 font-['Poppins',sans-serif]">
      <AppHeader />

      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="max-w-2xl">
          <h1 className="font-['Poppins',sans-serif] text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Profile
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500 sm:text-base">
            Your Tara, Cavite! traveler account. Update details, see activity, and manage sign-in.
          </p>
        </header>

        <div className="mt-8 grid grid-cols-1 items-start gap-5 sm:mt-10 lg:grid-cols-[minmax(260px,320px)_1fr] lg:gap-6">
          <aside className="lg:sticky lg:top-24">
            <section className="rounded-2xl bg-white p-5 text-center ring-1 ring-neutral-200/90 sm:p-6">
              <div className="relative mx-auto w-fit">
                <div className="relative h-28 w-28 overflow-hidden rounded-full bg-neutral-100 ring-1 ring-neutral-200/90 sm:h-32 sm:w-32">
                  <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                </div>
                <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-neutral-600 ring-1 ring-neutral-200/90 hover:bg-neutral-50">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onAvatarChange}
                    disabled={uploading}
                    aria-label="Upload profile photo"
                  />
                </label>
                {profile.hasCustomPhoto ? (
                  <button
                    type="button"
                    onClick={openRemoveAvatarConfirm}
                    disabled={uploading}
                    className="absolute -bottom-1 -left-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-600 ring-1 ring-neutral-200/90 hover:bg-red-50 disabled:opacity-50"
                    aria-label="Remove profile photo"
                    title="Remove profile photo"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : null}
              </div>

              <h2 className="mt-4 font-['Poppins',sans-serif] text-xl font-semibold tracking-tight text-neutral-900">
                {profile.nickname || 'Add a nickname'}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">{profile.roleLabel}</p>
              {profile.city ? <p className="mt-1 text-sm text-neutral-500">{profile.city}</p> : null}

              <button
                type="button"
                onClick={() => openEdit()}
                className="mt-5 w-full rounded-full bg-[#1B8A70] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#168F7A]"
              >
                Edit profile
              </button>
              <button
                type="button"
                onClick={() => setSignOutConfirmOpen(true)}
                className="mt-2 w-full rounded-full px-4 py-2 text-sm font-semibold text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-700"
              >
                Sign out
              </button>
            </section>
          </aside>

          <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
            <section className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200/90 sm:p-5">
              <ul className="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4">
                <StatBox
                  value={allTimeVisits.length}
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
                  value={checkinCount}
                  label="Check-ins"
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden>
                      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
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

            <section className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200/90 sm:p-5">
              <h2 className="font-['Poppins',sans-serif] text-[15px] font-semibold text-neutral-900 sm:text-base">About</h2>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                <AboutMeta
                  icon={
                    <>
                      <path d="M20 21a8 8 0 0 0-16 0" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="7" r="4" />
                    </>
                  }
                >
                  {profile.name}
                </AboutMeta>
                <AboutMeta
                  icon={
                    <>
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
                    </>
                  }
                >
                  {profile.email}
                </AboutMeta>
                <AboutMeta
                  icon={
                    <>
                      <path
                        d="M22 16.9v2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h2a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16.9Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  }
                >
                  {profile.phone || 'Add phone in Edit profile'}
                </AboutMeta>
                <AboutMeta
                  icon={
                    <>
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="10" r="3" />
                    </>
                  }
                >
                  {profile.city || 'Add city in Edit profile'}
                </AboutMeta>
                <AboutMeta
                  icon={
                    <>
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M16 3v4M8 3v4M3 11h18" strokeLinecap="round" />
                    </>
                  }
                >
                  {birthdayLabel || 'Add birthday in Edit profile'}
                </AboutMeta>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200/90 sm:p-5">
              <h2 className="font-['Poppins',sans-serif] text-[15px] font-semibold text-neutral-900 sm:text-base">
                Account settings
              </h2>
              <div className="mt-1 divide-y divide-neutral-100">
                <SettingsRow
                  to="/notifications"
                  title="Notifications"
                  hint="Alerts from LGUs and your trips"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden>
                      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3s3-2 3-9" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10 21a2 2 0 0 0 4 0" strokeLinecap="round" />
                    </svg>
                  }
                />
                <SettingsRow
                  to="/profile/privacy"
                  title="Privacy"
                  hint="How your account and lists are shown"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden>
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
                    </svg>
                  }
                />
                <SettingsRow
                  title="Change password"
                  hint="Update the password for this email"
                  onClick={() => openEdit({ focusPassword: true })}
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden>
                      <path d="M12 17v.01" strokeLinecap="round" />
                      <path d="M7 11V8a5 5 0 0 1 10 0v3" strokeLinecap="round" />
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                    </svg>
                  }
                />
              </div>
            </section>

            <Link
              to="/profile/history"
              className="group flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-neutral-200/90 transition hover:ring-neutral-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] sm:p-5"
            >
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1F7F6] text-[#1B8A70]">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-['Poppins',sans-serif] text-[15px] font-semibold text-neutral-900 sm:text-base">
                  Travel history
                </span>
                <span className="mt-1 block text-sm text-neutral-600">Places you have reached and checked in.</span>
                <span className="mt-2 block text-sm leading-relaxed text-neutral-500">
                  Open a timeline of destinations, reviews, and visits from this account.
                </span>
              </span>
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition group-hover:bg-[#1B8A70] group-hover:text-white">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </main>

      {signOutConfirmOpen ? (
        <DialogShell labelledBy="sign-out-title" onBackdrop={() => !signingOut && setSignOutConfirmOpen(false)}>
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
              className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-200"
              disabled={signingOut}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="rounded-xl bg-[#1B8A70] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#168F7A] disabled:opacity-60"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </DialogShell>
      ) : null}

      {editOpen ? (
        <DialogShell labelledBy="edit-profile-title" wide>
          <p id="edit-profile-title" className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">
            Edit profile
          </p>
          <label className="mt-4 block text-xs font-semibold text-neutral-600" htmlFor="pf-nick">
            Nickname
          </label>
          <input id="pf-nick" value={editNickname} onChange={(e) => setEditNickname(e.target.value)} className={inputClass} />
          <label className="mt-3 block text-xs font-semibold text-neutral-600" htmlFor="pf-email">
            Email
          </label>
          <input
            id="pf-email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            type="email"
            autoComplete="email"
            className={inputClass}
          />
          <p className="mt-1.5 text-[11px] text-neutral-500">
            Google and email accounts can change address here. If you change email, confirm the link we send to the new inbox.
          </p>
          <label className="mt-3 block text-xs font-semibold text-neutral-600" htmlFor="pf-phone">
            Phone
          </label>
          <input
            id="pf-phone"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            type="tel"
            autoComplete="tel"
            placeholder="09xx xxx xxxx"
            className={inputClass}
          />
          <label className="mt-3 block text-xs font-semibold text-neutral-600" htmlFor="pf-city">
            City
          </label>
          <input
            id="pf-city"
            value={editCity}
            onChange={(e) => setEditCity(e.target.value)}
            autoComplete="address-level2"
            placeholder="e.g. Tagaytay City"
            className={inputClass}
          />
          <label className="mt-3 block text-xs font-semibold text-neutral-600" htmlFor="pf-birthday">
            Birthday
          </label>
          <input
            id="pf-birthday"
            value={editBirthday}
            onChange={(e) => setEditBirthday(e.target.value)}
            type="date"
            className={inputClass}
          />

          <div id="pf-password-block" className="mt-5 border-t border-neutral-100 pt-4">
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
              className={inputClass}
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
              className={inputClass}
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
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => void changePassword()}
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-neutral-100 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-200 disabled:opacity-50"
            >
              {changingPassword ? 'Updating password…' : 'Update password'}
            </button>
          </div>

          {profile.hasCustomPhoto ? (
            <button
              type="button"
              onClick={openRemoveAvatarConfirm}
              disabled={busy}
              className="mt-4 w-full rounded-xl bg-red-50 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            >
              {uploading ? 'Removing…' : 'Remove profile photo'}
            </button>
          ) : null}

          <div className="mt-5 border-t border-neutral-100 pt-4">
            <button
              type="button"
              onClick={() => setDeleteAccountConfirmOpen(true)}
              disabled={busy}
              className="w-full rounded-xl bg-red-50 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
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
              className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-200"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveEdits()}
              disabled={busy}
              className="rounded-xl bg-[#1B8A70] px-4 py-2 text-sm font-semibold text-white hover:bg-[#168F7A] disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </DialogShell>
      ) : null}

      {passwordSuccessOpen ? (
        <DialogShell
          labelledBy="password-success-title"
          layer="z-[1003]"
          onBackdrop={() => setPasswordSuccessOpen(false)}
        >
          <p id="password-success-title" className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">
            {CHANGE_PASSWORD_SUCCESS_TITLE}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">{CHANGE_PASSWORD_SUCCESS_MESSAGE}</p>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => setPasswordSuccessOpen(false)}
              className="rounded-xl bg-[#1B8A70] px-4 py-2 text-sm font-semibold text-white hover:bg-[#168F7A]"
            >
              OK
            </button>
          </div>
        </DialogShell>
      ) : null}

      {deleteAccountConfirmOpen ? (
        <DialogShell
          labelledBy="delete-account-title"
          layer="z-[1002]"
          onBackdrop={() => !deletingAccount && setDeleteAccountConfirmOpen(false)}
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
              className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-200"
              disabled={deletingAccount}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void deleteAccount()}
              disabled={deletingAccount}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {deletingAccount ? 'Deleting…' : 'Delete account'}
            </button>
          </div>
        </DialogShell>
      ) : null}

      {removeAvatarConfirmOpen ? (
        <DialogShell
          labelledBy="remove-avatar-title"
          layer="z-[1001]"
          onBackdrop={() => !uploading && setRemoveAvatarConfirmOpen(false)}
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
              className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-200"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void removeAvatar()}
              disabled={uploading}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {uploading ? 'Removing…' : 'Remove photo'}
            </button>
          </div>
        </DialogShell>
      ) : null}
    </div>
  );
}
