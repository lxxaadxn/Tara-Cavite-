import { LEAFLET_GREEN_PIN_SNIPPET } from './leafletGreenPinSnippet';
import { DIAGNOSTICS_SNIPPET } from './leafletDiagnosticsSnippet';
import type { VendoredLeaflet } from './leafletVendoredAssets';

const LEAFLET_CDN_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_CDN_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const CLUSTER_CDN_JS = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
const CLUSTER_CDN_CSS_BASE = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist';

function styleTags(leaflet?: VendoredLeaflet | null): string {
  if (!leaflet) {
    return [
      `<link rel="stylesheet" href="${LEAFLET_CDN_CSS}" crossorigin="" />`,
      `<link rel="stylesheet" href="${CLUSTER_CDN_CSS_BASE}/MarkerCluster.css" crossorigin="" />`,
      `<link rel="stylesheet" href="${CLUSTER_CDN_CSS_BASE}/MarkerCluster.Default.css" crossorigin="" />`,
    ].join('\n  ');
  }
  const cluster = leaflet.clusterCss ? `<style>\n${leaflet.clusterCss}\n</style>` : '';
  return `<style>\n${leaflet.css}\n</style>\n${cluster}`;
}

function scriptTags(leaflet?: VendoredLeaflet | null): string {
  if (!leaflet) {
    return [
      `<script src="${LEAFLET_CDN_JS}" crossorigin=""><\/script>`,
      `<script src="${CLUSTER_CDN_JS}" crossorigin=""><\/script>`,
    ].join('\n  ');
  }
  const cluster = leaflet.clusterJs ? `<script>\n${leaflet.clusterJs}\n<\/script>` : '';
  return `<script>\n${leaflet.js}\n<\/script>\n${cluster}`;
}

/** Brand cluster bubbles — mirrors web `components/PlacesLeafletMap.css`. */
const CLUSTER_CSS = `
    .cavitour-cluster {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 9999px;
      background: #1b8a70;
      border: 3px solid #d4efe8;
      box-shadow: 0 6px 16px rgba(22, 53, 46, 0.22);
      color: #fff;
      font-family: Poppins, system-ui, sans-serif;
      font-weight: 700;
      line-height: 1;
    }
    .cavitour-cluster span { display: block; text-align: center; }
    .cavitour-cluster--small {
      width: 34px !important; height: 34px !important;
      margin-left: -17px !important; margin-top: -17px !important;
      font-size: 12px;
    }
    .cavitour-cluster--medium {
      width: 40px !important; height: 40px !important;
      margin-left: -20px !important; margin-top: -20px !important;
      font-size: 13px; background: #168f7a;
    }
    .cavitour-cluster--large {
      width: 48px !important; height: 48px !important;
      margin-left: -24px !important; margin-top: -24px !important;
      font-size: 14px; background: #0f5c4c;
    }
`;

/**
 * Single Leaflet + OSM map document for WebView (iOS/Android) and iframe (Expo web).
 * Host updates: native uses injectJavaScript(__cavitourUpdateMap); web uses postMessage.
 * Pass vendored Leaflet ({ js, css, clusterJs, clusterCss }) to inline the libraries;
 * omit for the CDN fallback.
 *
 * Configuration is kept in step with web `lib/caviteMapBounds.js` +
 * `components/PlacesLeafletMap.jsx`: same bbox, min/max zoom, clustering,
 * dynamic min-zoom lock, resize handling and user accuracy circle.
 */
export function buildCavitourLeafletHtml(leaflet?: VendoredLeaflet | null): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script>${DIAGNOSTICS_SNIPPET}<\/script>
  ${styleTags(leaflet)}
  <style>
    html, body { margin: 0; padding: 0; height: 100%; }
    #map { height: 100%; width: 100%; }
    .leaflet-control-attribution { font-size: 9px; max-width: 45%; }
    /* Zoom +/− bottom-right, lifted above the app tab bar (Expo floating pill ~56px + margin + safe area) */
    .leaflet-bottom.leaflet-right {
      bottom: calc(88px + env(safe-area-inset-bottom, 0px)) !important;
      right: max(12px, env(safe-area-inset-right, 0px)) !important;
      margin-right: 0 !important;
      margin-bottom: 0 !important;
    }
    .leaflet-bottom.leaflet-right .leaflet-control-zoom {
      margin-bottom: 0 !important;
      border: none;
      box-shadow: 0 1px 4px rgba(0,0,0,0.28) !important;
    }
    /* Keep OSM attribution clear of zoom stack */
    .leaflet-bottom.leaflet-left { bottom: calc(8px + env(safe-area-inset-bottom, 0px)) !important; }
${CLUSTER_CSS}
  </style>
