# Tara, Cavite!

Monorepo for the Tara, Cavite! travel guide: **mobile** (Expo), **marketing web** (Vite), **admin** (Vite), and **Supabase** backend assets.

## Repository layout

| Folder | App |
|--------|-----|
| [`apps/mobile/`](apps/mobile/) | React Native / Expo (`cavitour-mobile`) |
| [`apps/web/`](apps/web/) | Public website — Vite + React + Tailwind (`cavitour-web`) |
| [`apps/admin/`](apps/admin/) | Admin dashboard — Vite + React (`cavitour-admin`) |
| [`supabase/`](supabase/) | SQL migrations & seeds |
| [`scripts/`](scripts/) | Build helpers (e.g. Jam icons → `apps/mobile/lib/jamSvgMap.ts`) |
| [`docs/`](docs/) | Setup / verification notes, [layout reference](docs/REPOSITORY_LAYOUT.md) |
| [`apps/shared/`](apps/shared/) | Shared pipeline constants + matched offline demo catalog (`cavitour-shared`) |
| [`packages/`](packages/) | Reserved for shared code later |

## Quick start

From the **repository root**:

```bash
npm install
```

After pulling latest `main`, see [`docs/TEAM_SETUP_AFTER_PULL.md`](docs/TEAM_SETUP_AFTER_PULL.md). If `npm install` fails with certificate errors on your network, use `npm install --strict-ssl=false --no-audit` once from the repo root.

### Mobile (Expo)

```bash
cd apps/mobile && npm run start
# or from root: npm run mobile
```

Uses **tunnel** by default (see [`docs/QUICK_SETUP.md`](docs/QUICK_SETUP.md) for LAN / firewall tips). Edit routes under `apps/mobile/app/`.

### Marketing web (Vite)

```bash
cd apps/web && npm run dev
# or from root: npm run web
```

### Admin (Vite, port 3001)

```bash
cd apps/admin && npm run dev
# or from root: npm run admin
```

### Regenerate icon map (mobile)

```bash
npm run build:icons
```

### Reset Expo `app/` starter (destructive)

```bash
npm run reset-project
```

Targets `apps/mobile/` automatically.

---

## Supabase & Cavite STA-v3 data

The shared **Supabase project URL and anon key** are committed in `apps/web/src/lib/supabase.js` and `apps/mobile/lib/supabase.ts` so anyone who clones the repo can run **web** and **mobile** against the same backend without a local `.env`.

Live listings use **`public.v_cavite_establishments`**. Admin **Content management** writes to `public.places` (`source_slug` `admin:*`); web and mobile read the same view.

**New clone / co-developer:** follow [`docs/TEAM_SETUP_AFTER_PULL.md`](docs/TEAM_SETUP_AFTER_PULL.md) (npm install + migrations `20260510120003` → `20260510120004`).

Legacy STA-v3 bulk import: [`docs/CAVITE_STA_V3_SETUP.md`](docs/CAVITE_STA_V3_SETUP.md) and [`supabase/cavite_sta_v3_FULL_for_sql_editor.sql`](supabase/cavite_sta_v3_FULL_for_sql_editor.sql).

---

## Legacy `web/` folder at repo root

If you still see a top-level `web/` directory (e.g. after copying), **stop any Vite dev server**, close processes locking `web/node_modules`, then delete that folder so **only** `apps/web/` remains. See [`docs/REPOSITORY_LAYOUT.md`](docs/REPOSITORY_LAYOUT.md).

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction)
