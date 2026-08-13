export function parseAuthParams(url: string): URLSearchParams {
  const merged = new URLSearchParams();
  const hashIdx = url.indexOf('#');
  const base = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const queryIdx = base.indexOf('?');
  if (queryIdx >= 0) {
    new URLSearchParams(base.slice(queryIdx + 1)).forEach((v, k) => merged.append(k, v));
  }
  if (hashIdx >= 0) {
    new URLSearchParams(url.slice(hashIdx + 1)).forEach((v, k) => merged.set(k, v));
  }
  return merged;
}
