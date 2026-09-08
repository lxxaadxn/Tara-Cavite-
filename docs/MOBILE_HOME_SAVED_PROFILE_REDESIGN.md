# CaviTour Mobile — Home / Saved / Profile Redesign + Header + Terminal Fixes

Branch: `alexa-dev`. All work is mobile-only (`apps/mobile/`). Nothing in
`apps/web/` or `apps/admin/` is touched. Changes stay uncommitted until reviewed.

## Design direction (one-pass brief)

- **Subject / audience / job.** Tara, Cavite! traveler app for Cavite visitors.
  This pass makes Home trustworthy (ranked by real visits), Saved scannable
  (no mode toggle), and Profile public-ready (map + shared lists).
- **Tokens (existing identity, no new palette).** Teal `#1B8A70`, olive
  `#10A37F`, page cream `#F1F7F6`, ink `#241D13` / `#171717`, muted `#737373`,
  danger `#b91c1c`. Display: Bebas Neue wordmark; headings Poppins SemiBold;
  body/captions Inter. The one memorable element is the **bell + avatar
  cluster** in the home header and the **ranked "Most visited" rail**.
- **Risk taken.** Hiding Alerts/Profile from the tab bar (5 items instead of 7)
  and routing them through the header cluster. Justification: the pill bar
  crowds below 370px (`ICON_ONLY_TAB_BAR_WIDTH` in `App.tsx`); notifications
  and identity live in the header on every other traveler app.

## 1. Header + tab bar (`components/Header.tsx`, `App.tsx`)

1.1. Remove Alerts and Profile from the bottom tab bar. Keep the
`Announcements` and `Profile` routes mounted (deep links and
`navigateNamed()` keep working) but render no button:
`tabBarButton: () => null` on both `Tab.Screen`s in `MainTabs`.
Resulting bar: Home · Itineraries · Scan · Map · Saved.

1.2. Home header upper-right becomes a bell + avatar row. `Header` gains a
`showProfile` prop (the prop exists in the interface today but is dead —
wire it). `homeRightColumn` becomes a horizontal cluster:
`[bell with unread badge] [32px ringed avatar]`, `gap: 10`, vertically
centered with the wordmark. Avatar source: signed-in user's
`user_profiles.avatar_url` (fallback: shared default avatar); refresh on
`AVATAR_UPDATED_EVENT` + screen focus. Tap avatar → `navigateNamed('Profile')`.
Tap bell → existing `openAnnouncements()` (unchanged).

1.3. Non-home headers are unchanged (back / title / optional filter). No other
screen passes `showNotification` today, so no bell duplication. Only
`HomeScreen` passes `showNotification + showProfile`.

Accept: 5-tab bar on all widths; avatar+badge visible on Home; Profile and
Alerts reachable from header on every stack.

## 2. Home — Most visited rail (`screens/HomeScreen.tsx`, `lib/`)

