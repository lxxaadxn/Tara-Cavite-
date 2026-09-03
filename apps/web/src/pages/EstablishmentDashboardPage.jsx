import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchOwnAnnouncements,
  formatAnnouncementDateLabel,
} from 'cavitour-shared/announcements';
import { AdminBrandMark } from '@admin/components/AdminBrandMark';
import { supabase } from '../lib/supabase';
import {
  ESTABLISHMENT_SETUP_PATH,
  fetchOwnEstablishment,
  isEstablishmentDashboardReady,
  isEstablishmentPendingSetup,
} from '../lib/accountHome';
import styles from './EstablishmentPortal.module.css';

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'E';
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function defaultPlace(owner) {
  if (!owner) return '';
  if (owner.businessName && owner.lgu) return `${owner.businessName}, ${owner.lgu}`;
  return owner.businessName || owner.lgu || '';
}

function recognitionLabel(status) {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'suspended') return 'Suspended';
  if (status === 'invited') return 'Invited';
  return status || 'Pending';
}

const iconProfile = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 13h20" />
  </svg>
);

const iconAnnounce = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
  </svg>
);

export function EstablishmentDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const panel = location.hash === '#announcements' ? 'announcements' : 'profile';
  const [owner, setOwner] = useState(undefined);
  const [form, setForm] = useState({ fullName: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [posts, setPosts] = useState([]);
  const [announceForm, setAnnounceForm] = useState({ kind: 'event', title: '', place: '', body: '' });
  const [posting, setPosting] = useState(false);
  const [announceMessage, setAnnounceMessage] = useState('');
  const [announceError, setAnnounceError] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const reload = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      setOwner(null);
      setPosts([]);
      return;
    }
    const row = await fetchOwnEstablishment(supabase, session.user.id);
    setOwner(row);
    if (row) {
      setForm({ fullName: row.fullName, phone: row.phone, address: row.address });
      setAnnounceForm((prev) => ({
        ...prev,
        place: prev.place.trim() ? prev.place : defaultPlace(row),
      }));
      try {
        setPosts(await fetchOwnAnnouncements(supabase, row.id));
      } catch {
        setPosts([]);
      }
    }
  }, []);

  useEffect(() => {
    void reload();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void reload();
    });
    return () => subscription.unsubscribe();
  }, [reload]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!owner) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { error: err } = await supabase
        .from('establishment_owners')
        .update({
          full_name: form.fullName.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
        })
        .eq('id', owner.id);
      if (err) throw err;
      setMessage('Your contact details were saved.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const postAnnouncement = async (e) => {
    e.preventDefault();
    if (!owner) return;
    setPosting(true);
    setAnnounceError('');
    setAnnounceMessage('');
    try {
      await createAnnouncement(supabase, {
        kind: announceForm.kind,
        title: announceForm.title,
        place: announceForm.place,
        body: announceForm.body,
        source: 'establishment',
        authorId: owner.id,
        establishmentOwnerId: owner.id,
      });
      setAnnounceMessage('Announcement posted.');
      setAnnounceForm({
        kind: 'event',
        title: '',
        place: defaultPlace(owner),
        body: '',
      });
      await reload();
    } catch (err) {
      setAnnounceError(err instanceof Error ? err.message : 'Could not post.');
    } finally {
      setPosting(false);
    }
  };

  const removePost = async (id) => {
    setDeletingId(id);
    try {
      await deleteAnnouncement(supabase, id);
      await reload();
    } catch {
      /* keep list */
    } finally {
      setDeletingId('');
    }
  };

  const mark = useMemo(() => initials(owner?.businessName), [owner?.businessName]);
  const placeLine = [owner?.businessType, owner?.lgu].filter(Boolean).join(' · ') || 'No category or LGU yet';

  if (owner === undefined) {
    return (
      <div className={styles.root}>
        <div className={styles.shell}>
          <aside className={styles.sidebar} />
          <div className={styles.content}>
            <p className={styles.hint} style={{ padding: 28 }}>
              Loading…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!owner) {
    return <Navigate to="/login" replace />;
  }

  if (owner.accountStatus === 'disabled' || owner.accountStatus === 'deleted') {
    return <Navigate to="/login" replace state={{ accountDisabled: true, establishmentDisabled: true }} />;
  }

  if (isEstablishmentPendingSetup(owner) || !isEstablishmentDashboardReady(owner)) {
    return <Navigate to={ESTABLISHMENT_SETUP_PATH} replace />;
  }

  return (
    <div className={styles.root}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <Link to="/establishment" className={styles.brand}>
            <AdminBrandMark variant="onGreen" />
          </Link>
          <nav className={styles.nav}>
            <button
              type="button"
              className={`${styles.navBtn} ${panel === 'profile' ? styles.navBtnActive : ''}`}
              onClick={() => navigate('/establishment')}
            >
              <span className={styles.icon}>{iconProfile}</span>
              Profile
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${panel === 'announcements' ? styles.navBtnActive : ''}`}
              onClick={() => navigate('/establishment#announcements')}
            >
              <span className={styles.icon}>{iconAnnounce}</span>
              Announcements
            </button>
          </nav>
          <div className={styles.sidebarFoot}>
            <button type="button" className={styles.signOut} onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </aside>

        <div className={styles.content}>
          <header className={styles.top}>
            <h1 className={styles.pageTitle}>{panel === 'announcements' ? 'Announcements' : 'Profile'}</h1>
            <span className={styles.spacer} />
            <div className={styles.profileChip}>
              <span className={styles.chipAvatar}>{mark}</span>
              <span className={styles.chipName}>{owner.businessName}</span>
            </div>
            <button type="button" className={styles.topSignOut} onClick={() => void signOut()}>
              Sign out
            </button>
          </header>

          <main className={styles.main}>
            {panel === 'profile' ? (
              <article className={styles.dossier}>
                <header className={styles.mast}>
                  <div className={styles.avatar}>{mark}</div>
                  <div>
                    <span className={styles.eyebrow}>Establishment account</span>
                    <h2 className={styles.name}>{owner.businessName}</h2>
                    <p className={styles.meta}>{placeLine}</p>
                  </div>
                  <div className={styles.stamps} aria-label="Account status">
                    <div className={styles.stamp}>
                      <span className={styles.stampLabel}>Account</span>
                      <span className={`${styles.badge} ${styles.toneGreen}`}>Active</span>
                    </div>
                    <div className={styles.stamp}>
                      <span className={styles.stampLabel}>Recognition</span>
                      <span className={`${styles.badge} ${styles.toneGreen}`}>
                        {recognitionLabel(owner.verificationStatus)}
                      </span>
                    </div>
                    <div className={styles.stamp}>
                      <span className={styles.stampLabel}>Listing</span>
                      <span className={`${styles.badge} ${owner.publicVisible ? styles.toneGreen : styles.toneNeutral}`}>
                        {owner.publicVisible ? 'Public' : 'Hidden'}
                      </span>
                    </div>
                  </div>
                </header>

                <form onSubmit={save}>
                  <div className={styles.body}>
                    <p className={styles.hint}>
                      You can update your own contact information. The Cavite Tourism Administration
                      controls whether this account is active and what is publicly visible.
                    </p>
                    <div className={styles.grid}>
                      <label className={styles.field}>
                        <span className={styles.label}>Email</span>
                        <input className={styles.input} value={owner.email || '—'} readOnly />
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
                        <span className={styles.label}>Category</span>
                        <input className={styles.input} value={owner.businessType || '—'} readOnly />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>Phone</span>
                        <input
                          className={styles.input}
                          value={form.phone}
                          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        />
                      </label>
                      <label className={`${styles.field} ${styles.span2}`}>
                        <span className={styles.label}>City / Municipality</span>
                        <input className={styles.input} value={owner.lgu || '—'} readOnly />
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
                    {message ? <p className={styles.ok}>{message}</p> : null}
                    {error ? <p className={styles.err}>{error}</p> : null}
                  </div>
                  <footer className={styles.toolbar}>
                    <button type="submit" className={styles.primaryBtn} disabled={saving}>
                      {saving ? 'Saving…' : 'Save contact details'}
                    </button>
                  </footer>
                </form>
              </article>
            ) : (
              <article className={styles.dossier}>
                <div className={styles.body}>
                  <p className={styles.hint}>
                    Events and travel notices appear on the traveler Announcements page and in the
                    notification bell.
                  </p>
                  <form onSubmit={postAnnouncement} className={styles.grid}>
                    <label className={styles.field}>
                      <span className={styles.label}>Kind</span>
                      <select
                        className={styles.select}
                        value={announceForm.kind}
                        onChange={(e) => setAnnounceForm((f) => ({ ...f, kind: e.target.value }))}
                      >
                        <option value="event">Event</option>
                        <option value="advisory">Advisory</option>
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>Title</span>
                      <input
                        className={styles.input}
                        value={announceForm.title}
                        onChange={(e) => setAnnounceForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="e.g. Weekend tasting hours"
                        required
                      />
                    </label>
                    <label className={`${styles.field} ${styles.span2}`}>
                      <span className={styles.label}>Place</span>
                      <input
                        className={styles.input}
                        value={announceForm.place}
                        onChange={(e) => setAnnounceForm((f) => ({ ...f, place: e.target.value }))}
                        required
                      />
                    </label>
                    <label className={`${styles.field} ${styles.span2}`}>
                      <span className={styles.label}>Details</span>
                      <textarea
                        className={styles.textarea}
                        value={announceForm.body}
                        onChange={(e) => setAnnounceForm((f) => ({ ...f, body: e.target.value }))}
                        placeholder="What travelers should know"
                        required
                      />
                    </label>
                    {announceMessage ? <p className={`${styles.ok} ${styles.span2}`}>{announceMessage}</p> : null}
                    {announceError ? <p className={`${styles.err} ${styles.span2}`}>{announceError}</p> : null}
                    <div className={styles.span2}>
                      <button type="submit" className={styles.primaryBtn} disabled={posting}>
                        {posting ? 'Posting…' : 'Post announcement'}
                      </button>
                    </div>
                  </form>

                  <ul className={styles.posts}>
                    {posts.length === 0 ? (
                      <li className={styles.empty}>You have not posted any announcements yet.</li>
                    ) : (
                      posts.map((post) => (
                        <li key={post.id} className={styles.post}>
                          <div className={styles.postHead}>
                            <div>
                              <p className={styles.postTitle}>{post.title}</p>
                              <p className={styles.postMeta}>
                                {post.kind === 'advisory' ? 'Advisory' : 'Event'}
                                {post.place ? ` · ${post.place}` : ''}
                                {post.publishedAt ? ` · ${formatAnnouncementDateLabel(post.publishedAt)}` : ''}
                              </p>
                              <p className={styles.postBody}>{post.body}</p>
                            </div>
                            <button
                              type="button"
                              className={styles.dangerBtn}
                              disabled={deletingId === post.id}
                              onClick={() => void removePost(post.id)}
                            >
                              {deletingId === post.id ? 'Removing…' : 'Delete'}
                            </button>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </article>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
