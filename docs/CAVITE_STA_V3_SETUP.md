# STA-v3 Cavite 2025 — setup (Supabase + apps)

## What you get

- **One table per LGU** in `public`: `places_amadeo`, `places_bacoor_city`, `places_imus_city`, … (17 total).
- Columns: `id`, `ta_name`, `type_code`, `ta_category`, `ntdp_category`, `city_mun`, `address`, `latitude`, `longitude`, `description`, `searchable_text`, generated `search_vector`, `created_at`.
- **Unified view** `public.v_cavite_establishments` — web and mobile read/search this view.
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

## E) Apps

No extra env vars. Web/mobile use **`v_cavite_establishments`** via `apps/web/src/lib/placesFromSupabase.js` and `apps/mobile/lib/placesFromSupabase.ts`.

Routing on web: **OpenStreetMap** (not Google). Ensure device location permission on mobile for “directions from current location” flows.
