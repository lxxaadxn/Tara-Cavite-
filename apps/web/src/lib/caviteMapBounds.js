import L from 'leaflet';

/** Cavite Province approx. admin bbox (padded) — matches mobile `cavitourLeafletMapHtml.ts`. */
export const CAVITE_MAP_BOUNDS = L.latLngBounds(
  L.latLng(13.88, 120.44),
  L.latLng(14.52, 121.08),
);

export const CAVITE_MAP_CENTER = CAVITE_MAP_BOUNDS.getCenter();

export const CAVITE_MAP_DEFAULT_ZOOM = 11;

export const CAVITE_MAP_MAX_ZOOM = 19;

/** Base Leaflet options: panning cannot leave Cavite. */
export const CAVITE_LEAFLET_MAP_OPTIONS = {
  maxBounds: CAVITE_MAP_BOUNDS,
  maxBoundsViscosity: 1.0,
  minZoom: 10,
  maxZoom: CAVITE_MAP_MAX_ZOOM,
};

const CAVITE_MIN_ZOOM_FLOOR = 10;

/**
 * Raise min zoom so wide viewports cannot zoom out past the province bbox.
 * Skips when the container has no layout size yet (avoids minZoom = Infinity → blank map).
 * @returns {() => void} cleanup
 */
export function lockMapToCaviteViewport(map, bounds = CAVITE_MAP_BOUNDS) {
  const apply = () => {
    map.invalidateSize(true);
    const size = map.getSize();
    if (!size || size.x < 10 || size.y < 10) return false;

    let minZ = map.getBoundsZoom(bounds, false);
    if (!Number.isFinite(minZ) || minZ < 0) return false;

    minZ = Math.max(CAVITE_MIN_ZOOM_FLOOR, Math.min(minZ, map.getMaxZoom()));
    map.setMinZoom(minZ);
    if (map.getZoom() < minZ) map.setZoom(minZ);
    map.panInsideBounds(bounds, { animate: false });
    return true;
  };

  const schedule = () => {
    if (apply()) return;
    requestAnimationFrame(() => {
      if (!apply()) requestAnimationFrame(apply);
    });
  };

  map.whenReady(schedule);
  map.on('resize', apply);
  return () => {
    map.off('resize', apply);
  };
}
