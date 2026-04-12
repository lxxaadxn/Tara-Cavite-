import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogoWordmark } from '../components/LogoWordmark';
const MIN_PASSWORD_LENGTH = 8;
const olive = '#7ea00e';
const teal = '#1f4f59';
export function SignupPage() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const trimmedEmail = email.trim();
        if (!trimmedEmail || !password) {
            setError('Please fill in all required fields.');
            return;
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            setError('Password must be at least 8 characters.');
            return;
        }
        const trimmedName = name.trim() || trimmedEmail.split('@')[0];
        setLoading(true);
        try {
            const { data, error: err } = await supabase.auth.signUp({
                email: trimmedEmail,
                password,
                options: { data: { username: trimmedName } },
            });
            if (err)
                throw err;
            if (data.session) {
                navigate('/search', { replace: true });
            }
            else {
                setError('');
                alert('Check your email. We sent you a confirmation link. Open it to activate your account, then sign in.');
                navigate('/login', { replace: true });
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Sign up failed');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="min-h-screen flex font-['Inter',sans-serif]">
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 bg-white min-h-screen order-2 lg:order-1">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
          <Link to="/" className="inline-block mb-10">
            <LogoWordmark />
          </Link>
          <h1 className="font-['Poppins',sans-serif] text-3xl font-bold text-neutral-900 mb-2">Sign up</h1>
          <p className="text-neutral-600 mb-8">Start your 30-day free trial.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Name *</label>
              <input type="text" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-[rgba(126,160,14,0.3)]"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email *</label>
              <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-[rgba(126,160,14,0.3)]" required/>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Password *</label>
              <input type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-[rgba(126,160,14,0.3)]" required minLength={MIN_PASSWORD_LENGTH}/>
              <p className="mt-1 text-xs text-neutral-500">Must be at least 8 characters.</p>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl text-white font-bold disabled:opacity-60" style={{ backgroundColor: olive }}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
            <button type="button" className="w-full py-3.5 rounded-xl border border-neutral-200 flex items-center justify-center gap-2 text-neutral-800 font-semibold hover:bg-neutral-50">
              <span className="text-lg">G</span> Sign up with Google
            </button>
          </form>

          <p className="mt-8 text-center text-neutral-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="font-bold hover:underline" style={{ color: teal }}>
              Log in
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

      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden order-1 lg:order-2">
        <img src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200&q=80" alt="" className="absolute inset-0 w-full h-full object-cover"/>
        <div className="absolute inset-0 z-[1] rounded-l-[2.5rem] overflow-hidden pointer-events-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"/>
      </div>
    </div>);
}