</head>
<body>
  <div id="map"></div>
  ${scriptTags(leaflet)}
  <script>
    (function () {
      function postToHost(obj) {
        var s = JSON.stringify(obj);
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(s);
            return;
          }
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(s, '*');
          }
        } catch (e) {}
      }

      window.addEventListener('message', function (ev) {
        try {
          var raw = ev.data;
          var d = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (d && d.type === 'cavitourHostUpdate' && d.payload) {
            window.__cavitourUpdateMap(d.payload);
          }
        } catch (e) {}
      });

      try {
        /* Cavite Province (approx. admin bbox, padded) — panning cannot leave this area.
           Same numbers as web lib/caviteMapBounds.js. */
        var caviteBounds = L.latLngBounds(L.latLng(13.88, 120.44), L.latLng(14.52, 121.08));
        var CAVITE = caviteBounds.getCenter();
        var CAVITE_DEFAULT_ZOOM = 11;
        var CAVITE_MAX_ZOOM = 19;
        var CAVITE_MIN_ZOOM_FLOOR = 10;

        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false,
          maxBounds: caviteBounds,
          maxBoundsViscosity: 1.0,
          minZoom: CAVITE_MIN_ZOOM_FLOOR,
          maxZoom: CAVITE_MAX_ZOOM
        }).setView(CAVITE, CAVITE_DEFAULT_ZOOM);

        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.control.attribution({ position: 'bottomleft' }).addTo(map);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: CAVITE_MAX_ZOOM,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        ${LEAFLET_GREEN_PIN_SNIPPET}

        /* Raise min zoom so wide viewports cannot zoom out past the province bbox.
           Port of web lockMapToCaviteViewport(). */
        function applyViewportZoomLock() {
          map.invalidateSize(true);
          var size = map.getSize();
          if (!size || size.x < 10 || size.y < 10) return false;
          var minZ = map.getBoundsZoom(caviteBounds, false);
          if (!isFinite(minZ) || minZ < 0) return false;
          minZ = Math.max(CAVITE_MIN_ZOOM_FLOOR, Math.min(minZ, map.getMaxZoom()));
          map.setMinZoom(minZ);
          if (map.getZoom() < minZ) map.setZoom(minZ);
          map.panInsideBounds(caviteBounds, { animate: false });
          return true;
        }

        function scheduleViewportZoomLock() {
          if (applyViewportZoomLock()) return;
          requestAnimationFrame(function () {
            if (!applyViewportZoomLock()) requestAnimationFrame(applyViewportZoomLock);
          });
        }

        map.whenReady(scheduleViewportZoomLock);
        map.on('resize', applyViewportZoomLock);

        /* WebView height changes (sheet open, rotation, keyboard) do not always fire
           Leaflet's own resize, so watch the container too. */
        var mapEl = document.getElementById('map');
        if (typeof ResizeObserver !== 'undefined' && mapEl) {
          new ResizeObserver(function () {
            map.invalidateSize(true);
            applyViewportZoomLock();
          }).observe(mapEl);
        }
        window.addEventListener('resize', function () {
          map.invalidateSize(true);
          applyViewportZoomLock();
        });
        window.addEventListener('orientationchange', function () {
          setTimeout(function () {
            map.invalidateSize(true);
            applyViewportZoomLock();
          }, 200);
        });

        function makeMarkersLayer() {
          if (typeof L.markerClusterGroup !== 'function') return L.layerGroup();
          return L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            disableClusteringAtZoom: CAVITE_MAX_ZOOM,
            iconCreateFunction: function (cluster) {
              var count = cluster.getChildCount();
              var size = count < 10 ? 'small' : count < 50 ? 'medium' : 'large';
              var px = size === 'large' ? 48 : size === 'medium' ? 40 : 34;
              return L.divIcon({
                html: '<span>' + count + '</span>',
                className: 'cavitour-cluster cavitour-cluster--' + size,
                iconSize: L.point(px, px)
              });
            }
          });
        }

        var markersLayer = makeMarkersLayer().addTo(map);
        var userLayer = L.layerGroup().addTo(map);
        var didCenterUser = false;
        var lastFitSignature = '';
        var activePreviewId = null;
        var activePreviewMarker = null;
        var iconCache = {};

        function postMarkerPreview(marker, id) {
          var pt = map.latLngToContainerPoint(marker.getLatLng());
          activePreviewId = String(id);
          activePreviewMarker = marker;
          postToHost({ type: 'markerPreview', id: String(id), x: pt.x, y: pt.y });
        }

        function clearMarkerPreview() {
          activePreviewId = null;
          activePreviewMarker = null;
          postToHost({ type: 'markerPreviewEnd' });
        }

        map.on('click', function () {
          clearMarkerPreview();
        });

        map.on('move zoom', function () {
          if (!activePreviewMarker || !activePreviewId) return;
          var pt = map.latLngToContainerPoint(activePreviewMarker.getLatLng());
          postToHost({ type: 'markerPreview', id: activePreviewId, x: pt.x, y: pt.y });
        });

        function clampLatLng(lat, lng) {
          var sw = caviteBounds.getSouthWest();
          var ne = caviteBounds.getNorthEast();
          return [
            Math.min(Math.max(lat, sw.lat), ne.lat),
            Math.min(Math.max(lng, sw.lng), ne.lng)
          ];
        }

        /* Retina options mirror cavitour-shared/mapPins MAP_PIN_LEAFLET. */
        function resolveIcon(p) {
          if (!p.iconUrl) return greenPinIcon;
          var key = p.iconUrl + '|' + (p.iconRetinaUrl || '');
          if (iconCache[key]) return iconCache[key];
          var icon = L.icon({
            iconUrl: p.iconUrl,
            iconRetinaUrl: p.iconRetinaUrl || p.iconUrl,
            iconSize: [28, 46],
            iconAnchor: [14, 46],
            popupAnchor: [1, -38],
            shadowUrl: LEAFLET_MARKER_SHADOW,
            shadowSize: [40, 40],
            shadowAnchor: [12, 46]
          });
          iconCache[key] = icon;
          return icon;
        }

        window.__cavitourUpdateMap = function (payload) {
          try {
            var markers = payload.markers || [];
            var userLat = payload.userLat;
            var userLng = payload.userLng;

            markersLayer.clearLayers();
            var bounds = [];
            var ids = [];
            if (activePreviewId && !markers.some(function (p) { return String(p.id) === activePreviewId; })) {
              clearMarkerPreview();
            }

            var batch = [];
            markers.forEach(function (p) {
              if (p.lat == null || p.lng == null || isNaN(p.lat) || isNaN(p.lng)) return;
              var m = L.marker([p.lat, p.lng], { icon: resolveIcon(p) });
              m.on('click', function (ev) {
                L.DomEvent.stopPropagation(ev);
                postMarkerPreview(m, p.id);
                postToHost({ type: 'markerPress', id: String(p.id), name: String(p.name || '') });
              });
              m.on('mouseover', function () {
                postMarkerPreview(m, p.id);
              });
              m.on('mouseout', function () {
                if (activePreviewId === String(p.id)) clearMarkerPreview();
              });
              batch.push(m);
              bounds.push([p.lat, p.lng]);
              ids.push(String(p.id));
            });
            if (typeof markersLayer.addLayers === 'function') markersLayer.addLayers(batch);
            else batch.forEach(function (m) { markersLayer.addLayer(m); });

            userLayer.clearLayers();
            var hasUser = userLat != null && userLng != null && !isNaN(userLat) && !isNaN(userLng);
            if (hasUser) {
              L.circleMarker([userLat, userLng], greenUserDotStyle(8)).addTo(userLayer);
              /* Accuracy halo, same radius/opacity as web PlacesLeafletMap. */
              L.circle([userLat, userLng], {
                radius: 220,
                color: CAVITOUR_USER_DOT_GREEN,
                weight: 1,
                fillColor: CAVITOUR_USER_DOT_GREEN,
                fillOpacity: 0.12
              }).addTo(userLayer);
            }

            /* Refit whenever the marker set actually changes, like the web map's
               effect re-run — but never on a pure user-location tick. */
            var signature = ids.sort().join(',');
            if (bounds.length && signature !== lastFitSignature) {
              lastFitSignature = signature;
              var fitPoints = bounds.slice();
              if (hasUser) fitPoints.push([userLat, userLng]);
              map.fitBounds(L.latLngBounds(fitPoints), { padding: [40, 40], maxZoom: 14 });
              map.panInsideBounds(caviteBounds, { animate: false });
            } else if (!bounds.length) {
              lastFitSignature = '';
            }

            if (hasUser && !didCenterUser) {
              didCenterUser = true;
              if (!bounds.length) map.setView(clampLatLng(userLat, userLng), 14);
            }
          } catch (e) {
            if (window.__cavitourDiag) {
              window.__cavitourDiag('error', 'map update failed: ' + (e && e.stack ? e.stack : e));
            }
          }
        };

        postToHost({ type: 'mapReady' });
      } catch (initError) {
        if (window.__cavitourDiag) window.__cavitourDiag('error', 'map init failed: ' + (initError && initError.stack ? initError.stack : initError));
        postToHost({ type: 'mapInitFailed', message: String(initError && initError.message ? initError.message : initError) });
      }
    })();
  <\/script>
</body>
</html>`;
}

/** CDN fallback used by the Expo web iframe (web builds bundle fine and unpkg is reachable). */
export const CAVITOUR_LEAFLET_HTML = buildCavitourLeafletHtml(null);
