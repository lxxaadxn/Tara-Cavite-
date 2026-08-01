export const CAVITOUR_PIN_GREEN = '#7EA00E';
export const CAVITOUR_USER_DOT_GREEN = '#7EA00E';

export const LEAFLET_GREEN_PIN_SNIPPET = `
      var CAVITOUR_PIN_GREEN = '${CAVITOUR_PIN_GREEN}';
      var CAVITOUR_USER_DOT_GREEN = '${CAVITOUR_USER_DOT_GREEN}';
      var LEAFLET_MARKER_SHADOW = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';
      function cavitourPinSvg(fill, width, height) {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 25 41" aria-hidden="true">' +
          '<path fill="' + fill + '" stroke="#ffffff" stroke-width="1.2" d="M12.5 0C5.597 0 0 5.597 0 12.5 0 19.403 12.5 41 12.5 41S25 19.403 25 12.5C25 5.597 19.403 0 12.5 0z"/>' +
          '<circle cx="12.5" cy="12.5" r="5" fill="#ffffff" fill-opacity="0.95"/></svg>';
      }
      function createGreenPinIcon() {
        return L.icon({
          iconUrl: 'data:image/svg+xml,' + encodeURIComponent(cavitourPinSvg(CAVITOUR_PIN_GREEN, 25, 41)),
          iconRetinaUrl: 'data:image/svg+xml,' + encodeURIComponent(cavitourPinSvg(CAVITOUR_PIN_GREEN, 50, 82)),
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowUrl: LEAFLET_MARKER_SHADOW,
          shadowSize: [41, 41],
          shadowAnchor: [12, 41]
        });
      }
      var greenPinIcon = createGreenPinIcon();
      function greenUserDotStyle(radius) {
        return {
          radius: radius || 8,
          fillColor: CAVITOUR_USER_DOT_GREEN,
          color: '#ffffff',
          weight: 2,
          fillOpacity: 1
        };
      }
`;
