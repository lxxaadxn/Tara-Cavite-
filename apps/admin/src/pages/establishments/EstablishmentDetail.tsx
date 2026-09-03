import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAdminPathPrefix } from '../../contexts/AdminPathPrefixContext';
import { usePageHeader } from '../../contexts/PageHeaderContext';
import { useToast } from '../../components/Toast';
import {
  type AdminEstablishment,
  establishmentSetupRedirect,
  fetchAdminEstablishment,
  formatAdminDate,
  inviteEstablishment,
  isPendingSetup,
  setEstablishmentAccountStatus,
  setEstablishmentPublicVisible,
  updateEstablishmentProfile,
  verificationLabel,
} from '../../lib/adminEstablishments';
import { supabase } from '../../lib/supabase';
import shared from '../users/UsersAdmin.module.css';
import styles from './EstablishmentDetail.module.css';

function StatusBadge({ row }: { row: AdminEstablishment }) {
  if (row.accountStatus === 'disabled') {
    return <span className={`${shared.badge} ${shared.tone_red}`}>Deactivated</span>;
  }
  if (isPendingSetup(row)) {
    return <span className={`${shared.badge} ${shared.tone_amber}`}>Pending setup</span>;
  }
  return <span className={`${shared.badge} ${shared.tone_green}`}>Active</span>;
}

function RecognitionBadge({ row }: { row: AdminEstablishment }) {
  if (row.accountStatus === 'disabled') {
    return <span className={`${shared.badge} ${shared.tone_neutral}`}>—</span>;
  }
  const tone =
    row.verificationStatus === 'approved'
      ? shared.tone_green
      : row.verificationStatus === 'rejected' || row.verificationStatus === 'suspended'
        ? shared.tone_red
        : isPendingSetup(row)
          ? shared.tone_amber
          : shared.tone_neutral;
  return <span className={`${shared.badge} ${tone}`}>{verificationLabel(row.verificationStatus)}</span>;
}

function VisibilityBadge({ row }: { row: AdminEstablishment }) {
  if (row.publicVisible) return <span className={`${shared.badge} ${shared.tone_green}`}>Public</span>;
  return <span className={`${shared.badge} ${shared.tone_neutral}`}>Hidden</span>;
}

function backHref(prefix: string, row: AdminEstablishment | null): string {
  const base = prefix ? `${prefix.replace(/\/$/, '')}` : '';
  if (!row) return `${base}/web/establishments`;
  if (row.accountStatus === 'disabled') return `${base}/web/establishments/deactivated`;
  if (isPendingSetup(row)) return `${base}/web/establishments/pending`;
  return `${base}/web/establishments`;
}

function placeLine(row: AdminEstablishment): string {
  return [row.businessType, row.lgu].filter(Boolean).join(' · ') || 'No category or LGU yet';
}

