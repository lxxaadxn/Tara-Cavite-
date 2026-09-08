import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

const CAVITE_LGUS_MODULE = require('../assets/maps/cavite-lgus.geojson.txt');

let cache: Promise<string | null> | null = null;

/**
 * Cavite LGU boundaries, vendored from `apps/web/public/maps/cavite-lgus.geojson`
 * so the profile choropleth works without a network fetch. Returns the raw JSON
 * text — it is injected straight into the map document.
 */
export function loadCaviteLguGeojson(): Promise<string | null> {
  if (!cache) {
    cache = (async () => {
      try {
        const asset = Asset.fromModule(CAVITE_LGUS_MODULE);
        await asset.downloadAsync();
        return await FileSystem.readAsStringAsync(asset.localUri || asset.uri);
      } catch (e) {
        console.warn('[caviteGeojson] failed to read vendored LGU boundaries', e);
        return null;
      }
    })();
  }
  return cache;
}

export function clearCaviteLguGeojsonCache(): void {
  cache = null;
}
