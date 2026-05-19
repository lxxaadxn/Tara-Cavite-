/**
 * Single Leaflet + OSM map document for WebView (iOS/Android) and iframe (Expo web).
 * Host updates: native uses injectJavaScript(__cavitourUpdateMap); web uses postMessage.
 */
export const CAVITOUR_LEAFLET_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
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
    .cavitour-place-marker { background: none; border: none; }
    .cavitour-place-pin {
      width: 26px; height: 34px;
      background: #7EA00E;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      margin: -17px 0 0 -13px;
      box-shadow: 0 2px 6px rgba(31, 79, 89, 0.28);
      border: 2px solid #fff;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""><\/script>
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

      /* Cavite Province (approx. admin bbox, padded) — panning cannot leave this area */
      var caviteBounds = L.latLngBounds(L.latLng(13.88, 120.44), L.latLng(14.52, 121.08));
      var CAVITE = caviteBounds.getCenter();

      var map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        maxBounds: caviteBounds,
        maxBoundsViscosity: 1.0,
        minZoom: 10,
        maxZoom: 19
      }).setView(CAVITE, 11);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.control
        .attribution({ position: 'bottomleft' })
        .addTo(map);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
      });

      var markersLayer = L.layerGroup().addTo(map);
      var terminalsLayer = L.layerGroup().addTo(map);
      var userLayer = L.layerGroup().addTo(map);
      var didCenterUser = false;
      var didFitPlaces = false;
      var activePreviewId = null;
      var activePreviewMarker = null;

      var placeIcon = L.divIcon({
        className: 'cavitour-place-marker',
        html: '<motion class="cavitour-place-pin" aria-hidden="true"></motion>',
        iconSize: [26, 34],
        iconAnchor: [13, 34]
      });

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

      window.__cavitourUpdateMap = function (payload) {
        try {
          var markers = payload.markers || [];
          var terminals = payload.terminals || [];
          var userLat = payload.userLat;
          var userLng = payload.userLng;

          markersLayer.clearLayers();
          terminalsLayer.clearLayers();
          var bounds = [];
          if (activePreviewId && !markers.some(function (p) { return String(p.id) === activePreviewId; })) {
            clearMarkerPreview();
          }

          markers.forEach(function (p) {
            if (p.lat == null || p.lng == null || isNaN(p.lat) || isNaN(p.lng)) return;
            var m = L.marker([p.lat, p.lng], { icon: placeIcon });
            m.on('click', function (ev) {
              L.DomEvent.stopPropagation(ev);
              postMarkerPreview(m, p.id);
            });
            m.on('mouseover', function () {
              postMarkerPreview(m, p.id);
            });
            m.on('mouseout', function () {
              if (activePreviewId === String(p.id)) clearMarkerPreview();
            });
            markersLayer.addLayer(m);
            bounds.push([p.lat, p.lng]);
          });

          terminals.forEach(function (p) {
            if (p.lat == null || p.lng == null || isNaN(p.lat) || isNaN(p.lng)) return;
            var t = L.circleMarker([p.lat, p.lng], {
              radius: 8,
              fillColor: '#7EA00E',
              color: '#ffffff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.95
            });
            t.on('click', function () {
              postToHost({ type: 'markerPress', id: String(p.id), name: String(p.name || '') });
            });
            t.bindPopup('Terminal · ' + String(p.name || ''));
            terminalsLayer.addLayer(t);
            bounds.push([p.lat, p.lng]);
          });

          if (bounds.length && !didFitPlaces && userLat == null) {
            didFitPlaces = true;
            map.fitBounds(L.latLngBounds(bounds), { padding: [36, 36], maxZoom: 14 });
          }

          userLayer.clearLayers();
          if (userLat != null && userLng != null && !isNaN(userLat) && !isNaN(userLng)) {
            var clamped = clampLatLng(userLat, userLng);
            L.circleMarker([userLat, userLng], {
              radius: 9,
              fillColor: '#2563eb',
              color: '#ffffff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.9
            }).addTo(userLayer);
            if (!didCenterUser) {
              didCenterUser = true;
              map.setView(clamped, 14);
            }
          }
        } catch (e) {}
      };
    })();
  <\/script>
</body>
</html>`;
