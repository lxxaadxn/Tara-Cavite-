# CaviTour

Monorepo for the CaviTour Cavite travel guide: **mobile** (Expo), **marketing web** (Vite), **admin** (Vite), and **Supabase** backend assets.

## Repository layout

| Folder | App |
|--------|-----|
| [`apps/mobile/`](apps/mobile/) | React Native / Expo (`cavitour-mobile`) |
| [`apps/web/`](apps/web/) | Public website — Vite + React + Tailwind (`cavitour-web`) |
| [`apps/admin/`](apps/admin/) | Admin dashboard — Vite + React (`cavitour-admin`) |
| [`supabase/`](supabase/) | SQL migrations & seeds |
| [`scripts/`](scripts/) | Build helpers (e.g. Jam icons → `apps/mobile/lib/jamSvgMap.ts`) |
| [`docs/`](docs/) | Setup / verification notes, [layout reference](docs/REPOSITORY_LAYOUT.md) |
| [`packages/`](packages/) | Reserved for shared code later |

## Quick start

From the **repository root**:

```bash
npm install
```

### Mobile (Expo)

```bash
npm run mobile
# or
npm run start --workspace=cavitour-mobile
```

Uses **tunnel** by default (see [`docs/QUICK_SETUP.md`](docs/QUICK_SETUP.md) for LAN / firewall tips). Edit routes under `apps/mobile/app/`.

### Marketing web (Vite)

```bash
npm run web
```

### Admin (Vite, port 3001)

```bash
npm run admin
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

## Legacy `web/` folder at repo root

If you still see a top-level `web/` directory (e.g. after copying), **stop any Vite dev server**, close processes locking `web/node_modules`, then delete that folder so **only** `apps/web/` remains. See [`docs/REPOSITORY_LAYOUT.md`](docs/REPOSITORY_LAYOUT.md).

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction)
