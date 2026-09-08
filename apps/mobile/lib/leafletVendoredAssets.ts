import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

const LEAFLET_JS_MODULE = require('../assets/leaflet/leaflet.js.txt');
const LEAFLET_CSS_MODULE = require('../assets/leaflet/leaflet.css.txt');
const CLUSTER_JS_MODULE = require('../assets/leaflet/leaflet.markercluster.js.txt');
const CLUSTER_CSS_MODULE = require('../assets/leaflet/leaflet.markercluster.css.txt');

export type VendoredLeaflet = {
  js: string;
  css: string;
  /** leaflet.markercluster — absent if only its assets failed to read. */
  clusterJs?: string;
  clusterCss?: string;
};

let cache: Promise<VendoredLeaflet | null> | null = null;

async function readAssetText(moduleRef: number): Promise<string | null> {
  try {
    const asset = Asset.fromModule(moduleRef);
    await asset.downloadAsync();
    return await FileSystem.readAsStringAsync(asset.localUri || asset.uri);
  } catch (e) {
    console.warn('[LeafletAssets] failed to read vendored asset', e);
    return null;
  }
}

/**
 * Leaflet 1.9.4 + markercluster are vendored under assets/leaflet/ and inlined into the map
 * WebView HTML so the map does not depend on unpkg.com (offline-friendly, no crossorigin
 * fragility). Returns null when the core assets cannot be read — callers fall back to the CDN.
 */
export function loadVendoredLeaflet(): Promise<VendoredLeaflet | null> {
  if (!cache) {
    cache = (async () => {
      const [js, css, clusterJs, clusterCss] = await Promise.all([
        readAssetText(LEAFLET_JS_MODULE),
        readAssetText(LEAFLET_CSS_MODULE),
        readAssetText(CLUSTER_JS_MODULE),
        readAssetText(CLUSTER_CSS_MODULE),
      ]);
      if (!js || !css) return null;
      return {
        js,
        css,
        clusterJs: clusterJs ?? undefined,
        clusterCss: clusterCss ?? undefined,
      };
    })().catch((e) => {
      console.warn('[LeafletAssets] vendored Leaflet load rejected', e);
      return null;
    });
  }
  return cache;
}

/**
 * Drops the memoized result so a retry can re-read the assets. Without this a single
 * transient failure resolves to null for the rest of the process lifetime.
 */
export function clearVendoredLeafletCache(): void {
  cache = null;
}
