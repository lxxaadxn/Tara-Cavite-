import { LEAFLET_GREEN_PIN_SNIPPET } from './leafletGreenPinSnippet';
import { DIAGNOSTICS_SNIPPET } from './leafletDiagnosticsSnippet';
import type { VendoredLeaflet } from './leafletVendoredAssets';

function leafletStyleTag(leaflet?: VendoredLeaflet | null): string {
  return leaflet ? `<style>\n${leaflet.css}\n</style>` : `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />`;
}

function leafletScriptTag(leaflet?: VendoredLeaflet | null): string {
  return leaflet
    ? `<script>\n${leaflet.js}\n<\/script>`
    : `<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""><\/script>`;
}

/**
 * Directions-only map: route polyline, origin (you), destination. Same Cavite bounds as main map.
 * Embedded in a card — zoom controls sit just inside the map (no tab-bar offset).
 * Pass vendored Leaflet ({ js, css }) to inline the library; omit for the CDN fallback.
 */
export function buildDirectionsLeafletHtml(leaflet?: VendoredLeaflet | null): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script>${DIAGNOSTICS_SNIPPET}<\/script>
  ${leafletStyleTag(leaflet)}
  <style>
    html, body { margin: 0; padding: 0; height: 100%; }
    #map { height: 100%; width: 100%; }
    .leaflet-control-attribution { font-size: 8px; max-width: 55%; }
    .leaflet-bottom.leaflet-right {
      bottom: 12px !important;
      right: 10px !important;
      margin: 0 !important;
    }
    .leaflet-bottom.leaflet-right .leaflet-control-zoom {
      border: none;
      box-shadow: 0 1px 4px rgba(0,0,0,0.28) !important;
    }
    .leaflet-bottom.leaflet-left { bottom: 8px !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  ${leafletScriptTag(leaflet)}
  <script>
    (function () {
      function postToHost(obj) {
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(obj));
          }
        } catch (e) {}
      }

      window.addEventListener('message', function (ev) {
        try {
          var raw = ev.data;
          var d = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (d && d.type === 'cavitourHostDirections' && d.payload) {
            window.__cavitourUpdateDirections(d.payload);
          }
        } catch (e) {}
      });

      try {
        var caviteBounds = L.latLngBounds(L.latLng(13.88, 120.44), L.latLng(14.52, 121.08));

        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false,
          maxBounds: caviteBounds,
          maxBoundsViscosity: 1.0,
          minZoom: 10,
          maxZoom: 19
        }).setView([14.32, 120.97], 12);

        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.control.attribution({ position: 'bottomleft' }).addTo(map);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        }).addTo(map);

        ${LEAFLET_GREEN_PIN_SNIPPET}

        var routeLayer = L.layerGroup().addTo(map);
        var markersLayer = L.layerGroup().addTo(map);

        function clampLatLng(lat, lng) {
          var sw = caviteBounds.getSouthWest();
          var ne = caviteBounds.getNorthEast();
          return [
            Math.min(Math.max(lat, sw.lat), ne.lat),
            Math.min(Math.max(lng, sw.lng), ne.lng)
          ];
        }

        window.__cavitourUpdateDirections = function (payload) {
          try {
            routeLayer.clearLayers();
            markersLayer.clearLayers();

            var uLat = payload.userLat;
            var uLng = payload.userLng;
            var dLat = payload.destLat;
            var dLng = payload.destLng;
            var geo = payload.routeGeoJson;
            var multi = payload.routeSegmentsGeoJson;

            if (dLat == null || dLng == null || isNaN(dLat) || isNaN(dLng)) return;

            L.marker([dLat, dLng], { icon: greenPinIcon }).bindPopup('Destination').addTo(markersLayer);

            if (uLat != null && uLng != null && !isNaN(uLat) && !isNaN(uLng)) {
              L.circleMarker([uLat, uLng], greenUserDotStyle(8)).bindPopup('You').addTo(markersLayer);
            }

            var boundsPoints = [[dLat, dLng]];
            if (uLat != null && uLng != null) boundsPoints.push([uLat, uLng]);

            var drewRoad = false;
            if (multi && multi.length) {
              for (var si = 0; si < multi.length; si++) {
                var seg = multi[si];
                if (seg && seg.type === 'LineString' && seg.coordinates && seg.coordinates.length > 1) {
                  L.geoJSON(seg, {
                    style: { color: '#1d4ed8', weight: 5, opacity: 0.88 }
                  }).addTo(routeLayer);
                  drewRoad = true;
                  seg.coordinates.forEach(function (c) {
                    if (c && c.length >= 2) boundsPoints.push([c[1], c[0]]);
                  });
                }
              }
            }
            if (!drewRoad && geo && geo.type === 'LineString' && geo.coordinates && geo.coordinates.length > 1) {
              L.geoJSON(geo, {
                style: { color: '#1d4ed8', weight: 5, opacity: 0.88 }
              }).addTo(routeLayer);
              drewRoad = true;
              geo.coordinates.forEach(function (c) {
                if (c && c.length >= 2) boundsPoints.push([c[1], c[0]]);
              });
            }
            if (!drewRoad && uLat != null && uLng != null) {
              L.polyline([[uLat, uLng], [dLat, dLng]], {
                color: '#64748b',
                weight: 3,
                dashArray: '6 10',
                opacity: 0.85
              }).addTo(routeLayer);
            }

            if (boundsPoints.length > 1) {
              map.fitBounds(L.latLngBounds(boundsPoints), { padding: [28, 28], maxZoom: 15 });
            } else {
              map.setView(clampLatLng(dLat, dLng), 14);
            }
          } catch (e) {}
        };

        postToHost({ type: 'mapReady' });
      } catch (initError) {
        if (window.__cavitourDiag) window.__cavitourDiag('error', 'directions map init failed: ' + (initError && initError.stack ? initError.stack : initError));
        postToHost({ type: 'mapInitFailed', message: String(initError && initError.message ? initError.message : initError) });
      }
    })();
  <\/script>
</body>
</html>`;
}

/** CDN fallback used by the Expo web iframe. */
export const DIRECTIONS_LEAFLET_HTML = buildDirectionsLeafletHtml(null);
