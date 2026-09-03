import L from 'leaflet';

export const CAVITOUR_PIN_GREEN = '#1B8A70';

/** Filled green dot for the user's GPS position (“you”). */
export const CAVITOUR_USER_DOT_GREEN = '#1B8A70';

const MARKER_SHADOW = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

function pinSvg(fill, width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 25 41" aria-hidden="true"><path fill="${fill}" stroke="#ffffff" stroke-width="1.2" d="M12.5 0C5.597 0 0 5.597 0 12.5 0 19.403 12.5 41 12.5 41S25 19.403 25 12.5C25 5.597 19.403 0 12.5 0z"/><circle cx="12.5" cy="12.5" r="5" fill="#ffffff" fill-opacity="0.95"/></svg>`;
}

/** Green teardrop pin used for establishments on Leaflet maps. */
export const greenLeafletPinIcon = L.icon({
  iconUrl: `data:image/svg+xml,${encodeURIComponent(pinSvg(CAVITOUR_PIN_GREEN, 25, 41))}`,
  iconRetinaUrl: `data:image/svg+xml,${encodeURIComponent(pinSvg(CAVITOUR_PIN_GREEN, 50, 82))}`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: MARKER_SHADOW,
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
});

/** Leaflet circleMarker options for the user's location. */
export function greenUserDotOptions({ radius = 8 } = {}) {
  return {
    radius,
    color: '#ffffff',
    weight: 2,
    fillColor: CAVITOUR_USER_DOT_GREEN,
    fillOpacity: 1,
  };
}
