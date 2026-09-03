const INVALID_STORED_SESSION_CODES = new Set([
  'refresh_token_not_found',
  'refresh_token_already_used',
  'session_not_found',
  'session_expired',
]);

/**
 * True when local Supabase session data should be discarded (invalid/expired refresh, etc.).
 * Not used for transient network failures ({@link AuthRetryableFetchError}).
 */
export function isStoredSessionInvalidError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const e = error as { name?: string; code?: string; message?: string };
  if (e.name === 'AuthRetryableFetchError') return false;
  if (typeof e.code === 'string' && INVALID_STORED_SESSION_CODES.has(e.code)) return true;
  const m = typeof e.message === 'string' ? e.message.toLowerCase() : '';
  return /invalid refresh token|refresh token not found/.test(m);
}

const isNetworkError = (e: unknown): boolean => {
  const s = e instanceof Error ? e.message : String(e);
  return /network request failed|Network request failed|TypeError: Network request failed/i.test(s);
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry an async auth operation a few times on network failure (helps with flaky RN fetch).
 */
export async function withAuthRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delayMs?: number } = {}
): Promise<T> {
  const { retries = 2, delayMs = 280 } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (!isNetworkError(e) || attempt === retries - 1) throw e;
      await delay(delayMs);
    }
  }
  throw lastError;
}

export function isNetworkErrorMsg(e: unknown): boolean {
  return isNetworkError(e);
}

export const NETWORK_ERROR_USER_MESSAGE =
  "Your phone can't reach Supabase. Check: 1) Supabase Dashboard – is the project paused? Restore it. 2) Try mobile data or another network. 3) Ensure Project URL and anon key in Supabase Settings > API match the app.";
