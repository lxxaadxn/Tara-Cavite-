# STA-v3 Cavite 2025 — setup (Supabase + apps)

## What you get

- **Catalog table** `public.places` — web and mobile read establishments here (see `placesFromSupabase`).
- Legacy STA-v3 **per-LGU tables** and `v_cavite_establishments` are optional staging only; drop them after sync via `supabase/migrations/20260519120000_drop_legacy_sta_catalog.sql`.
- **Directions** use existing OSM/OSRM helpers (`apps/web/src/lib/osmUrls.js`).

## A) One-shot SQL for Supabase (copy–paste)

1. Open **Supabase Dashboard** → your project → **SQL Editor** → **New query**.
2. On your PC, open the repo file **`supabase/cavite_sta_v3_FULL_for_sql_editor.sql`**.
3. **Select all** → **Copy** → paste into the SQL Editor → **Run**.

That file includes:

- `pg_trgm` + per-table GIN indexes on `searchable_text` and `search_vector`
- All `places_*` tables + RLS + `SELECT` for `anon` / `authenticated`
- `CREATE VIEW public.v_cavite_establishments` (UNION of all LGU tables)
- **INSERT** rows for all establishments (after you run the pipeline below to regenerate)

If you change the Excel or re-geocode, run **B)** then run **`npm run cavite:sql-all`** and paste the **new** `cavite_sta_v3_FULL_for_sql_editor.sql` again (or run migration + seed files separately).

## B) Regenerate data from the Excel (on your machine)

Default workbook path is set in `scripts/import-sta-cavite-v3.mjs`. Override with:

`node scripts/import-sta-cavite-v3.mjs "C:\path\to\STA-v3_CAVITE_2025-1.xlsx"`

Commands (from repo root):

```bash
npm run cavite:import
npm run cavite:geocode
npm run cavite:seed
npm run cavite:sql-all
```

- **`cavite:geocode`** calls OpenStreetMap Nominatim (~1 request per second; ~15+ minutes for full sheet).  
- **`cavite:sql-all`** rebuilds **`supabase/cavite_sta_v3_FULL_for_sql_editor.sql`**.

## C) Verify in SQL Editor

```sql
SELECT count(*) FROM public.v_cavite_establishments
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

Expect **264** (or your current row count) after seeding.

## D) Optional: drop old `sta_cavite` schema

If you still have the previous `sta_cavite` schema from an older attempt:

```sql
DROP SCHEMA IF EXISTS sta_cavite CASCADE;
```

## E) Apps (catalog = `public.places` + images)

No extra env vars. Web and mobile read **`public.places`** via `placesFromSupabase`. Bundled `/establishments/*.png` photos apply only when a row has no `image_url`.

**If you still have legacy STA tables**, sync once then drop staging:

1. `supabase/migrations/20260518120000_sync_places_with_images.sql` (only if `v_cavite_establishments` exists)
2. `supabase/migrations/20260519120000_drop_legacy_sta_catalog.sql` (removes per-LGU tables and view; keeps `public.places`)

**Verify from repo root:**

```bash
npm run cavite:verify-places
```

Routing on web: **OpenStreetMap** (not Google). Ensure device location permission on mobile for “directions from current location” flows.