2.1. Data source (same math as Admin → Export reports → "Most visited
destinations", `apps/admin/src/lib/adminAnalyticsExport.ts:163-191`).
New `apps/mobile/lib/mostVisitedPlaces.ts`:

```ts
fetchMostVisitedPlaceIds(client, { from, to, limit = 10 })
 // place_visits.select('place_id, created_at').limit(20000)
 // optional created_at gte/lte (default: last 30 days)
 // client-side tally → sorted ids. Graceful [] on RLS/error.
```

`HomeScreen` loads this alongside `fetchDashboardPlacesPool(supabase, 1500)`
and builds `mostVisitedRow`: ranked pictured places first (in rank order),
unranked pictured places after. The "Trending Tourist Spots" section becomes
**"Most visited in Cavite"** with rank badges `#1…#10` on the first ten cards;
"Nearby Places" is untouched.

2.2. Establishment database (already current — verify, don't migrate).
Catalog reads `CONTENT_PIPELINE.establishmentsView`
(`apps/shared/contentPipeline.js:14`) = `v_sta_v3_cavite_2025_catalog`, and
`CATALOG_SELECT` (`lib/placesFromSupabase.ts:63-64`) already fetches only the
columns Home renders. No table/column change in this pass; if
`place_visits` RLS blocks anon tally, the rail degrades to pictured order
(same graceful fallback as `catalogFromSupabase`).

2.3. Image loading. Home cards use bare RN `<Image>` with full-size
`picture` URLs and horizontal `ScrollView`s (no recycling). Changes:

- Render card art with `expo-image` (`cachePolicy="memory-disk"`,
  `priority` normal, `placeholder` + `transition={200}`), already a
  dependency (used by `announcementCards.tsx`).
- Convert the two horizontal rails to `FlatList horizontal` with
  `windowSize={5}`, `initialNumToRender={4}`, `maxToRenderPerBatch={4}`,
  `removeClippedSubviews`.
- Keep `placeHasDisplayImage` gating so text-only rows never reserve image
  boxes (layout shift audit below).

Accept: cold Home load issues no more image requests than cards mounted;
scrolling rails doesn't re-download; offline/error still shows the sample
fallback line.

## 3. Saved (`screens/SavedListScreen.tsx`, `screens/SavedListDetailScreen.tsx`)

3.1. Delete the Saved/Itineraries segmented toggle: remove `hubTab` state,
the `seg` control (`SavedListScreen.tsx:206-221`), and its styles. The header
keeps title + counts subtitle.

3.2. Single scroll, sections above the button:

- `ListHeaderComponent`: "Saved" section title + search.
- Rows: all lists (mixed content now — detail opens unfiltered, see 3.3).
- `ListFooterComponent`: "Itineraries" section — itinerary items saved across
  all of the user's lists (`saved_list_itinerary_items` filtered to the
  user's list ids, resolved via `matchItinerary`, same as
  `SavedListDetailScreen.tsx:105-166`). Row tap → `ItineraryDetail`.
  Below it, the full-width "New list" button (moved from the top of `body`).

3.3. `SavedListDetailScreen`: widen `focusKind` param to accept `'all'`
(`TypeFilter` already models it) and default `typeFilter` to `'all'` when no
`focusKind` is passed, so lists opened from the unified hub show mixed
establishment + itinerary items. The in-detail type filter stays.

3.4. Empty states: one empty card ("Nothing saved yet" + "Create your first
list"); drop the per-tab copy (`hubTab === 'Itineraries' ? …`).

Accept: no toggle anywhere on Saved; Saved section, Itineraries section, then
New List button, top to bottom; detail lists show both kinds by default.

## 4. Profile (`screens/ProfileScreen.tsx`, `lib/`)

4.1. Traveler map. New "Traveler map" card after the stats row: visited
check-ins (`getAllDestinationReachedEntries` + `fetchProfileActivity`, both
already loaded) plotted on the shared `LeafletMapView` (same component `Map`
uses), height ~220, non-scrollable preview that opens the full `Map` tab on
tap. Empty state: "Check in places to fill your map." (Choropleth stays
deferred per prior handoff.)

4.2. Public saved lists. New "Shared lists" card: lists with `type !==
'private'` (same rows `loadProfileData` already fetches — add a lightweight
`fetchOwnListsPreview` reusing the `saved_lists` query, no new table),
showing icon bubble + name + place count, tapping through to `SavedList`.
This mirrors web's `fetchPublicListsForUser` (`apps/web/src/lib/
savedPlacesSupabase.js`) and what other travelers see on a public account.

4.3. Settings incl. the new profile fields. Extend "Account settings" rows:
Edit profile fields (cover, bio, interests, city — deep-link `UserDetails`),
Notifications, Privacy, Change password (`openEdit(true)`). One row per
destination, existing `SettingsRow` component, no new chrome.

Accept: map renders visited pins; only non-private lists appear under
"Shared lists"; every new UserDetails field is one tap away from settings.

## 5. Announcement cards — compact for phones (`components/announcementCards.tsx`)

- `dateDay` 38/40 → 30/32; `cardTitle` 16/22 → 14/19, `minHeight` 42 → 36.
- `coverWrap aspectRatio` 4/3 → 16/10; `cardTextBlock` padding 14/12/10 → 12/10/8.
- `footerAction paddingVertical` 11 → 9; footer text stays 13.
- `AnnouncementsScreen` grid already single-column on phones; row `gap` 12 → 10.
- Detail bottom sheet unchanged (content density is correct there).

Accept: ≥2 cards visible on a 700px viewport; no text clipping at largest
system font (title `numberOfLines={2}` retained).

## 6. Mobile-alignment sweep (touched screens only)

- Every `inputTouchable`-style row: label `flex: 1` + `numberOfLines={1}`
  (established in UserDetails fix) — audit Home search pill, Saved search,
  New List inputs.
- Floating pill tab bar: keep `getFloatingTabBarScrollPadding` bottom insets
  on all three edited screens; no content under the bar.
- No `StyleSheet.absoluteFillObject` remnants (bulk-fixed earlier); no dead
  style blocks left behind by deletions (remove, don't orphan).
- Contrast: muted `#737373` on `#F1F7F6` only for hints ≥11sp; actions stay
  teal/ink.

## 7. Terminal errors (tsc — 31, all in `apps/mobile/`)

Baseline `npx tsc --noEmit` (verified this session): 31 errors, none in
`UserDetailsScreen / ProfileScreen / CheckinScannerModal / travelerProfile /
travelerInterests / lguFilterOptions`. Fix all 31:

| # | File:line | Error | Fix |
|---|-----------|-------|-----|
| 1 | `App.tsx:387` | `[never, never]` navigate | type the navigate call site |
| 2–3 | `parallax-scroll-view.tsx:55`, `use-theme-color.ts:14,19` | `ColorSchemeName` index | index via `Record<string, …>` / non-null theme |
| 4–5 | `ui/icon-symbol.tsx:6,38` | SFSymbol constraint/index | cast symbol map to `Record<string, …>` |
| 6 | `appFilterCategories.ts:18` | `unknown` → `string` param | narrow with `String()`/guard |
| 7–10 | `placesFromSupabase.ts:154,155,187,403` | missing `TouristAttractedRow`, deep instantiation, bad cast | declare the row type from the view shape; cast via `unknown` |
| 11 | `polyfillCrypto.ts:188` | `global` undeclared | `globalThis` |
| 12–14 | `profileActivity.ts:237-239` | props on `object` | type rows as `Record<string, unknown>` + guards |
| 15–16 | `CategoriesScreen.tsx:42,68` | never navigate / overload | typed navigate + correct params |
| 17–20 | `MapScreen.tsx:205,257,294,356` | never navigate | typed navigate calls |
| 21–23 | `PlaceDetailScreen.tsx:37,74,146` | `NavigationProp` → `{replace}` cast / never navigate | cast via `unknown`; typed navigate |
| 24 | `SavedListDetailScreen.tsx:215` | never navigate | typed navigate |
| 25 | `SavedListScreen.tsx:172` | never navigate (`handleOpenList`) | reuse the `(navigation as { navigate: (name: string, params?: object) => void })` pattern already used in `HomeScreen:144` |
| 26–27 | `SignInScreen.tsx:243,381` | never navigate / overload | typed navigate + correct params |
| 28–30 | `WebLandingScreen.tsx:16,19,34` | overloads | match declared screen params |
| 31 | (count drift — recount after) | — | keep at zero new errors in §7 files |

Rule: type-level fixes only (casts, guards, declared param types). No behavior
changes; no choropleth; no new migrations. Re-run `npx tsc --noEmit`:
filtered-to-touched-files empty, total `0`.

## Build / verify

```powershell
cd apps/mobile
npx tsc --noEmit 2>&1 | Select-String "error TS" | Measure-Object
npm run start:clear   # metro.config.js changed earlier; clear cache first
```

Manual: Home rail order matches Admin Export top-10; Saved has no toggle;
Profile shows map + shared lists; header cluster on Home; cards compact on a
small phone (≤370px width, labels hidden, icons only — existing behavior).
