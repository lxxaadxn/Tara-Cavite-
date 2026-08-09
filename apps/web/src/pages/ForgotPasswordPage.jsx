import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogoWordmark } from '../components/LogoWordmark';

const teal = 'var(--ct-teal)';
const ink = 'var(--ct-ink)';
const cream = 'var(--ct-cream)';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email.');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo,
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
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
            Forgot password
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Enter your email and we&apos;ll send you a link to choose a new password.
          </p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-neutral-700">
              Check your inbox (and spam). Open the reset link — it should open the Set new password page so you can choose a new password.
            </p>
            <p className="mt-3 text-xs text-neutral-500">
              Tip: In Supabase → Authentication → URL Configuration, add your app URL plus{' '}
              <code className="rounded bg-neutral-100 px-1">/reset-password</code> to Redirect URLs.
            </p>
            <Link to="/login" className="mt-4 inline-block text-sm font-semibold hover:underline" style={{ color: teal }}>
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div>
              <label className="mb-1.5 block text-sm text-neutral-600">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-full border border-neutral-200 px-4 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
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
              {loading ? 'Sending…' : 'Send reset link'}
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
