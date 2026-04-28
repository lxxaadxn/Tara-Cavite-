import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogoWordmark } from '../components/LogoWordmark';

const MIN_LEN = 8;
const teal = 'var(--ct-teal)';
const ink = 'var(--ct-ink)';
const cream = 'var(--ct-cream)';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const hash = window.location.hash.replace(/^#/, '');
        const type = new URLSearchParams(hash).get('type');
        if (type === 'recovery') {
          setReady(true);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_LEN) {
      setError(`Password must be at least ${MIN_LEN} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      navigate('/search', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 font-['Inter',sans-serif] sm:px-8 sm:py-8" style={{ backgroundColor: cream }}>
      <div className="mx-auto w-full max-w-md pt-8">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center justify-center">
            <LogoWordmark className="text-sm" />
          </Link>
          <h1 className="mt-4 font-['Poppins',sans-serif] text-3xl font-semibold" style={{ color: ink }}>
            Set new password
          </h1>
          <p className="mt-2 text-sm text-neutral-500">Use the link from your email to open this page, then choose a new password.</p>
        </div>

        {!ready ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-600 shadow-sm">
            Waiting for a valid reset link… If this stays here, open the link from your email again.{' '}
            <Link to="/forgot-password" className="font-semibold hover:underline" style={{ color: teal }}>
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div>
              <label className="mb-1.5 block text-sm text-neutral-600">New password</label>
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-full border border-neutral-200 px-4 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
                minLength={MIN_LEN}
                required
              />
              <p className="mt-1 text-xs text-neutral-500">At least {MIN_LEN} characters.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-neutral-600">Confirm password</label>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-11 w-full rounded-full border border-neutral-200 px-4 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
                minLength={MIN_LEN}
                required
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-full text-sm font-semibold text-white transition disabled:opacity-60"
              style={{ backgroundColor: teal }}
            >
              {loading ? 'Saving…' : 'Save new password'}
            </button>
            <p className="text-center text-sm text-neutral-500">
              <Link to="/login" className="font-semibold hover:underline" style={{ color: teal }}>
                Back to login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
