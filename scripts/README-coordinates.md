# Accurate map coordinates (establishments + terminals)

Coordinates are **WGS84** — the same system Google Maps and OpenStreetMap/Leaflet use. No projection conversion is required.

## Terminals (81)

Already geocoded into `data/cavite_terminals_geocoded.json` and `apps/shared/terminalCoordinates.json`.

**Apply to Supabase:** run in SQL Editor:

`supabase/migrations/20260520120000_terminal_coordinates.sql`

## Establishments (264 STA-v3 rows)

Many rows still share city-centroid coordinates from an older Nominatim pass. For **per-place** accuracy (Google Maps pin quality), use Google:

1. Enable **Geocoding API** and **Places API** on your Google Cloud project.
2. Set `GOOGLE_MAPS_API_KEY` in the environment.
3. From repo root:

```bash
node scripts/geocode-cavite-coordinates.mjs --refresh-establishments
node scripts/generate-coordinate-migrations.mjs
```

4. Run the generated `supabase/migrations/20260520120000_establishment_coordinates.sql` in Supabase.

Without a Google key, the same script uses OpenStreetMap Nominatim (slower, less accurate for small businesses).

## Regenerate everything

```bash
node scripts/geocode-cavite-coordinates.mjs --terminals-only
node scripts/patch-terminal-geocodes.mjs
node scripts/geocode-cavite-coordinates.mjs --refresh-establishments   # optional
node scripts/generate-coordinate-migrations.mjs
```
