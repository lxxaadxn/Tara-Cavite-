import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  CHANGE_PASSWORD_MIN_LENGTH,
  changePasswordWithSupabase,
} from 'cavitour-shared/changePassword';
import crud from '../components/ContentCrudPage.module.css';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { adminAccountFromUser, formatAdminTimestamp } from '../lib/adminAccount';
import {
  readAdminPreferences,
  removeAdminAvatar,
  saveAdminPreferences,
  updateAdminEmail,
  updateAdminProfile,
  uploadAdminAvatar,
  type AdminPreferences,
} from '../lib/adminProfile';
import { supabase } from '../lib/supabase';
import styles from './Profile.module.css';

const PREFERENCE_ROWS: { key: keyof AdminPreferences; label: string; desc: string }[] = [
  {
    key: 'establishmentAnnouncements',
    label: 'Establishment announcements',
    desc: 'When an establishment posts an announcement',
  },
  {
    key: 'establishmentActivations',
    label: 'Establishment application activation',
    desc: 'When an establishment sets a password for their invite',
  },
];

export function Profile() {
  const { session } = useAuth();
  const toast = useToast();
  const user = session?.user ?? null;
  const account = adminAccountFromUser(user);

  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const savedPrefs = useMemo(() => readAdminPreferences(user), [user]);
  const [prefs, setPrefs] = useState<AdminPreferences>(savedPrefs);

  useEffect(() => {
    setPrefs(savedPrefs);
  }, [savedPrefs]);

  const togglePref = async (key: keyof AdminPreferences) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await saveAdminPreferences(supabase, next);
    } catch (err) {
      setPrefs(prefs);
      toast(err instanceof Error ? err.message : 'Could not save preference', 'error');
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <div className={styles.identity}>
          <div className={styles.avatarWrap}>
            {account.avatarUrl ? (
              <img className={styles.avatarImg} src={account.avatarUrl} alt="" />
            ) : (
              <div className={styles.avatar}>{account.initials}</div>
            )}
          </div>

          <div className={styles.identityMeta}>
            <div className={styles.nameRow}>
              <h3 className={styles.name}>{account.displayName}</h3>
              <span className={styles.pill}>
                <span className={styles.pillDot} aria-hidden />
                Active
              </span>
            </div>
            <span className={styles.role}>{account.role}</span>
          </div>

          <button
            type="button"
            className={`${crud.primaryBtn} ${styles.identityAction}`}
            onClick={() => setEditOpen(true)}
          >
            Edit profile
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.fields}>
          <div className={styles.row}>
            <span className={styles.label}>Email</span>
            <p className={styles.value}>{account.email}</p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Department / Office</span>
            <p className={`${styles.value} ${account.department ? '' : styles.valueMuted}`}>
              {account.department || 'Not set'}
            </p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Account</span>
            <p className={styles.value}>Tara, Cavite! Admin</p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Last sign in</span>
            <p className={styles.value}>{formatAdminTimestamp(account.lastSignIn)}</p>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Security</h2>
        </div>
        <div className={styles.settingRow}>
          <div className={styles.settingText}>
            <span className={styles.settingLabel}>Password</span>
            <p className={styles.settingDesc}>
              At least {CHANGE_PASSWORD_MIN_LENGTH} characters. You will confirm your current password first.
            </p>
          </div>
          <button type="button" className={crud.actionBtn} onClick={() => setPasswordOpen(true)}>
            Change password
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <h2 className={styles.cardTitle}>Notifications</h2>
            <p className={styles.cardHint}>Saved to your admin account as you change them</p>
          </div>
        </div>
        {PREFERENCE_ROWS.map((row) => (
          <div key={row.key} className={styles.settingRow}>
            <div className={styles.settingText}>
              <span className={styles.settingLabel}>{row.label}</span>
              <p className={styles.settingDesc}>{row.desc}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[row.key]}
              aria-label={row.label}
              className={`${styles.toggle} ${prefs[row.key] ? styles.toggleOn : ''}`}
              onClick={() => void togglePref(row.key)}
            >
              <span className={styles.knob} />
            </button>
          </div>
        ))}
      </section>

      {editOpen ? (
        <EditProfileModal
          displayName={account.displayName}
          department={account.department}
          email={user?.email ?? ''}
          avatarUrl={account.avatarUrl}
          initials={account.initials}
          onClose={() => setEditOpen(false)}
        />
      ) : null}

      {passwordOpen ? (
        <ChangePasswordModal email={user?.email ?? ''} onClose={() => setPasswordOpen(false)} />
      ) : null}
    </div>
  );
}

