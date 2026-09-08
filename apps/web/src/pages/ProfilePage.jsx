import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CHANGE_PASSWORD_MIN_LENGTH,
  CHANGE_PASSWORD_SUCCESS_MESSAGE,
  CHANGE_PASSWORD_SUCCESS_TITLE,
} from 'cavitour-shared/changePassword';
import { AppHeader } from '../components/AppHeader';
import { CaviteVisitMap } from '../components/CaviteVisitMap';
import {
  getItineraryStartsCount,
  ITINERARY_STARTS_UPDATED_EVENT,
} from '../lib/itineraryStartsActivity';
import { fetchLocationOptions } from '../lib/lguFilterOptions';
import { isItinerarySavedItem, SAVED_LISTS_UPDATED_EVENT } from '../lib/savedPlaces';
import { fetchSavedListsForUser } from '../lib/savedPlacesSupabase';
import { supabase } from '../lib/supabase';
import { fetchProfileActivity } from '../lib/profileActivity';
import { BIO_MAX_LENGTH, TRAVELER_INTEREST_TAGS } from '../lib/travelerInterests';
import {
  canRemoveAvatar,
  countSavedPlaces,
  deleteOwnAccount,
  deriveProfile,
  displayBirthday,
  fetchProfileRow,
  removeUserAvatar,
  removeUserCover,
  saveProfileIdentity,
  updateAccountPassword,
  uploadUserAvatar,
  uploadUserCover,
  usernameForRow,
} from '../lib/travelerProfile';

const inputClass =
  'mt-1.5 h-11 w-full rounded-xl bg-neutral-50 px-3 text-sm text-neutral-900 outline-none ring-1 ring-neutral-200/90 focus:ring-2 focus:ring-[#1B8A70]/30';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80';

function formatVisitDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const d = raw.length <= 10 ? new Date(`${raw}T00:00:00`) : new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function AboutMeta({ icon, children }) {
  return (
    <p className="flex min-w-0 w-full items-start gap-2.5 text-left text-sm text-neutral-600">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#1B8A70]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        {icon}
      </svg>
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}

function StarRating({ rating, size = 'h-3.5 w-3.5' }) {
  const n = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`${size} ${i <= n ? 'text-[#1B8A70]' : 'text-neutral-200'}`}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="m12 3 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.8 7.2 17.9l.9-5.4L4.2 8.7l5.4-.8L12 3Z" />
        </svg>
      ))}
    </span>
  );
}

