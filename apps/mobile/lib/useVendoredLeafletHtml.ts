import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearVendoredLeafletCache,
  loadVendoredLeaflet,
  type VendoredLeaflet,
} from './leafletVendoredAssets';

/** Assets are read off local disk; anything slower than this means something is wrong. */
const ASSET_LOAD_TIMEOUT_MS = 8000;
/** The document must report `mapReady` within this window, or the WebView is wedged. */
const MAP_READY_TIMEOUT_MS = 12000;

/**
 * Builds the map document from the vendored Leaflet assets and tracks its lifecycle.
 *
 * Callers must not mount the WebView until `html` is non-null: handing over the CDN
 * fallback while the vendored assets are still loading fires a cross-origin request to
 * unpkg.com, which surfaces as the opaque `Script error.` in the console.
 */
export function useVendoredLeafletHtml(
  build: (vendored: VendoredLeaflet | null) => string,
  label: string
) {
  const buildRef = useRef(build);
  buildRef.current = build;

  const [html, setHtml] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setFailure('The map took too long to load.');
    }, ASSET_LOAD_TIMEOUT_MS);

    loadVendoredLeaflet()
      .then((vendored) => {
        if (cancelled) return;
        clearTimeout(timer);
        if (!vendored) console.warn(`[${label}] vendored Leaflet unavailable; using CDN build`);
        setHtml(buildRef.current(vendored));
      })
      .catch((err) => {
        if (cancelled) return;
        clearTimeout(timer);
        console.error(`[${label}] could not prepare the map document`, err);
        setFailure('The map could not be prepared.');
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reloadKey, label]);

  useEffect(() => {
    if (!html || ready || failure) return undefined;
    const timer = setTimeout(() => setFailure('The map did not finish loading.'), MAP_READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [html, ready, failure]);

  const markReady = useCallback(() => {
    setReady(true);
    setFailure(null);
  }, []);

  const retry = useCallback(() => {
    // Without this the memoized `null` from a failed read is replayed forever.
    clearVendoredLeafletCache();
    setFailure(null);
    setHtml(null);
    setReady(false);
    setReloadKey((k) => k + 1);
  }, []);

  return { html, failure, setFailure, ready, markReady, retry, reloadKey };
}
