/**
 * Directions-only map: route polyline, origin (you), destination. Same Cavite bounds as main map.
 * Embedded in a card — zoom controls sit just inside the map (no tab-bar offset).
 */
export const DIRECTIONS_LEAFLET_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
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
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""><\/script>
  <script>
    (function () {
      window.addEventListener('message', function (ev) {
        try {
          var raw = ev.data;
          var d = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (d && d.type === 'cavitourHostDirections' && d.payload) {
            window.__cavitourUpdateDirections(d.payload);
          }
        } catch (e) {}
      });

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

      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
      });

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

          if (dLat == null || dLng == null || isNaN(dLat) || isNaN(dLng)) return;

          L.marker([dLat, dLng]).bindPopup('Destination').addTo(markersLayer);

          if (uLat != null && uLng != null && !isNaN(uLat) && !isNaN(uLng)) {
            L.circleMarker([uLat, uLng], {
              radius: 8,
              fillColor: '#2563eb',
              color: '#ffffff',
              weight: 2,
              fillOpacity: 0.95
            }).bindPopup('You').addTo(markersLayer);
          }

          var boundsPoints = [[dLat, dLng]];
          if (uLat != null && uLng != null) boundsPoints.push([uLat, uLng]);

          if (geo && geo.type === 'LineString' && geo.coordinates && geo.coordinates.length > 1) {
            L.geoJSON(geo, {
              style: { color: '#1d4ed8', weight: 5, opacity: 0.88 }
            }).addTo(routeLayer);
            geo.coordinates.forEach(function (c) {
              if (c && c.length >= 2) boundsPoints.push([c[1], c[0]]);
            });
          } else if (uLat != null && uLng != null) {
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
    })();
  <\/script>
</body>
</html>`;
