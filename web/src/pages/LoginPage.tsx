import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      if (err) throw err;
      navigate('/search', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Scenic panel (Figma – rounded left corners) */}
      <div className="hidden md:flex w-[45%] relative overflow-hidden rounded-r-3xl">
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
        <p className="absolute bottom-12 left-8 text-white text-xl font-medium">
          Log in to continue your adventure
        </p>
        <div className="absolute bottom-8 left-8 flex gap-3">
          <button type="button" className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-gray-700">
            ←
          </button>
          <button type="button" className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-gray-700">
            →
          </button>
        </div>
      </div>

      {/* Right: Form panel (Figma) */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 md:px-16 bg-white">
        <div className="max-w-md mx-auto w-full">
          <Link to="/" className="inline-block mb-8">
            <img src="/images/cavitour-logo.png" alt="CaviTour" className="h-10 w-auto" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Log in</h1>
          <p className="text-gray-600 mb-8">Welcome Back! Please enter your details.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--cavitour-green)] focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--cavitour-green)] focus:border-transparent outline-none"
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-gray-300 text-[var(--cavitour-green)] focus:ring-[var(--cavitour-green)]"
                />
                Remember for 30 days
              </label>
              <Link to="#" className="text-sm text-[var(--cavitour-green)] hover:underline">
                Forgot password
              </Link>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[var(--cavitour-green)] text-white font-semibold hover:opacity-95 disabled:opacity-60 transition"
            >
              {loading ? 'Signing in...' : 'Log in'}
            </button>
            <button
              type="button"
              className="w-full py-3 rounded-lg border border-gray-300 flex items-center justify-center gap-2 text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              <span className="text-lg font-normal">G</span> Sign up with Google
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[var(--cavitour-green)] font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
        <footer className="mt-auto pt-12 flex items-center justify-between text-sm text-gray-500 max-w-md mx-auto w-full">
          <span>© CaviTour 2026</span>
          <a href="mailto:help@cavitour.com" className="flex items-center gap-1 hover:text-gray-700">
            ✉ help@cavitour.com
          </a>
        </footer>
      </div>
    </div>
  );
}
