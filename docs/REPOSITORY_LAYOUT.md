# Repository layout

| Path | What it is |
|------|------------|
| `apps/mobile/` | **Tara, Cavite! mobile app** — Expo (React Native), `expo-router`, screens under `app/`. |
| `apps/web/` | **Marketing / web app** — Vite + React + Tailwind (landing, auth pages). |
| `apps/admin/` | **Admin dashboard** — Vite + React (port `3001` in dev). |
| `supabase/` | Database migrations, seeds, Supabase config. |
| `scripts/` | Repo automation (`build-jam-svgs.mjs`, `reset-project.js`). |
| `docs/` | Setup notes, verification checklists, this layout doc. |
| `packages/` | Reserved for future shared packages. |

## Commands (from repository root)

```bash
npm install
npm run mobile          # Expo (tunnel)
npm run web             # Vite dev — marketing web
npm run admin           # Vite dev — admin
npm run build:icons     # Regenerate `apps/mobile/lib/jamSvgMap.ts`
```

Run workspace scripts directly:

```bash
npm run dev --workspace=cavitour-web
npm run dev --workspace=cavitour-admin
npm run start --workspace=cavitour-mobile
```

## If `web/` still exists at the root

Stop any Vite dev server using it, then remove the duplicate folder so only `apps/web/` remains:

```powershell
Remove-Item -Recurse -Force web
```

Then `git add -A` and commit.
