# Team setup — latest admin, web, and mobile (after `git pull`)

Use this after pulling **`main`** (or **`CORPUZ`** if that branch has been merged). Everyone uses the **same Supabase project** already in the repo.

## 1. Install dependencies (repo root)

```bash
npm install
```

This installs `cavitour-web`, `cavitour-mobile`, and `cavitour-admin`. Shared code lives in **`apps/shared/`** (imported as `cavitour-shared` via Vite/Metro aliases — no extra npm package).

## 2. Supabase SQL (run once per project / new clone)

In [Supabase SQL Editor](https://supabase.com/dashboard), run **in order** (new query tab each file):

| Order | File |
|------|------|
| 1 | `supabase/migrations/20260510120003_admin_bootstrap_no_lgu.sql` |
| 2 | `supabase/migrations/20260510120004_v_cavite_establishments_client_fields.sql` |

Skip if your team lead already applied them. Success = **No rows returned** (not an error).

For the admin **AI Generator** chat history, also run `supabase/migrations/20260909120000_itinerary_ai_chats.sql` (needs `20260831120000_itineraries.sql` first).

Optional later (full Cavite LGU data): `20260414052141_cavite_lgu_establishments.sql`, then section 5 of `20260510120000_admin_destinations_places.sql`.

## 3. Supabase Auth (admin login)

- **Authentication → Users**: create the admin user your team will use.
- Add that email to `cavitour_admin_allowlist` (migration step 1 seeds none by default after `20260807150000_remove_forcapstone111_admin_allowlist.sql`).
- Set the same email in `apps/admin/src/lib/adminEmail.ts` and the web/mobile `adminReservedEmail` helpers if you want that address blocked from tourist signup.

## 4. Run apps

**First time (once per clone):** from repo root:

```bash
npm install
```

**Then use either style** — same as before:

```bash
# From each app folder
cd apps/admin && npm run dev
cd apps/web && npm run dev
cd apps/mobile && npm run start
# or: cd apps/mobile && npx expo start

# Or from repo root
npm run admin
npm run web
npm run mobile
```

| App | Folder command | Root command |
|-----|----------------|--------------|
| Admin | `cd apps/admin` → `npm run dev` (port 3001) | `npm run admin` |
| Web | `cd apps/web` → `npm run dev` | `npm run web` |
| Mobile | `cd apps/mobile` → `npm start` | `npm run mobile` |

**Expo Go (phone):** same Wi‑Fi as your PC → `npm start` in `apps/mobile` → scan the QR in Expo Go. Use **`npm start`**, not `npx expo start --tunnel`.

If you see **`vite` is not recognized** or **`expo` is not recognized**, you skipped step 1 or install failed:

```bash
cd C:\CaviTour
npm install
```

Then run dev again from the app folder or use root scripts (`npm run admin`, etc.). Do **not** install only inside `apps/admin` — workspaces hoist binaries to the repo root.

## 5. What is connected vs mock

| Area | Source |
|------|--------|
| **Admin → destinations** | Real `public.places` → view `v_cavite_establishments` |
| **Web search / place detail** | Same view (live) or shared demo catalog (offline) |
| **Mobile home / search** | Same view (live) or shared demo catalog (offline) |
| **Admin analytics / dashboard stats** | Mock data (OK for capstone until event tables exist) |

Pipeline constants: `apps/shared/contentPipeline.js`.

## 6. Verify admin → web/mobile

1. Admin → **Content management** → add destination (name, category, **map pin**, save).
2. Web → `/search` — should list it (banner: “Live listings from Admin…”).
3. Mobile → Home — same place after refresh.

If lists are empty but admin save works, re-run migration **20260510120004**.

## 7. Troubleshooting

- **`cavitour-shared` not found**: run `npm install` from repo root; restart dev servers. Aliases are in `apps/web/vite.config.js`, `apps/admin/vite.config.ts`, and `apps/mobile/metro.config.js`.
- **Mobile Metro**: if shared package fails, clear cache: `npm run mobile:clear`.
- **Mobile Expo manifest / icons warning**: remove `EXPO_OFFLINE` from any `apps/mobile/.env` file and restart with `npm start` (online mode). If port **8081** is busy, close other Metro terminals first.
- **`npm install` fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`** (school/corporate Wi‑Fi or antivirus): run once from repo root:
  ```bash
  npm install --strict-ssl=false --no-audit
  ```
  Or fix your network trust store; do not commit `strict-ssl=false` to the repo unless the whole team needs it.
- **Windows `nul` / git warnings**: delete the folder if it appears locally (`cmd /c "rmdir /s /q \\?\C:\path\to\CaviTour\nul"`). It is listed in `.gitignore` so it should not return from git.
