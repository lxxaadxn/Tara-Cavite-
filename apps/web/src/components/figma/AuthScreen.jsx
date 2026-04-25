import { useId, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
const MIN_PASSWORD_LENGTH = 8;
function isValidEmail(email) {
    // Simple email validation; supabase will enforce final validation too.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export function AuthScreen({ variant }) {
    const navigate = useNavigate();
    const formId = useId();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState(null);
    const isSignIn = variant === 'sign-in';
    const title = isSignIn ? 'Sign in' : 'Sign up';
    const subtitle = isSignIn
        ? 'Welcome back! Sign in to resume your journey.'
        : "Let's start your journey!";
    const actionLabel = isSignIn ? 'SIGN IN' : 'SIGN UP';
    const initialIcon = useMemo(() => {
        // Keep deterministic label for accessibility; the SVG itself is decorative.
        return isSignIn ? 'Sign in' : 'Sign up';
    }, [isSignIn]);
    async function onSubmit(e) {
        e.preventDefault();
        setFormError(null);
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setFormError('Email is required.');
            return;
        }
        if (!isValidEmail(trimmedEmail)) {
            setFormError('Please enter a valid email address.');
            return;
        }
        if (!password) {
            setFormError('Password is required.');
            return;
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            return;
        }
        if (!isSignIn) {
            if (!confirmPassword) {
                setFormError('Confirm password is required.');
                return;
            }
            if (confirmPassword !== password) {
                setFormError('Passwords do not match.');
                return;
            }
        }
        setLoading(true);
        try {
            if (isSignIn) {
                const { error } = await supabase.auth.signInWithPassword({
                    email: trimmedEmail,
                    password,
                });
                if (error)
                    throw error;
                navigate('/search', { replace: true });
            }
            else {
                const username = trimmedEmail.split('@')[0];
                const { data, error } = await supabase.auth.signUp({
                    email: trimmedEmail,
                    password,
                    options: { data: { username } },
                });
                if (error)
                    throw error;
                if (data.session) {
                    navigate('/search', { replace: true });
                }
                else {
                    navigate('/prototype/sign-in', { replace: true });
                    alert('Check your email. We sent you a confirmation link. Open it to activate your account, then sign in.');
                }
            }
        }
        catch (err) {
            setFormError(err instanceof Error ? err.message : 'Authentication failed.');
        }
        finally {
            setLoading(false);
        }
    }
    return (<main className="ft-screen ft-authScreen" aria-label="Authentication screen">
      <section className="ft-authCard" role="region" aria-label={title}>
        <header className="ft-authHeader">
          <Link to="/" className="ft-iconBtn ft-iconBtn--back" aria-label="Back" title="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18 9 12l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div className="ft-authHeaderText">
            <h1 className="ft-authTitle">{title}</h1>
            <p className="ft-authSubtitle">{subtitle}</p>
          </div>
        </header>

        <form onSubmit={onSubmit} className="ft-authForm" aria-describedby={`${formId}-error`}>
          <div className="ft-field">
            <label className="ft-label" htmlFor={`${formId}-email`}>
              Email
            </label>
            <input id={`${formId}-email`} className="ft-input" type="email" placeholder="Enter Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-label="Email"/>
          </div>

          <div className="ft-field">
            <label className="ft-label" htmlFor={`${formId}-password`}>
              Password
            </label>
            <input id={`${formId}-password`} className="ft-input" type="password" placeholder="Enter Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isSignIn ? 'current-password' : 'new-password'} aria-label="Password"/>
          </div>

          {!isSignIn && (<div className="ft-field">
              <label className="ft-label" htmlFor={`${formId}-confirm`}>
                Confirm Password
              </label>
              <input id={`${formId}-confirm`} className="ft-input" type="password" placeholder="Enter Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" aria-label="Confirm Password"/>
            </div>)}

          <div className="ft-authRow">
            {isSignIn ? (<div className="ft-authRowLeft">
                <button type="button" className="ft-linkBtn" aria-label="Forgot Password?">
                  Forgot Password?
                </button>
              </div>) : (<label className="ft-checkbox" aria-label="Remember device">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} aria-label="Remember"/>
                Remember
              </label>)}

            <div className="ft-authRowRight">
              <div className="ft-authIconMeta" aria-hidden="true">
                {initialIcon}
              </div>
            </div>
          </div>

          <div id={`${formId}-error`} className="ft-formError" role="alert" aria-live="polite">
            {formError}
          </div>

          <button type="submit" disabled={loading} className="ft-primaryBtn ft-primaryBtn--auth" aria-label={actionLabel}>
            {loading ? 'Please wait...' : actionLabel}
          </button>

          <button type="button" className="ft-secondaryBtn" aria-label={isSignIn ? 'Log in with Google' : 'Sign up with Google'} onClick={() => alert('Google sign-in is not wired in this prototype yet.')}>
            <span className="ft-secondaryBtnG" aria-hidden="true">
              G
            </span>
            {isSignIn ? 'Log in with Google' : 'Sign up with Google'}
          </button>

          <p className="ft-authFooter">
            {isSignIn ? 'Don’t have an account? ' : 'Already have an account? '}
            {isSignIn ? (<Link to="/prototype/sign-up" className="ft-authFooterLink" aria-label="Sign up">
                Sign up
              </Link>) : (<Link to="/prototype/sign-in" className="ft-authFooterLink" aria-label="Sign in">
                Sign in
              </Link>)}
          </p>
        </form>
      </section>
    </main>);
}
