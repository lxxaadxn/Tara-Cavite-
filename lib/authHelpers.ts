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
  const { retries = 3, delayMs = 1500 } = options;
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