function StatBox({ icon, value, label, onClick, to }) {
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#1B8A70] ring-1 ring-neutral-200/90">
        {icon}
      </span>
      <span className="min-w-0 text-left">
        <span className="block font-['Poppins',sans-serif] text-lg font-semibold leading-tight text-neutral-900">{value}</span>
        <span className="block text-xs text-neutral-500">{label}</span>
      </span>
    </>
  );
  const className =
    'flex min-w-0 w-full items-center gap-3 rounded-xl bg-neutral-50 px-3 py-3 text-left transition hover:bg-[#F1F7F6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B8A70]/40';
  if (to) {
    return (
      <li className="min-w-0">
        <Link to={to} className={className}>
          {content}
        </Link>
      </li>
    );
  }
  if (onClick) {
    return (
      <li className="min-w-0">
        <button type="button" onClick={onClick} className={className}>
          {content}
        </button>
      </li>
    );
  }
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-xl bg-neutral-50 px-3 py-3">
      {content}
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
        className={`w-full rounded-2xl bg-white p-5 shadow-xl ring-1 ring-neutral-200/90 ${wide ? 'max-h-[90vh] max-w-lg overflow-y-auto' : 'max-w-sm'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function EmptyPanel({ title, description, ctaLabel, ctaTo }) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-xl bg-neutral-50 px-4 py-8 text-center">
      <svg className="h-14 w-14 text-[#1B8A70]/70" viewBox="0 0 64 64" fill="none" aria-hidden>
        <circle cx="32" cy="32" r="28" fill="#E8F5F1" />
        <path
          d="M32 18c-6 0-11 5-11 12 0 9 11 18 11 18s11-9 11-18c0-7-5-12-11-12Z"
          stroke="#1B8A70"
          strokeWidth="2"
          fill="#D4EFE8"
        />
        <circle cx="32" cy="30" r="4" fill="#1B8A70" />
      </svg>
      <p className="mt-3 text-sm font-semibold text-neutral-800">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-neutral-500">{description}</p>
      {ctaLabel && ctaTo ? (
        <Link
          to={ctaTo}
          className="mt-4 inline-flex rounded-full bg-[#1B8A70] px-4 py-2 text-sm font-semibold text-white hover:bg-[#168F7A]"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

function LocationCombobox({ id, value, onChange, disabled }) {
  const rootRef = useRef(null);
  const inputWrapRef = useRef(null);
  const listRef = useRef(null);
  const [query, setQuery] = useState(value || '');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [menuBox, setMenuBox] = useState(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchLocationOptions().then((rows) => {
      if (cancelled) return;
      setOptions(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const syncMenuBox = () => {
    const el = inputWrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const preferUp = spaceBelow < 220 && r.top > spaceBelow;
    setMenuBox({
      left: r.left,
      width: r.width,
      top: preferUp ? undefined : r.bottom + 6,
      bottom: preferUp ? window.innerHeight - r.top + 6 : undefined,
    });
  };

  useEffect(() => {
    if (!open) return undefined;
    syncMenuBox();
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    const onReposition = () => syncMenuBox();
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${highlight}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const pick = (label) => {
    setQuery(label);
    onChange(label);
    setOpen(false);
  };

  const commitTyped = () => {
    const exact = options.find((o) => o.label.toLowerCase() === query.trim().toLowerCase());
    if (exact) pick(exact.label);
    else setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <div ref={inputWrapRef} className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#1B8A70]" aria-hidden>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </span>
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[highlight] ? `${id}-opt-${highlight}` : undefined}
          value={query}
          disabled={disabled}
          autoComplete="off"
          placeholder={loading ? 'Loading locations…' : 'Search Cavite location'}
          className={`${inputClass} pl-9 pr-10`}
          onFocus={() => {
            if (!disabled) {
              setOpen(true);
              requestAnimationFrame(syncMenuBox);
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
            requestAnimationFrame(syncMenuBox);
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              requestAnimationFrame(syncMenuBox);
              setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (open && filtered[highlight]) pick(filtered[highlight].label);
              else commitTyped();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setOpen(false);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => {
              if (
                !rootRef.current?.contains(document.activeElement) &&
                !listRef.current?.contains(document.activeElement)
              ) {
                commitTyped();
              }
            }, 120);
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={open ? 'Close location list' : 'Open location list'}
          className="absolute inset-y-0 right-1.5 flex w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-[#1B8A70] disabled:opacity-50"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (disabled) return;
            setOpen((v) => {
              const next = !v;
              if (next) requestAnimationFrame(syncMenuBox);
              return next;
            });
          }}
        >
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && !disabled && menuBox ? (
        <div
          id={`${id}-listbox`}
          role="listbox"
          ref={listRef}
          style={{
            position: 'fixed',
            left: menuBox.left,
            width: menuBox.width,
            top: menuBox.top,
            bottom: menuBox.bottom,
            zIndex: 1100,
          }}
          className="max-h-52 overflow-y-auto rounded-xl border border-[#1B8A70]/15 bg-white py-1.5 shadow-[0_16px_40px_-12px_rgba(15,40,35,0.28)]"
        >
          {loading ? (
            <p className="px-3 py-2.5 text-sm text-neutral-500">Loading Cavite locations…</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-neutral-500">No matching location</p>
          ) : (
            filtered.map((o, idx) => {
              const active = idx === highlight;
              const selected = o.label === value;
              return (
                <button
                  key={o.key}
                  id={`${id}-opt-${idx}`}
                  type="button"
                  role="option"
                  data-idx={idx}
                  aria-selected={selected}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${
                    active ? 'bg-[#E8F5F1] text-[#0F5C4C]' : 'text-neutral-800 hover:bg-[#F1F7F6]'
                  }`}
                  onMouseEnter={() => setHighlight(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o.label)}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                      selected || active ? 'bg-[#1B8A70] text-white' : 'bg-neutral-100 text-neutral-500'
                    }`}
                    aria-hidden
                  >
                    {o.label.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{o.label}</span>
                  {selected ? (
                    <svg
                      className="h-4 w-4 shrink-0 text-[#1B8A70]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden
                    >
                      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => deriveProfile(null, null));
  const [userId, setUserId] = useState('');
  const [itineraryStartsRefresh, setItineraryStartsRefresh] = useState(0);
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
  const [editBio, setEditBio] = useState('');
  const [editInterests, setEditInterests] = useState([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccessOpen, setPasswordSuccessOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [checkinsOpen, setCheckinsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [checkinCount, setCheckinCount] = useState(0);
  const [accountSavedLists, setAccountSavedLists] = useState([]);
  const [visits, setVisits] = useState([]);

  const itinerariesUsedCount = useMemo(() => {
    void itineraryStartsRefresh;
    return getItineraryStartsCount(userId);
  }, [userId, itineraryStartsRefresh]);

  useEffect(() => {
    let cancelled = false;
    const loadActivity = async () => {
      if (!userId) {
        if (!cancelled) {
          setReviewCount(0);
          setReviews([]);
          setCheckinCount(0);
          setAccountSavedLists([]);
          setVisits([]);
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
          setReviews(activity.reviews ?? []);
          setCheckinCount(activity.checkinCount);
          setAccountSavedLists(lists);
          setVisits(activity.visits ?? []);
        }
      } catch {
        if (!cancelled) {
          setReviewCount(0);
          setReviews([]);
          setCheckinCount(0);
          setAccountSavedLists([]);
          setVisits([]);
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
      setActivityRefresh((n) => n + 1);
    };
    const onItineraryStartsUpdated = () => {
      setItineraryStartsRefresh((n) => n + 1);
    };

    void loadProfile();
    window.addEventListener(SAVED_LISTS_UPDATED_EVENT, onActivityUpdated);
    window.addEventListener(ITINERARY_STARTS_UPDATED_EVENT, onItineraryStartsUpdated);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      void applyUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      window.removeEventListener(SAVED_LISTS_UPDATED_EVENT, onActivityUpdated);
      window.removeEventListener(ITINERARY_STARTS_UPDATED_EVENT, onItineraryStartsUpdated);
      subscription.unsubscribe();
    };
  }, []);

  const savedPlaceCount = useMemo(() => countSavedPlaces(accountSavedLists), [accountSavedLists]);

  const publicSavedLists = useMemo(() => {
    return (accountSavedLists ?? [])
      .filter((list) => list?.privacy === 'public')
      .map((list) => {
        const items = Array.isArray(list.items) ? list.items : [];
        const coverItem =
          items.find((item) => !isItinerarySavedItem(item) && String(item.image ?? item.imageUrl ?? '').trim()) ||
          items.find((item) => String(item.image ?? item.imageUrl ?? '').trim()) ||
          null;
        const cover = coverItem
          ? String(coverItem.image ?? coverItem.imageUrl ?? '').trim() || PLACEHOLDER_IMG
          : PLACEHOLDER_IMG;
        const placeCount = items.filter((item) => !isItinerarySavedItem(item)).length;
        const itineraryCount = items.length - placeCount;
        return {
          id: String(list.id ?? list.name ?? ''),
          name: String(list.name ?? '').trim() || 'Saved list',
          itemCount: items.length,
          placeCount,
          itineraryCount,
          cover,
        };
      })
      .filter((list) => list.id);
  }, [accountSavedLists]);

  const openEdit = () => {
    setEditNickname(profile.nickname || profile.name || '');
    setEditEmail(profile.email === 'No email on account' ? '' : profile.email);
    setEditPhone(profile.phone || '');
    setEditCity(profile.city || '');
    setEditBirthday(profile.birthday || '');
    setEditBio(profile.bio || '');
    setEditInterests([...(profile.interestTags || [])]);
    setEditOpen(true);
  };

  const openSecurity = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSecurityOpen(true);
  };

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
        bio: editBio,
        interestTags: editInterests,
        socialInstagram: profile.socialInstagram || '',
        socialFacebook: profile.socialFacebook || '',
        socialTiktok: profile.socialTiktok || '',
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

  const onCoverChange = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const result = await uploadUserCover(supabase, file, usernameForRow(profile, data?.user));
      setProfile(deriveProfile(result.user, result.profileRow));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Cover upload failed.');
    } finally {
      setUploading(false);
      input.value = '';
    }
  };

  const removeCover = async () => {
    setUploading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const result = await removeUserCover(supabase, usernameForRow(profile, data?.user));
      setProfile(deriveProfile(result.user, result.profileRow));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not remove cover photo.');
    } finally {
      setUploading(false);
    }
  };

  const toggleInterest = (tag) => {
    setEditInterests((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
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
      setSecurityOpen(false);
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

                <h2 className="mt-4 font-['Poppins',sans-serif] text-xl font-semibold tracking-tight text-neutral-900">
                  {profile.nickname || 'Add a nickname'}
                </h2>
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

                <div className="mt-5 space-y-2.5 border-t border-neutral-100 pt-4 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">About</p>
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
                    {profile.city || 'Add location in Edit profile'}
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
              </div>
            </section>

            <section className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-neutral-200/90 sm:p-5">
              <h2 className="font-['Poppins',sans-serif] text-[15px] font-semibold text-neutral-900 sm:text-base">
                Account settings
              </h2>
              <div className="mt-1 divide-y divide-neutral-100">
                <SettingsRow
                  title="Account security"
                  hint="Password and account deletion"
                  onClick={() => openSecurity()}
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
          </aside>

          <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
            <section className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200/90 sm:p-5">
              <ul className="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4">
                <StatBox
                  value={checkinCount}
                  label="Destinations"
                  onClick={() => setCheckinsOpen(true)}
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
                  onClick={() => setReviewsOpen(true)}
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden>
                      <path d="m12 3 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.8 7.2 17.9l.9-5.4L4.2 8.7l5.4-.8L12 3Z" strokeLinejoin="round" />
                    </svg>
                  }
                />
                <StatBox
                  value={itinerariesUsedCount}
                  label="Itineraries used"
                  to="/itinerary"
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
                  to="/saved"
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
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-['Poppins',sans-serif] text-[15px] font-semibold text-neutral-900 sm:text-base">
                  Public lists
                </h2>
                <Link to="/saved" className="text-sm font-semibold text-[#1B8A70] hover:underline">
                  Manage
                </Link>
              </div>
              {publicSavedLists.length === 0 ? (
                <EmptyPanel
                  title="No public lists"
                  description="Mark a saved list as public so it shows on your profile."
                  ctaLabel="Go to Saved"
                  ctaTo="/saved"
                />
              ) : (
                <ul className="mt-4 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
                  {publicSavedLists.map((list) => (
                    <li key={list.id}>
                      <Link
                        to={`/saved?list=${encodeURIComponent(list.id)}`}
                        className="flex gap-3 rounded-xl p-2 transition hover:bg-neutral-50"
                      >
                        <img
                          src={list.cover}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-lg object-cover bg-neutral-100"
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
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
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
        <DialogShell labelledBy="edit-profile-title" wide onBackdrop={() => !busy && setEditOpen(false)}>
          <p id="edit-profile-title" className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">
            Edit profile
          </p>

          <div className="mt-4">
            <p className="text-xs font-semibold text-neutral-600">Profile photo</p>
            <div className="mt-2 flex items-center gap-3">
              <img src={profile.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-1 ring-neutral-200" />
              <div className="min-w-0 flex-1 space-y-2">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-3 text-center hover:bg-neutral-100">
                  <span className="text-xs font-semibold text-neutral-700">
                    {uploading ? 'Uploading…' : 'Upload photo'}
                  </span>
                  <span className="mt-0.5 text-[11px] text-neutral-500">JPG, PNG, or WebP · max 5 MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={busy}
                    onChange={onAvatarChange}
                  />
                </label>
                {profile.hasCustomPhoto ? (
                  <button
                    type="button"
                    onClick={openRemoveAvatarConfirm}
                    disabled={busy}
                    className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-neutral-600">Cover banner</p>
            <div className="mt-2 overflow-hidden rounded-xl ring-1 ring-neutral-200">
              <div
                className="h-24 w-full bg-gradient-to-br from-[#1B8A70] to-[#D4EFE8]"
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
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-200">
                {uploading ? 'Uploading…' : 'Upload cover'}
                <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={onCoverChange} />
              </label>
              {profile.coverUrl ? (
                <button
                  type="button"
                  onClick={() => void removeCover()}
                  disabled={busy}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Remove cover
                </button>
              ) : null}
            </div>
          </div>

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
            If you change email, confirm the link we send to the new inbox.
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
          <label className="mt-3 block text-xs font-semibold text-neutral-600" htmlFor="pf-location">
            Location
          </label>
          <LocationCombobox id="pf-location" value={editCity} onChange={setEditCity} disabled={busy} />
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
          <label className="mt-3 block text-xs font-semibold text-neutral-600" htmlFor="pf-bio">
            Short intro
          </label>
          <textarea
            id="pf-bio"
            value={editBio}
            onChange={(e) => setEditBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
            rows={3}
            placeholder="Exploring Cavite’s hidden coffee spots on weekends"
            className={`${inputClass} h-auto min-h-[5.5rem] resize-y py-2.5`}
          />
          <p className="mt-1 text-[11px] text-neutral-500">
            {editBio.length}/{BIO_MAX_LENGTH}
          </p>

          <p className="mt-4 text-xs font-semibold text-neutral-600">Travel interests</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TRAVELER_INTEREST_TAGS.map((tag) => {
              const on = editInterests.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  disabled={busy}
                  onClick={() => toggleInterest(tag)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition ${
                    on
                      ? 'bg-[#1B8A70] text-white ring-[#1B8A70]'
                      : 'bg-white text-neutral-600 ring-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
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

      {reviewsOpen ? (
        <DialogShell labelledBy="reviews-title" wide onBackdrop={() => setReviewsOpen(false)}>
          <div className="flex items-start justify-between gap-3">
            <p id="reviews-title" className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">
              Your reviews
            </p>
            <button
              type="button"
              onClick={() => setReviewsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
              aria-label="Close"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {reviews.length === 0 ? (
            <EmptyPanel
              title="No reviews yet"
              description="Rate places you’ve visited so others can discover Cavite with you."
              ctaLabel="Explore Destinations"
              ctaTo="/search"
            />
          ) : (
            <ul className="mt-4 max-h-[60vh] list-none space-y-3 overflow-y-auto p-0">
              {reviews.map((review) => (
                <li key={review.id}>
                  <Link
                    to={`/place/${encodeURIComponent(review.placeId)}`}
                    onClick={() => setReviewsOpen(false)}
                    className="block rounded-xl bg-neutral-50 p-3.5 ring-1 ring-neutral-200/80 transition hover:bg-[#F1F7F6] hover:ring-[#1B8A70]/25"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate font-['Poppins',sans-serif] text-sm font-semibold text-neutral-900">
                          {review.placeName}
                        </span>
                        <span className="mt-1 block text-xs text-neutral-500">
                          {formatVisitDate(review.createdAt)}
                        </span>
                      </span>
                      <StarRating rating={review.rating} />
                    </span>
                    {review.body ? (
                      <span className="mt-3 block border-t border-neutral-200/80 pt-3 text-sm leading-relaxed text-neutral-600">
                        {review.body}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DialogShell>
      ) : null}

      {checkinsOpen ? (
        <DialogShell labelledBy="checkins-title" wide onBackdrop={() => setCheckinsOpen(false)}>
          <div className="flex items-start justify-between gap-3">
            <p id="checkins-title" className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">
              Travel history
            </p>
            <button
              type="button"
              onClick={() => setCheckinsOpen(false)}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-neutral-500 hover:bg-neutral-100"
            >
              Close
            </button>
          </div>
          {visits.length === 0 ? (
            <EmptyPanel
              title="No visits yet"
              description="Reach a destination or check in to start your travel history across Cavite."
              ctaLabel="Explore Destinations"
              ctaTo="/search"
            />
          ) : (
            <ul className="mt-3 max-h-[60vh] list-none divide-y divide-neutral-100 overflow-y-auto p-0">
              {visits.map((visit) => (
                <li key={visit.id}>
                  <Link
                    to={`/place/${encodeURIComponent(visit.placeId)}`}
                    onClick={() => setCheckinsOpen(false)}
                    className="flex items-start justify-between gap-3 rounded-xl px-1 py-3 transition hover:bg-neutral-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-neutral-900">
                        {visit.placeName}
                      </span>
                      <span className="mt-0.5 block text-xs text-neutral-500">
                        {[visit.cityMun || 'Cavite', formatVisitDate(visit.createdAt)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        visit.checkedIn ? 'bg-[#D4EFE8] text-[#1B8A70]' : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {visit.checkedIn ? 'Checked in' : 'Reached'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DialogShell>
      ) : null}

      {securityOpen ? (
        <DialogShell labelledBy="security-title" wide onBackdrop={() => !busy && setSecurityOpen(false)}>
          <p id="security-title" className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">
            Account security
          </p>
          <p className="mt-1 text-sm text-neutral-500">Password and account deletion are managed here.</p>

          <div className="mt-4">
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
              className="mt-3 w-full rounded-xl bg-[#1B8A70] py-2 text-sm font-semibold text-white transition hover:bg-[#168F7A] disabled:opacity-50"
            >
              {changingPassword ? 'Updating password…' : 'Update password'}
            </button>
          </div>

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

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => setSecurityOpen(false)}
              className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-200"
              disabled={busy}
            >
              Close
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
