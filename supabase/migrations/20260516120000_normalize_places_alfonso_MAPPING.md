# Field mapping: `places_alfonso` → normalized schema

## Source: `public.places_alfonso` (denormalized STA-v3 staging)

| Source column | Role today | Normalized target |
|---------------|------------|-------------------|
| `id` | UUID primary key | `tourist_attraction.source_places_alfonso_id` (traceability); optional `places_alfonso.tourist_attraction_id` back-link |
| `ta_name` | Establishment name | `tourist_attraction.name` |
| `type_code` | High-level STA type (text) | Lookup `type_codes.name` → `tourist_attraction.type_code_id` |
| `ta_category` | Detailed STA category (text) | Lookup `ta_categories.name` → `tourist_attraction.ta_category_id` |
| `ntdp_category` | NTDP product category (text) | Lookup `ntdp_categories.name` → `tourist_attraction.ntdp_category_id` |
| `city_mun` | City / municipality label | **Kept as text** on `tourist_attraction.city_mun`; also `cities.name` → `city_id` for FK |
| `address` | Full geocoded address | `tourist_attraction.address` |
| `latitude` / `longitude` | Coordinates | `tourist_attraction.latitude` / `.longitude` |
| `description` | Boilerplate + barangay hint | Parsed: barangay extracted; NTDP/Barangay prefix stripped from stored description |
| `searchable_text` | Search index blob | `tourist_attraction.searchable_text` |
| `search_vector` | Generated tsvector | Not copied (regenerate on `tourist_attraction` if needed) |
| `created_at` | Row timestamp | `tourist_attraction.created_at` |
| *(not in DDL)* `barangay` | Inside `description` as `Barangay: …` | **Kept as text** on `tourist_attraction.barangay`; backfilled on `places_alfonso.barangay` |

## Lookup tables populated (from Alfonso distinct values only)

### `type_codes` (from `places_alfonso.type_code`)

Examples in seed data:

- Health and Wellness
- Industrial Tourism
- Nature
- Others
- Shopping
- Special Events
- Sports and Recreation Facilities
- Customs and Traditions
- History and Culture

### `ta_categories` (from `places_alfonso.ta_category`)

Examples:

- `799 Other Events`
- `901 Others (Please specify)`
- `804 Hospital/Clinics/Medical Tourism Facilities`
- `503 Souvenirs And Delicacies`
- `Government Structures, Private Structures, and Commercial Establishments`

### `ntdp_categories` (from `places_alfonso.ntdp_category`)

Examples:

- MICE and Events Tourism
- Others
- Heatlh, Wellness, and Retirement Tourism *(typo preserved from source)*
- Leasure and Entertainment Tourism
- Nature Tourism
- Cultural Tourism
- Customs and Traditions

### `cities` (from `places_alfonso.city_mun`)

For Alfonso seed: single row **`Alfonso`** (city_mun is not normalized away; barangay is **not** a city).

## Barangay handling

- **Not** inserted into `cities`.
- Extracted with regex on `description`: `Barangay: <name>.`
- Stored on `tourist_attraction.barangay` and optionally `places_alfonso.barangay`.

Example: `NTDP: Others. Barangay: Sta. Teresa. STA-v3…` → barangay = `Sta. Teresa`.

## Entity relationship (3NF)

```text
cities ─────────────┐
type_codes ─────────┤
ta_categories ──────┼──< tourist_attraction >── source_places_alfonso_id ── places_alfonso
ntdp_categories ────┘
```

- No redundant storage of category **names** on `tourist_attraction` (only FK ids + kept `city_mun` / `barangay` text per your requirement).
- Join names via `v_tourist_attraction_normalized` or explicit JOINs.

## Adjust if your table definitions differ

Run in Supabase SQL Editor:

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'cities', 'type_codes', 'ta_categories', 'ntdp_categories',
    'tourist_attraction', 'places_alfonso'
  )
ORDER BY table_name, ordinal_position;
```

Common adjustments:

| If your column is… | Change in migration |
|--------------------|---------------------|
| `cities.city_name` instead of `name` | `INSERT INTO cities (city_name)` and JOIN on that column |
| UUID primary keys everywhere | Replace `BIGINT` FK columns with `UUID` |
| Unique on `(name, province)` for cities | Add `province = 'Cavite'` to INSERT |
| `tourist_attraction` already has `ta_name` not `name` | Rename target column in INSERT |