function EditProfileModal({
  displayName,
  department,
  email,
  avatarUrl,
  initials,
  onClose,
}: {
  displayName: string;
  department: string;
  email: string;
  avatarUrl: string;
  initials: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ displayName, department, email });
  // The session refresh lags the upload, so the preview tracks its own copy.
  const [photo, setPhoto] = useState(avatarUrl);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickAvatar = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    try {
      setPhoto(await uploadAdminAvatar(supabase, file));
      toast('Profile photo updated', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not upload photo', 'error');
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const dropAvatar = async () => {
    setPhotoBusy(true);
    try {
      await removeAdminAvatar(supabase);
      setPhoto('');
      toast('Profile photo removed', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not remove photo', 'error');
    } finally {
      setPhotoBusy(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAdminProfile(supabase, {
        displayName: form.displayName,
        department: form.department,
      });
      const emailPending = await updateAdminEmail(supabase, form.email);
      toast(
        emailPending
          ? `Profile saved. Confirm the link sent to ${form.email.trim().toLowerCase()} to finish the email change.`
          : 'Profile updated',
        'success'
      );
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={crud.overlay}
      role="presentation"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <form
        className={crud.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-profile-edit"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void submit(e)}
      >
        <h2 id="admin-profile-edit">Edit profile</h2>

        <div className={styles.modalAvatarRow}>
          {photo ? (
            <img className={styles.modalAvatarImg} src={photo} alt="" />
          ) : (
            <div className={styles.modalAvatar}>{initials}</div>
          )}
          <div className={styles.modalAvatarText}>
            <div className={styles.modalAvatarBtns}>
              <button
                type="button"
                className={crud.actionBtn}
                onClick={() => fileRef.current?.click()}
                disabled={photoBusy || saving}
              >
                {photoBusy ? 'Working…' : photo ? 'Change photo' : 'Upload photo'}
              </button>
              {photo ? (
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => void dropAvatar()}
                  disabled={photoBusy || saving}
                >
                  Remove
                </button>
              ) : null}
            </div>
            <p className={styles.avatarNote}>JPG, PNG, or WebP up to 5 MB.</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void pickAvatar(e.target.files?.[0])}
          />
        </div>

        <div className={crud.formGrid}>
          <label className={`${crud.field} ${crud.spanFull}`}>
            <span>
              Display name<span className={crud.req} aria-hidden>*</span>
            </span>
            <input
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              disabled={saving}
              required
              autoFocus
            />
          </label>
          <label className={`${crud.field} ${crud.spanFull}`}>
            Department / Office
            <input
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              placeholder="e.g. Provincial Tourism Office"
              disabled={saving}
            />
          </label>
          <label className={`${crud.field} ${crud.spanFull}`}>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              disabled={saving}
            />
            <span className={crud.fieldHelp}>
              Changing this sends a confirmation link to the new address before it takes effect.
            </span>
          </label>
        </div>

        <div className={crud.modalActions}>
          <span className={crud.modalActionsSpacer} aria-hidden />
          <div className={crud.modalActionsRight}>
            <button type="button" className={crud.actionBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={crud.primaryBtn} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ChangePasswordModal({ email, onClose }: { email: string; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await changePasswordWithSupabase(supabase, { email, ...form });
      toast('Password updated', 'success');
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={crud.overlay}
      role="presentation"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <form
        className={crud.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-password-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void submit(e)}
      >
        <h2 id="admin-password-title">Change password</h2>

        <div className={crud.formGrid}>
          <label className={`${crud.field} ${crud.spanFull}`}>
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
              disabled={saving}
              required
              autoFocus
            />
          </label>
          <label className={`${crud.field} ${crud.spanFull}`}>
            New password
            <input
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
              disabled={saving}
              required
            />
            <span className={crud.fieldHelp}>At least {CHANGE_PASSWORD_MIN_LENGTH} characters.</span>
          </label>
          <label className={`${crud.field} ${crud.spanFull}`}>
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              disabled={saving}
              required
            />
          </label>
        </div>

        <div className={crud.modalActions}>
          <span className={crud.modalActionsSpacer} aria-hidden />
          <div className={crud.modalActionsRight}>
            <button type="button" className={crud.actionBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={crud.primaryBtn} disabled={saving}>
              {saving ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
