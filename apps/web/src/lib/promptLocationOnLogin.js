/**
 * Browser geolocation helpers for post-login location access.
 * Native Allow/Block only appears reliably from a user click (not after async login).
 */

const COORDS_KEY = 'cavitour_user_location_v1';
const DISMISSED_KEY = 'cavitour_location_dismissed_user_v1';
const PENDING_KEY = 'cavitour_location_pending_v1';

/**
 * @returns {{ lat: number; lng: number; at: number; userId?: string } | null}
 */
export function readCachedUserLocation() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(COORDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Number.isFinite(parsed?.lat) || !Number.isFinite(parsed?.lng)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCachedUserLocation() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(COORDS_KEY);
    sessionStorage.removeItem(DISMISSED_KEY);
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

/** Mark that this login should show the in-app location modal. */
export function markLocationPromptPending(userId) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PENDING_KEY, String(userId || '').trim() || '1');
  } catch {
    /* ignore */
  }
}

export function clearLocationPromptPending() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function isLocationPromptPending() {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(sessionStorage.getItem(PENDING_KEY));
  } catch {
    return false;
  }
}

export function wasLocationDismissedForUser(userId) {
  if (typeof window === 'undefined') return false;
  const uid = String(userId || '').trim();
  if (!uid) return false;
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === uid;
  } catch {
    return false;
  }
}

export function dismissLocationPromptForUser(userId) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(DISMISSED_KEY, String(userId || '').trim() || '1');
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Must be called from a click/tap handler so the browser can show the native prompt.
 * @returns {Promise<{ lat: number; lng: number }>}
 */
export function requestBrowserLocationFromUserGesture(userId) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.navigator?.geolocation) {
      reject(new Error('Geolocation is not available in this browser.'));
      return;
    }

    window.navigator.geolocation.getCurrentPosition(
      (position) => {
        const payload = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          at: Date.now(),
          userId: String(userId || '').trim() || undefined,
        };
        try {
          sessionStorage.setItem(COORDS_KEY, JSON.stringify(payload));
          sessionStorage.removeItem(PENDING_KEY);
        } catch {
          /* ignore */
        }
        window.dispatchEvent(new CustomEvent('cavitour:user-location', { detail: payload }));
        resolve({ lat: payload.lat, lng: payload.lng });
      },
      (err) => {
        const code = err?.code;
        let message = 'Could not get your location.';
        if (code === 1) {
          message =
            'Location is blocked for this site. Click the lock icon in the address bar → Site settings → Location → Allow, then try again.';
        } else if (code === 2) {
          message = 'Location unavailable. Check that GPS / location services are on.';
        } else if (code === 3) {
          message = 'Location request timed out. Try again.';
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  });
}

/** @deprecated Prefer the in-app modal + requestBrowserLocationFromUserGesture */
export function promptBrowserLocationAfterLogin(userId) {
  markLocationPromptPending(userId);
}
