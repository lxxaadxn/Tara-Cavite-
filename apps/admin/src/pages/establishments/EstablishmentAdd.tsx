import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminPathPrefix } from '../../contexts/AdminPathPrefixContext';
import { useToast } from '../../components/Toast';
import {
  establishmentSetupRedirect,
  inviteEstablishment,
} from '../../lib/adminEstablishments';
import { fetchCitiesAdmin, type CityAdminRow } from '../../lib/staCitiesAdmin';
import { fetchStaLookups, type StaLookupOption } from '../../lib/staLookups';
import { supabase } from '../../lib/supabase';
import styles from '../users/UsersAdmin.module.css';

const emptyForm = {
  businessName: '',
  email: '',
  fullName: '',
  businessType: '',
  address: '',
  lgu: '',
  phone: '',
  googleMapsLink: '',
};

export function EstablishmentAdd() {
  const toast = useToast();
  const navigate = useNavigate();
  const prefix = useAdminPathPrefix();
  const withPrefix = (path: string) => (prefix ? `${prefix.replace(/\/$/, '')}${path}` : path);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<StaLookupOption[]>([]);
  const [cities, setCities] = useState<CityAdminRow[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([fetchStaLookups(supabase), fetchCitiesAdmin(supabase)])
      .then(([lookups, cityRows]) => {
        if (!active) return;
        setCategories(lookups.ntdpCategories);
        setCities(cityRows);
      })
      .catch(() => {
        /* dropdowns stay empty; admin can still type after we keep selects */
      });
    return () => {
      active = false;
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.email.trim()) {
      toast('Establishment name and email are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await inviteEstablishment(supabase, { ...form }, establishmentSetupRedirect());
      toast(`Invitation sent to ${form.email.trim().toLowerCase()}`, 'success');
      if (result.ownerId) {
        navigate(withPrefix(`/web/establishments/${result.ownerId}`), { replace: true });
      } else {
        navigate(withPrefix('/web/establishments/pending'), { replace: true });
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not send invitation', 'error');
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof emptyForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  return (
    <div className={styles.detailPage}>
      <Link to={withPrefix('/web/establishments')} className={styles.backLink}>
        ← Back to all establishments
      </Link>

      <form className={styles.card} onSubmit={(e) => void submit(e)}>
        <p className={styles.hint}>
          The Tourism Office decides which businesses are recognized. Enter the establishment details
          and email — they will receive an invitation to set their own password. You never set that
          password here.
        </p>

        <div className={styles.fields}>
          <div className={styles.row}>
            <span className={styles.label}>Establishment name</span>
            <input
              className={styles.textInput}
              value={form.businessName}
              onChange={(e) => field('businessName', e.target.value)}
              required
            />
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Establishment email</span>
            <input
              className={styles.textInput}
              type="email"
              value={form.email}
              onChange={(e) => field('email', e.target.value)}
              required
            />
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Contact person</span>
            <input className={styles.textInput} value={form.fullName} onChange={(e) => field('fullName', e.target.value)} />
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Phone (optional)</span>
            <input className={styles.textInput} value={form.phone} onChange={(e) => field('phone', e.target.value)} />
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Category</span>
            <select
              className={styles.selectInput}
              value={form.businessType}
              onChange={(e) => field('businessType', e.target.value)}
            >
              <option value="">—</option>
              {categories.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Address</span>
            <input className={styles.textInput} value={form.address} onChange={(e) => field('address', e.target.value)} />
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Google Maps link (optional)</span>
            <input
              className={styles.textInput}
              type="url"
              placeholder="https://www.google.com/maps/..."
              value={form.googleMapsLink}
              onChange={(e) => field('googleMapsLink', e.target.value)}
            />
            <p className={styles.hint} style={{ marginTop: 4 }}>
              Paste the Google Maps URL for this establishment. This is used to automatically assign a QR code.
            </p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>City / Municipality</span>
            <select className={styles.selectInput} value={form.lgu} onChange={(e) => field('lgu', e.target.value)}>
              <option value="">—</option>
              {cities.map((city) => (
                <option key={city.id} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Status</span>
            <p className={styles.value}>Invited — they set a password from the email link.</p>
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.primaryBtn} disabled={saving}>
            {saving ? 'Sending invitation…' : 'Send invitation'}
          </button>
        </div>
      </form>
    </div>
  );
}
