import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  storedVerifierLooksLikeRecovery,
  urlLooksLikeInvite,
  urlLooksLikePasswordRecovery,
} from '../lib/passwordRecovery';
import { urlHasOAuthParams } from '../lib/oauthCallback';

/**
 * Route auth `code` / tokens that land on the wrong path:
 * - recovery → `/reset-password`
 * - Google OAuth falling back to Site URL `/` → `/auth/callback`
 */
export function PasswordRecoveryRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/reset-password' || path.startsWith('/auth/') || path.startsWith('/establishment')) {
      return;
    }

    const href = window.location.href;
    const search = window.location.search || '';
    const hash = window.location.hash || '';

    if (urlLooksLikeInvite(href)) {
      navigate(`/establishment/setup${search}${hash}`, { replace: true });
      return;
    }

    if (urlLooksLikePasswordRecovery(href)) {
      navigate(`/reset-password${search}${hash}`, { replace: true });
      return;
    }

    // Google (or other OAuth) sometimes lands on Site URL `/` with `?code=` when Redirect URLs are incomplete.
    if ((path === '/' || path === '') && urlHasOAuthParams(href) && !storedVerifierLooksLikeRecovery()) {
      navigate(`/auth/callback${search}${hash}`, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
}