export function EstablishmentDetail() {
  const { ownerId = '' } = useParams();
  const toast = useToast();
  const prefix = useAdminPathPrefix();

  const [row, setRow] = useState<AdminEstablishment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: '',
    businessType: '',
    lgu: '',
    address: '',
    fullName: '',
    phone: '',
    email: '',
  });
  const [confirm, setConfirm] = useState<null | 'deactivate'>(null);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [resending, setResending] = useState(false);

  usePageHeader(row?.businessName || 'Establishment', null);

  const reload = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchAdminEstablishment(supabase, ownerId);
      setRow(next);
      if (!next) {
        setError('Establishment not found.');
        return;
      }
      setForm({
        businessName: next.businessName,
        businessType: next.businessType,
        lgu: next.lgu,
        address: next.address,
        fullName: next.fullName,
        phone: next.phone,
        email: next.email,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load establishment');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const runDeactivate = async () => {
    if (!row) return;
    setSaving(true);
    try {
      await setEstablishmentAccountStatus(supabase, row.id, 'disabled');
      toast('Account deactivated', 'success');
      setConfirm(null);
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!row) return;
    setSavingProfile(true);
    try {
      await updateEstablishmentProfile(supabase, row.id, form);
      toast('Profile updated', 'success');
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const activate = async () => {
    if (!row) return;
    try {
      await setEstablishmentAccountStatus(supabase, row.id, 'active');
      toast('Account activated', 'success');
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not activate', 'error');
    }
  };

  const togglePublic = async (next: boolean) => {
    if (!row) return;
    try {
      await setEstablishmentPublicVisible(supabase, row.id, next);
      toast(next ? 'Listing can be shown publicly' : 'Listing hidden from the public', 'success');
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update visibility', 'error');
    }
  };

  const resendInvite = async () => {
    if (!row) return;
    setResending(true);
    try {
      await inviteEstablishment(
        supabase,
        {
          businessName: row.businessName,
          email: row.email,
          fullName: row.fullName,
          businessType: row.businessType,
          address: row.address,
          lgu: row.lgu,
          phone: row.phone,
        },
        establishmentSetupRedirect(),
        true
      );
      toast('Setup email sent again', 'success');
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not resend invitation', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.page}>
      <Link to={backHref(prefix, row)} className={styles.backLink}>
        ← Back to list
      </Link>

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p className={styles.status}>Loading establishment…</p> : null}

      {row ? (
        <article className={styles.dossier}>
          <header className={styles.mast}>
            {row.avatarUrl ? (
              <img className={styles.avatarImg} src={row.avatarUrl} alt="" />
            ) : (
              <div className={styles.avatar}>{row.initials}</div>
            )}
            <div className={styles.mastCopy}>
              <span className={styles.eyebrow}>Establishment account</span>
              <h2 className={styles.name}>{row.businessName}</h2>
              <p className={styles.meta}>{placeLine(row)}</p>
            </div>
            <div className={styles.stamps} aria-label="Account status">
              <div className={styles.stamp}>
                <span className={styles.stampLabel}>Account</span>
                <StatusBadge row={row} />
              </div>
              <div className={styles.stamp}>
                <span className={styles.stampLabel}>Recognition</span>
                <RecognitionBadge row={row} />
              </div>
              <div className={styles.stamp}>
                <span className={styles.stampLabel}>Listing</span>
                <VisibilityBadge row={row} />
              </div>
            </div>
          </header>

          <div className={styles.body}>
            <p className={styles.hint}>
              Edit the listing details below. Email stays with the invited login. You control whether
              this account can sign in and whether the listing is public.
            </p>

            <div className={styles.grid}>
              <label className={styles.field}>
                <span className={styles.label}>Establishment name</span>
                <input
                  className={styles.input}
                  value={form.businessName}
                  onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Contact person</span>
                <input
                  className={styles.input}
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Email</span>
                <input className={styles.input} value={form.email} readOnly />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Phone</span>
                <input
                  className={styles.input}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Category</span>
                <input
                  className={styles.input}
                  value={form.businessType}
                  onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>City / Municipality</span>
                <input
                  className={styles.input}
                  value={form.lgu}
                  onChange={(e) => setForm((f) => ({ ...f, lgu: e.target.value }))}
                />
              </label>
              <label className={`${styles.field} ${styles.span2}`}>
                <span className={styles.label}>Address</span>
                <textarea
                  className={styles.textarea}
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  rows={3}
                />
              </label>
            </div>

            <div className={styles.facts}>
              <div>
                <span className={styles.factLabel}>Invited</span>
                <p className={styles.factValue}>{formatAdminDate(row.invitedAt || row.createdAt)}</p>
              </div>
              <div>
                <span className={styles.factLabel}>Password setup</span>
                <p className={styles.factValue}>
                  {row.setupCompletedAt ? formatAdminDate(row.setupCompletedAt) : 'Not completed yet'}
                </p>
              </div>
            </div>
          </div>

          <footer className={styles.toolbar}>
            <button
              type="button"
              className={shared.primaryBtn}
              disabled={savingProfile}
              onClick={() => void saveProfile()}
            >
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
            {isPendingSetup(row) ? (
              <button type="button" className={shared.actionBtn} disabled={resending} onClick={() => void resendInvite()}>
                {resending ? 'Sending…' : 'Resend invitation'}
              </button>
            ) : null}
            {row.setupCompletedAt && row.accountStatus === 'active' ? (
              row.publicVisible ? (
                <button type="button" className={shared.actionBtn} onClick={() => void togglePublic(false)}>
                  Hide from public
                </button>
              ) : (
                <button type="button" className={shared.actionBtn} onClick={() => void togglePublic(true)}>
                  Make publicly visible
                </button>
              )
            ) : null}
            <span className={styles.toolbarGrow} />
            {row.accountStatus === 'active' ? (
              <button
                type="button"
                className={`${shared.actionBtn} ${shared.danger}`}
                onClick={() => setConfirm('deactivate')}
              >
                Deactivate account
              </button>
            ) : (
              <button type="button" className={shared.actionBtn} onClick={() => void activate()}>
                Activate account
              </button>
            )}
          </footer>
        </article>
      ) : null}

      <ConfirmDialog
        open={confirm === 'deactivate'}
        title={row ? `Deactivate “${row.businessName}”?` : 'Deactivate account?'}
        message="The establishment will not be able to sign in until you activate the account again."
        confirmLabel="Deactivate"
        confirmingLabel="Deactivating…"
        confirming={saving}
        onConfirm={() => void runDeactivate()}
        onCancel={() => {
          if (!saving) setConfirm(null);
        }}
      />
    </div>
  );
}
