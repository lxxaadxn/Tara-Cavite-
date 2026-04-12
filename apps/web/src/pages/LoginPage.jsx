import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogoWordmark } from '../components/LogoWordmark';
const olive = '#7ea00e';
const teal = '#1f4f59';
export function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
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
            const { error: err } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
            if (err)
                throw err;
            navigate('/search', { replace: true });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Sign in failed');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="min-h-screen flex font-['Inter',sans-serif]">
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80" alt="" className="absolute inset-0 w-full h-full object-cover"/>
        <div className="absolute inset-0 z-[1] rounded-r-[2.5rem] overflow-hidden" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}/>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 bg-white min-h-screen">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
          <Link to="/" className="inline-block mb-10">
            <LogoWordmark />
          </Link>
          <h1 className="font-['Poppins',sans-serif] text-3xl font-bold text-neutral-900 mb-2">Log in</h1>
          <p className="text-neutral-600 mb-8">Welcome Back! Please enter your details.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email</label>
              <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-[rgba(126,160,14,0.3)]" required/>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Password</label>
              <input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-[rgba(126,160,14,0.3)]" required/>
            </div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded border-neutral-300" style={{ accentColor: olive }}/>
                Remember for 30 days
              </label>
              <Link to="#" className="text-sm font-semibold hover:underline" style={{ color: teal }}>
                Forgot password
              </Link>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl text-white font-bold disabled:opacity-60 transition-opacity" style={{ backgroundColor: olive }}>
              {loading ? 'Signing in…' : 'Log in'}
            </button>
            <button type="button" className="w-full py-3.5 rounded-xl border border-neutral-200 flex items-center justify-center gap-2 text-neutral-800 font-semibold hover:bg-neutral-50 transition">
              <span className="text-lg">G</span> Sign in with Google
            </button>
          </form>

          <p className="mt-8 text-center text-neutral-600 text-sm">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-bold hover:underline" style={{ color: teal }}>
              Sign up
            </Link>
          </p>
        </div>

        <footer className="max-w-md mx-auto w-full flex items-center justify-between text-xs text-neutral-500 pt-12">
          <span>© CaviTour 2026</span>
          <a href="mailto:help@cavitour.com" className="flex items-center gap-1 hover:text-neutral-700">
            ✉ help@cavitour.com
          </a>
        </footer>
      </div>
    </div>);
}
