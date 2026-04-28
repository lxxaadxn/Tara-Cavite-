import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogoWordmark } from '../components/LogoWordmark';

const olive = 'var(--ct-olive)';
const teal = 'var(--ct-teal)';
const ink = 'var(--ct-ink)';
const cream = 'var(--ct-cream)';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/search` },
    });
    if (err) {
      setError(err.message || 'Google sign in failed');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (err) throw err;
      navigate('/search', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 font-['Inter',sans-serif] sm:px-8 sm:py-8" style={{ backgroundColor: cream }}>
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[1.7rem] bg-white p-3 shadow-[0_24px_60px_rgba(0,0,0,0.10)] sm:p-4 lg:grid-cols-[1fr_1.05fr] lg:gap-6">
        <div className="hidden lg:block">
          <div className="relative h-full min-h-[620px] overflow-hidden rounded-[1.2rem] bg-neutral-100">
            <img
              src="https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1300&q=80"
              alt="Botanical art"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </div>
        </div>

        <div className="flex items-center justify-center px-2 py-2 sm:px-4">
          <div className="w-full max-w-md">
            <div className="mb-6 text-center">
              <Link to="/" className="inline-flex items-center justify-center">
                <LogoWordmark className="text-sm" />
              </Link>
              <h1 className="mt-4 font-['Poppins',sans-serif] text-3xl font-semibold" style={{ color: ink }}>Login to your account</h1>
              <p className="mt-2 text-sm text-neutral-500">Welcome back. Enter your details to log in.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-neutral-600">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-full border border-neutral-200 px-4 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
                  style={{ boxShadow: 'none' }}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-neutral-600">Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-full border border-neutral-200 px-4 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
                  style={{ boxShadow: 'none' }}
                  required
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-neutral-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-neutral-300"
                    style={{ accentColor: olive }}
                  />
                  Remember login
                </label>
                <Link to="/forgot-password" className="font-medium hover:underline" style={{ color: teal }}>
                  Forgot Password?
                </Link>
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 h-11 w-full rounded-full text-sm font-semibold text-white transition disabled:opacity-60"
                style={{ backgroundColor: teal }}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-neutral-400">
              <div className="h-px flex-1 bg-neutral-200" />
              <span>Or continue with</span>
              <div className="h-px flex-1 bg-neutral-200" />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-neutral-100 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-200/70 disabled:opacity-60"
              >
                Sign in with Google
              </button>
            </div>

            <p className="mt-5 text-center text-sm text-neutral-500">
              New here?{' '}
              <Link to="/signup" className="font-semibold hover:underline" style={{ color: teal }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
