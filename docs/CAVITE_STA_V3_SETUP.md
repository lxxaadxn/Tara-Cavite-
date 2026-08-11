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

## E) STA catalog table (`sta_v3_cavite_2025`) from UPDATED Excel

Web/mobile read **`v_sta_v3_cavite_2025_catalog`**, backed by **`sta_v3_cavite_2025`**. Refresh from:

`data/sheets/UPDATED STA-v3_CAVITE_2025 (1).xlsx`

```bash
npm run cavite:import-sta-flat
```

Optional: `--lookups path/to/snapshot.json` (default `data/sta_lookup_snapshots.json`).

**Cities / TA categories (existing tables)**

- Import **does not insert** into `cities` or `ta_categories`.
- Excel `City_Mun` / `TA_Category` are remapped onto your existing table labels via [`scripts/lib/matchStaLookups.mjs`](../scripts/lib/matchStaLookups.mjs) + the snapshot.
- Admin city / TA category selects show **only** table values (edit keeps an unmatched orphan until you pick a table value).

Refresh the snapshot from Supabase before a full re-import (SQL Editor → export names, or paste into JSON):

```sql
SELECT city_name FROM public.cities ORDER BY city_name;
SELECT category_name FROM public.ta_categories ORDER BY category_name;
```

Shape of `data/sta_lookup_snapshots.json`:

```json
{ "cities": ["Alfonso", "..."], "ta_categories": ["Falls", "..."] }
```

If you already ran an older lookups seed that inserted Excel city/TA labels, optionally run [`supabase/cleanup_excel_lookup_dupes.sql`](../supabase/cleanup_excel_lookup_dupes.sql).

Writes:

- `data/sta_v3_cavite_2025_rows.json` — remapped `city_mun` / `ta_category`
- `supabase/sta_v3_lookups_seed.sql` — upserts **only** `type_codes` + `ntdp_categories`
- `supabase/sta_v3_cavite_2025_seed.sql` — STA row seed (text labels)

**Visibility**

| Row | Stored | Shown (`is_listed`) |
|-----|--------|---------------------|
| Address + Google Maps link, not red/yellow | Yes | Yes (coords from Maps URL) |
| Missing address or Maps link | Yes | No |
| Red or yellow highlight | Yes | No |

**Apply on Supabase (order)**

1. `supabase/migrations/20260802140000_create_sta_v3_cavite_2025.sql` (once)
2. `supabase/migrations/20260808120000_sta_v3_cavite_2025_maps_fields.sql`
3. `supabase/sta_v3_lookups_seed.sql` (type_codes + ntdp_categories only)
4. `supabase/sta_v3_cavite_2025_seed.sql` (cities/TA labels already remapped)
5. `supabase/migrations/20260808121000_v_sta_v3_cavite_2025_catalog_maps.sql`
6. `supabase/migrations/20260808130000_sta_v3_cavite_2025_admin_write.sql` (authenticated INSERT/UPDATE/DELETE for admin Tourist Attractions CRUD)
7. `supabase/migrations/20260808140000_v_sta_v3_cavite_2025_catalog_lookup_by_label.sql` (catalog joins lookups by STA label)
8. `supabase/migrations/20260809120000_collapse_tourist_attractions_into_sta.sql` — hours/contact/about/media on STA; remount reviews/saved-list FKs to STA `id`; catalog view STA-only; **drops `tourist_attractions`**
9. Optional: `supabase/cleanup_excel_lookup_dupes.sql` if Excel-only city/TA labels were inserted earlier

```sql
SELECT count(*) FILTER (WHERE is_listed) AS listed,
       count(*) FILTER (WHERE NOT is_listed) AS hidden,
       count(*) AS total
FROM public.sta_v3_cavite_2025;
```

Admin **Tourism → Tourist Attractions** edits **`sta_v3_cavite_2025`** only (hours, contact, about, photos, listing fields). Public id is STA `id` (`establishment_public_id` in the catalog view). Older `Copy of STA-…` workbook is historical only.

## F) Apps (catalog = STA view + images)

No extra env vars. Web and mobile use `placesFromSupabase` → `CONTENT_PIPELINE.establishmentsView` (`v_sta_v3_cavite_2025_catalog`). Hours/media/contact come from STA columns (no `tourist_attractions` join). Only `is_listed` rows with coordinates appear in map/search. Bundled `/establishments/*.png` photos apply when a row has no DB image.

**If you still have legacy STA tables**, sync once then drop staging:

1. `supabase/migrations/20260518120000_sync_places_with_images.sql` (only if `v_cavite_establishments` exists)
2. `supabase/migrations/20260519120000_drop_legacy_sta_catalog.sql` (removes per-LGU tables and view; keeps `public.places`)

**Verify from repo root:**

```bash
npm run cavite:verify-places
```

Routing on web: **OpenStreetMap** (not Google). Ensure device location permission on mobile for “directions from current location” flows.
