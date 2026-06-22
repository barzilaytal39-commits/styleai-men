# StyleAI Men — Development Guide

A men's personal style assistant PWA. Users build a digital wardrobe and (planned)
get AI-generated outfit recommendations.

**Status:** Phase 1 (foundation) + Phase 2 (wardrobe management) complete.
Phase 3 (AI features) not yet implemented.

**Live DB (verified 2026-06-19):** both migrations applied to the live Supabase
project; all 6 tables and 3 storage buckets are reachable via the API. The Phase 1/2
flows (signup, login, profile creation, avatar upload, wardrobe create/list) were
traced against the live schema and match — no schema/DB bugs. `tsc -b` and
`npm run build` pass. Note: if email confirmation is enabled in the Supabase project
(the default), `signUp` returns no session, so the post-signup redirect lands on
`/login` until the email is confirmed — this is an auth setting, not a DB issue.

---

## Architecture

### Tech stack

| Concern        | Choice                                                        |
| -------------- | ------------------------------------------------------------ |
| Framework      | React 19 + TypeScript 6.x                                    |
| Build tool     | Vite 8                                                       |
| Styling        | Tailwind CSS **v4** (`@tailwindcss/vite`, no config file)    |
| UI primitives  | Hand-built ShadCN-style components on Radix UI               |
| State          | Zustand 5                                                    |
| Forms          | react-hook-form 7 + Zod 4 (`@hookform/resolvers`)            |
| Routing        | react-router-dom 7                                           |
| Backend        | Supabase (Postgres + Auth + Storage)                         |
| Icons          | lucide-react                                                 |
| PWA            | vite-plugin-pwa + workbox-window                             |

### Conventions

- **Path alias:** `@/` → `src/`.
- **Type-only imports:** `verbatimModuleSyntax` is on — use `import type { … }`.
- **Strict unused checks:** `noUnusedLocals` / `noUnusedParameters` are enabled.
- **TypeScript 6:** `baseUrl` is deprecated; tsconfig sets `"ignoreDeprecations": "6.0"`.
- **Tailwind v4:** no `tailwind.config.js`. Theme tokens (CSS vars) live in the
  global stylesheet under `@layer base` + `@theme inline`. Mobile-first; iPhone is
  the primary target (note the `pb-safe` safe-area class).

### Layering (respect this when adding features)

```
pages/        →  route-level screens, own page state + side effects
  hooks/      →  data access + business logic (Supabase calls live here)
    store/    →  Zustand global state (auth, wardrobe)
    lib/      →  framework-agnostic utilities, constants, validation, client
components/    →  presentational + composite UI (ui/, layout/, auth/, wardrobe/)
types/        →  DB types (generated-style) + app types
```

Data flows **page → hook → store/supabase**. UI components stay presentational and
receive data/handlers via props. AI features should follow the same pattern: new
hooks + pages, never mixed into auth/profile/wardrobe code.

### App bootstrap

- `src/main.tsx` mounts `<App />`.
- `src/App.tsx` wraps the tree in the toast provider + router.
- `src/routes/AppRouter.tsx` initializes the Supabase auth listener
  (`onAuthStateChange`), hydrates the profile into `authStore`, and declares routes.
- `src/routes/ProtectedRoute.tsx` gates authenticated routes, redirecting to
  `/login` and preserving the intended destination in `location.state.from`.

### Routes

| Path                  | Page                | Notes                          |
| --------------------- | ------------------- | ------------------------------ |
| `/login`              | `LoginPage`         | Public                         |
| `/signup`             | `SignupPage`        | Public                         |
| `/`                   | `DashboardPage`     | Intelligence Hub / landing (Phase 4.5A). `HomePage` is now unused |
| `/profile`            | `ProfilePage`       | Protected                      |
| `/style-profile`      | `StyleProfilePage`  | Personal Style DNA (Phase 4A); entry from Profile page card + Settings |
| `/settings`           | `SettingsPage`      | Protected                      |
| `/wardrobe`           | `WardrobePage`      | Grid + category filter         |
| `/wardrobe/insights`  | `WardrobeInsightsPage` | Health score + gaps (Phase 4.5B); entry from Wardrobe + Dashboard |
| `/wardrobe/add`       | `WardrobeAddPage`   | Create item                    |
| `/wardrobe/:id`       | `WardrobeItemPage`  | Detail + wear stats + delete   |
| `/wardrobe/:id/edit`  | `WardrobeEditPage`  | Edit item                      |
| `/outfits`            | `OutfitBuilderPage` | Rule-based outfit builder (Phase 3D) |
| `/outfits/saved`      | `SavedOutfitsPage`  | Saved outfits / history (Phase 3D-2) |
| `/outfits/:id`        | `SavedOutfitDetailPage` | Saved outfit detail + mark worn |
| `/fit-check`          | `FitCheckPage`      | AI Fit Check + history (Phase 4C); in bottom nav |
| `/fit-check/:id`      | `FitCheckDetailPage` | Saved Fit Check detail |
| `/planner`            | `WeeklyPlannerPage` | Weekly Planner + history (Phase 4D); linked from Outfits |
| `/planner/:id`        | `WeeklyPlanDetailPage` | Saved weekly plan + mark day worn |
| `/404`, `*`           | `NotFoundPage`      | Catch-all                      |

### Environment

Copy `.env.example` → `.env.local`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

`src/lib/supabase.ts` throws on startup if either is missing. The client is created
with a typed `Database` generic and `autoRefreshToken` / `persistSession` /
`detectSessionInUrl` enabled.

---

## Database

Supabase Postgres.

### SQL run order (clean project)

Apply the **migrations** in `supabase/migrations/` in filename (timestamp) order.
On a brand-new/empty Supabase project, run these in the SQL Editor top-to-bottom:

1. `supabase/migrations/20260618000000_initial_schema.sql` — full Phase 1 baseline.
   Creates every table the app uses plus forward-looking scaffolding:
   `profiles`, `style_profiles`, `wardrobe_items`, `outfits`, `outfit_items`,
   `outfit_ratings`; the shared `update_updated_at_column()` and `handle_new_user()`
   functions; the `on_auth_user_created` auth trigger; RLS policies on every
   user-owned table; and the `avatars`, `wardrobe-items`, `outfit-photos` storage
   buckets with owner-folder policies. Fully idempotent and never drops a table.
2. `supabase/migrations/20260619000000_wardrobe_ai_analysis.sql` — adds the
   AI-analysis columns to `wardrobe_items` (`style`, `formality_level`, `season`,
   `material`, `pattern`, `ai_analysis`, `ai_confidence`, `ai_analyzed_at`).
   Idempotent (`ADD COLUMN IF NOT EXISTS`), additive only.
3. `supabase/migrations/20260620000000_style_profile_dna.sql` — adds the Personal
   Style DNA columns to `style_profiles` (personal, work/lifestyle, style, fit, and
   context fields — see the file). Idempotent, additive only.
4. `supabase/migrations/20260620010000_fit_checks.sql` — creates the `fit_checks`
   table (Fit Check history) with owner-only RLS. Idempotent, additive; reuses the
   existing `outfit-photos` storage bucket for photos (no new bucket).
5. `supabase/migrations/20260620020000_weekly_plans.sql` — creates `weekly_plans`
   and `weekly_plan_days` (Weekly Planner) with owner-only RLS. Idempotent, additive.

After both run, the live DB matches `src/types/database.ts`.

> **App table name:** the app expects **`profiles`** (never `users`) — every query
> uses `.from('profiles')`.

> **Legacy files (do not use for fresh setup):** `supabase/schema.sql` and
> `supabase/wardrobe_schema.sql` are the original pre-migration scripts, kept for
> reference. The two migrations above supersede them and are the source of truth.

> **Scaffolding vs. live use:** only `profiles`, `wardrobe_items`, and the
> `avatars` + `wardrobe-items` buckets are referenced by current app code. The
> `style_profiles`, `outfits`, `outfit_items`, `outfit_ratings` tables and the
> `outfit-photos` bucket are created ahead of Phase 3 and are not yet read/written
> by the UI.

### `profiles`

Extends `auth.users` 1:1 (PK = `auth.users.id`, `ON DELETE CASCADE`).

| Column                 | Type           | Notes                              |
| ---------------------- | -------------- | ---------------------------------- |
| `id`                   | uuid PK        | = `auth.users.id`                  |
| `username`             | text unique    |                                    |
| `full_name`            | text           |                                    |
| `bio`                  | text           |                                    |
| `avatar_url`           | text           |                                    |
| `height_cm`            | int            | CHECK 100–250                      |
| `weight_kg`            | decimal(5,1)   | CHECK 30–300                       |
| `age`                  | int            | CHECK 13–120                       |
| `style_preferences`    | text[]         | default `{}`                       |
| `onboarding_completed` | bool           | default false                      |
| `created_at`           | timestamptz    |                                    |
| `updated_at`           | timestamptz    | auto-updated via trigger           |

- **Auto-provision:** `handle_new_user()` trigger inserts a profile row on signup,
  copying `full_name` from `raw_user_meta_data`.

### `wardrobe_items`

| Column         | Type        | Notes                                                       |
| -------------- | ----------- | ---------------------------------------------------------- |
| `id`           | uuid PK     |                                                           |
| `user_id`      | uuid FK     | → `auth.users.id`, `ON DELETE CASCADE`                     |
| `name`         | text        | required                                                   |
| `category`     | text        | CHECK in `tops/bottoms/outerwear/shoes/accessories`       |
| `subcategory`  | text        |                                                           |
| `brand`        | text        |                                                           |
| `color`        | text[]      | default `{}` (color *names*, not hex)                      |
| `size`         | text        |                                                           |
| `image_url`    | text        | public URL with `?t=` cache-buster                        |
| `notes`        | text        |                                                           |
| `favorite`     | bool        | default false                                             |
| `worn_count`   | int         | default 0                                                 |
| `last_worn_at` | timestamptz |                                                           |
| `style`            | text        | AI analysis; nullable                                 |
| `formality_level`  | int         | AI analysis; numeric scale (e.g. 1 casual … 5 formal) |
| `season`           | text        | AI analysis; nullable                                 |
| `material`         | text        | AI analysis; nullable                                 |
| `pattern`          | text        | AI analysis; nullable                                 |
| `ai_analysis`      | jsonb       | Raw structured analyzer output, kept verbatim         |
| `ai_confidence`    | numeric     | Overall model confidence (0.0–1.0)                    |
| `ai_analyzed_at`   | timestamptz | Last analyzed; NULL = never analyzed                  |
| `created_at`   | timestamptz |                                                           |
| `updated_at`   | timestamptz | auto-updated via trigger                                   |

### Forward-looking tables (created, not yet used by the UI)

Created by the initial migration ahead of Phase 3; no app code reads/writes them yet.

- **`style_profiles`** — one row per user (`user_id` UNIQUE): the **Personal Style
  DNA** (Phase 4A). Original columns (`preferred_styles[]`, `preferred_colors[]`,
  `avoided_colors[]`, `favorite_brands[]`, `occasions[]`, `budget_level`,
  `fit_preference`, `notes`) plus DNA columns added by the
  `20260620000000_style_profile_dna.sql` migration: personal (`height_cm`,
  `body_type`, `skin_tone`, `hair_color`), work/lifestyle (`profession`,
  `work_environment`, `field_work_frequency`, `office_work_frequency`,
  `typical_day_types[]`), style (`preferred_style`, `preferred_formality`,
  `wants_premium_look`, `wants_effortless_look`, `wants_head_turning_look`,
  `favorite_colors[]`, `avoid_colors[]`, `preferred_brands[]`, `disliked_styles[]`),
  fit (`shirt_fit_preference`, `pants_fit_preference`, `shoe_style_preference`,
  `tuck_preference`, `cuffing_preference`), and context (`climate_sensitivity`,
  `fragrance_preference`, `accessory_preference`). Edited via `/style-profile`.
- **`outfits`** — a saved outfit: `name`, `occasion`, `season`, `notes`,
  `image_url`, `favorite`, `worn_count`, `last_worn_at` (mirrors the wardrobe
  wear-stats shape).
- **`outfit_items`** — join of `outfits` ↔ `wardrobe_items` with an optional `slot`
  label; `UNIQUE(outfit_id, wardrobe_item_id)`. Ownership is **inherited** from the
  parent outfit (RLS uses an `EXISTS` check against `outfits.user_id`).
- **`outfit_ratings`** — user feedback: `rating` (1–5 CHECK), `feedback`;
  `UNIQUE(outfit_id, user_id)`.

`outfits`, `outfit_items`, `style_profiles`, and `fit_checks` are now **mirrored**
in `src/types/database.ts` and used by the app (Outfit Builder + Style DNA + Fit
Check). `outfit_ratings` remains unused/unmirrored — add it when its feature is built.

- **`fit_checks`** (Phase 4C) — one row per completed Fit Check: `photo_url`,
  optional `outfit_id` (the compared outfit, `ON DELETE SET NULL`), `occasion`,
  `desired_style`, `weather` (jsonb), `result` (jsonb — the full AI output),
  `overall_score`, `final_verdict`, `created_at`. Owner-only RLS. Photos live in the
  `outfit-photos` bucket under `{user_id}/fitcheck/…`.
- **`weekly_plans` / `weekly_plan_days`** (Phase 4D) — a saved weekly plan
  (`start_date`, `mode` = `work_week`|`full_week`) and its days. Each day:
  `day`, `day_index`, `occasion`, `location_type`, `formality_level`,
  `weather_snapshot` (jsonb), `outfit_id` (`ON DELETE SET NULL`), `notes`, `worn_at`,
  `generated_at`. Owner-only RLS on both (`weekly_plan_days` carries its own
  `user_id` for direct policies). Saving a plan also creates one `outfits` row +
  `outfit_items` per day.

### Row-level security

Every user-owned table has RLS enabled with owner-only policies
(`auth.uid() = user_id` / `= id`) for select/insert/update/delete. `outfit_items`
is the exception: it has no `user_id` of its own, so its policies authorize via an
`EXISTS` subquery on the parent `outfits` row.

### Storage buckets

| Bucket            | Public | Path convention   | Access                                |
| ----------------- | ------ | ----------------- | ------------------------------------- |
| `avatars`         | yes    | `{user_id}/…`     | Public read; owner-only writes (RLS)  |
| `wardrobe-items`  | yes    | `{user_id}/{itemId}.{ext}` | Public read; owner-only writes (RLS) |
| `outfit-photos`   | yes    | `{user_id}/…`     | Public read; owner-only writes (RLS); forward-looking |

Owner enforcement uses `(storage.foldername(name))[1] = auth.uid()`, so the
per-user folder prefix is security-relevant — keep uploads namespaced by user id.

### Type mirror

`src/types/database.ts` hand-mirrors the schema as a `Database` interface (Row /
Insert / Update per table, with `Relationships: []` and `[_ in never]: never`
stubs for Views/Functions/Enums/CompositeTypes to satisfy the Supabase generic).
`src/types/index.ts` re-exports the convenient aliases (`Profile`, `WardrobeItem`,
`WardrobeItemInsert`, `WardrobeItemUpdate`, `WardrobeCategory`). **Keep this file in
sync whenever the SQL schema changes.**

---

## Components

### UI primitives — `src/components/ui/`

ShadCN-style, manually implemented (no CLI), Radix-backed where relevant:
`button`, `input`, `label`, `textarea`, `card`, `avatar`, `separator`, `badge`,
`tabs`, `dialog` (bottom-sheet style), `toast` + `toaster` (provides the
`useToast()` context — must wrap the app).

### Layout — `src/components/layout/`

- `AppLayout` — authenticated shell; `hideHeader` prop for custom page headers;
  renders `BottomNav`.
- `AuthLayout` — centered shell for login/signup.
- `Header`, `BottomNav` — app chrome.

### Auth — `src/components/auth/`

`LoginForm`, `SignupForm` — react-hook-form + Zod (`loginSchema`, `signupSchema`).

### Wardrobe — `src/components/wardrobe/`

- `ImageUpload` — tap-to-pick image control; hidden `<input accept="image/*">`,
  calls `onChange(file: File)` and produces an object-URL preview. (No `capture`
  attribute, so iOS allows gallery selection.)
- `ItemForm` — the shared create/edit form. Accepts `defaultValues`,
  `defaultImageUrl`, `onSubmit(data, colors, imageFile?)`. Category drives the
  dependent Subcategory/Size option lists (cleared on category change). Colors are
  a multi-select chip picker keyed by name. **On image select it converts the file
  to WebP** via `normalizeToWebp` (Phase 3C-1) before storing it for upload; if the
  browser can't decode the image it shows a destructive toast ("Unsupported image
  format. Please upload JPG, PNG, or WEBP.") and keeps the form usable. The control
  is disabled (and submit shows "Processing image…") during the brief conversion.
- `ItemCard` — grid tile.
- `CategoryFilter` — horizontal category pills bound to `wardrobeStore.activeCategory`.
- `AnalysisReviewDialog` — bottom-sheet shown after AI analysis (Phase 3C-2).
  Renders every returned field as an **editable** control (category/formality/season
  as selects; the rest as inputs/textarea) seeded from the model's result, shows the
  model confidence, and calls `onConfirm(edited)` so the user reviews/corrects before
  anything is saved.

### Outfits — `src/components/outfits/`

- `OutfitCard` — renders one generated outfit (Phase 3D): horizontal item
  thumbnails per filled slot (top/bottom/shoes/belt/watch/fragrance), names, a
  color-coded total score badge (1–10), the rule-based explanation, and a
  "Save Outfit" button. When an optional `ai` ranking is passed (Phase 3E) it also
  shows the AI score badge, per-axis sub-scores, the AI explanation, and a styling
  tip — the rule score stays visible alongside.
- `SavedOutfitCard` — list tile for a saved outfit (Phase 3D-2): name, occasion,
  score badge (parsed from `notes`), wear count, slot thumbnails, saved date; links
  to the detail route. Also exports `parseScore(notes)` and `orderedItems(outfit)`
  helpers reused by the detail page.

### Fit Check — `src/components/fitcheck/`

- `FitCheckResultView` — renders a `FitCheckResult` (Phase 4C): overall + sub-score
  cards (fit/style/color/occasion/weather), strengths, issues, recommendations, item
  suggestions, fragrance, and final verdict. Shared by the live result and the saved
  detail page.

### Planner — `src/components/planner/`

- `PlanDayCard` — one day in a weekly plan (Phase 4D): weekday/date, occasion,
  weather, outfit thumbnails, explanation, an optional badge (AI/Rule score or
  "Worn"), and a slot for actions (Replace / Mark as worn). Shared by the generation
  and saved-plan views.

### State — `src/store/`

- `authStore` — `user`, `profile`, `isLoading`, `isInitialized` + setters/reset.
- `wardrobeStore` — `items`, `isLoaded`, `activeCategory` + mutators.

### Hooks — `src/hooks/`

- `useAuth` — signIn / signUp / signOut.
- `useProfile` — fetchProfile / updateProfile / uploadAvatar.
- `useWardrobe` — fetchItems, createItem, editItem, **saveAnalysis**, deleteItem,
  toggleFavorite, markAsWorn, plus `filteredItems` derived from `activeCategory`. All
  Supabase reads/writes and Storage upload/cleanup live here. `saveAnalysis(id,
  fields)` is a focused update for the AI columns that, unlike `editItem`, never
  touches `image_url`.
- `useClaudeAnalysis` — `analyze({ image_url, item_id, user_id })` invokes the
  `analyze-wardrobe-item` Edge Function via `supabase.functions.invoke` and returns
  `{ data: ClothingAnalysis | null, error: string | null }`. Maps Edge Function HTTP
  statuses to clear messages (415 unsupported format, 401 session, 429 rate limit,
  422 image, 500/502 provider, plus network failures). Exposes `isAnalyzing`.
- `useOutfits` — `saveOutfit(outfit, brief, name)` persists a generated outfit
  (one `outfits` row + one `outfit_items` row per filled slot; `isSaving`).
  `fetchOutfits()` / `fetchOutfit(id)` read saved outfits with items + related
  wardrobe data embedded via a nested PostgREST select
  (`outfit_items(*, wardrobe_items(*))`). `markOutfitWorn(outfit)` bumps the
  outfit's `last_worn_at`/`worn_count` **and** every contained wardrobe item's
  `last_worn_at`/`worn_count`, and updates the wardrobe store so the builder's
  rotation logic stays accurate (Phase 3D-2).
- `useStyleProfile` — `fetchStyleProfile()` (maybeSingle, null when unset) and
  `saveStyleProfile(form)` (upsert on `user_id`) for the Personal Style DNA
  (Phase 4A). Exposes `isSaving`.
- `usePlanner` — Phase 4D. `savePlan(start, mode, days)` (creates `weekly_plans` +
  one `outfits`/`outfit_items` + `weekly_plan_days` per day), `fetchPlans()`,
  `fetchPlan(id)` (embeds days → outfit → items), `setDayWorn(dayId)`. Wear-history
  bumping reuses `useOutfits.markOutfitWorn` in the detail page.
- `useFitCheck` — Phase 4C. `uploadPhoto(file)` (WebP-convert → `outfit-photos`
  bucket → public URL), `analyze(args)` (invokes `fit-check`, maps 401/415/429/500/502
  + network to messages), `saveFitCheck(record)`, `fetchFitChecks()`,
  `fetchFitCheck(id)`, and `asResult(json)`. Exposes `isUploading/isAnalyzing/isSaving`.
- `useWeather` — Phase 4B. Holds the city (persisted in `localStorage`), the current
  `WeatherContext`, `isLoading`, and `error`; `loadWeather(city?)` fetches via
  Open-Meteo and auto-loads the saved city on mount. All failures surface as `error`
  so outfit generation still works without weather.
- `useOutfitRanking` — `rankOutfits(brief, outfits, userProfile?)` builds the safe
  candidate payload and invokes the `rank-outfits` Edge Function (Phase 3E). Returns
  `{ data: { ranked_candidate_ids, rankings } | null, error }`; maps 401/429/500/502
  + network failures to messages that all end in "Showing rule-based order" so the
  caller can fall back. Exposes `isRanking`.

### Lib — `src/lib/`

- `supabase.ts` — typed client singleton.
- `utils.ts` — `cn()` (clsx + tailwind-merge), `formatDate`.
- `validations.ts` — Zod schemas + inferred form types.
- `wardrobe-constants.ts` — `CATEGORIES`, `SUBCATEGORIES`, `SIZES_BY_CATEGORY`,
  `COLORS` (name + hex).
- `wardrobe-insights.ts` — Wardrobe Insights logic (Phase 4.5B, deterministic, no
  AI). `wardrobeHealth(items)` → 0–100 score + per-metric breakdown (item count,
  category/analyzed/color/formality/season coverage, usage balance).
  `wardrobeSections(items, usageCounts)` → most worn / never worn / 30d+ idle /
  recently added / most versatile. `shoppingGaps(items, styleProfile, weather)` →
  prioritized gaps (missing categories/colors/formality/season + Style-DNA essentials
  for smart-casual/premium + weather-specific boots/coat) with reason + outfit impact.
- `style-profile-constants.ts` — Personal Style DNA option lists, the
  `StyleProfileFormData` model, `EMPTY_STYLE_PROFILE`, the **`PERSONAL_MODE_PRESET`**
  (electrical project manager preset), `rowToForm`/`formToRow` mappers, and
  `buildProfileSummary(row)` — the concise English, preferences-only summary sent to
  the AI ranker (Phase 4A).
- `weather.ts` — Open-Meteo client (no API key), Phase 4B. `fetchWeather(city)`
  geocodes then fetches current conditions → `WeatherContext` (temperature, apparent
  temp, precipitation, rain probability, wind, WMO condition); throws `WeatherError`
  on failure. `fetchForecast(city, startISO, endISO)` (Phase 4D) returns a
  `{ date → WeatherContext }` map for a date range (daily forecast). Helpers:
  `weatherCodeToText`, `summarizeWeatherForAI`, `isWet`, `feelsLike`.
- `planner.ts` — Weekly Planner logic (Phase 4D). `planDayBriefs(startISO, mode,
  styleProfile)` builds per-day briefs (work_week skips weekends; occasions from
  Style DNA `typical_day_types` or a default sequence — the single seam for future
  calendar-derived occasions). `chooseRotated(candidates, usedItemIds)` picks the
  least-overlapping candidate (rotation; `reused` flags limited-wardrobe repeats).
  `outfitItemIds(outfit)` lists an outfit's item ids.
- `outfit-engine.ts` — rule-based outfit builder (Phase 3D, **no AI**; weather-aware
  in Phase 4B). `buildOutfits(items, brief, weather?)` buckets wardrobe items into slots
  (top/bottom/shoes/belt/watch/fragrance), shortlists each by formality closeness +
  style match + rotation freshness, forms outfits over the shortlist cartesian, and
  returns up to 3 distinct outfits scored 1–10. Score = weighted blend of formality,
  occasion fit, style, color compatibility (neutral-favoring), completeness, and
  rotation. **AI fields first, manual/inferred fallback:** `formality_level` →
  inferred from subcategory/category when absent; `style`/`season` from AI when
  present. **Weather (Phase 4B):** when a `WeatherContext` is passed it adds a
  weather sub-score (season/material fit, rain-aware shoe choice), reweights the
  score, and adds an `outerwear` slot when feels-like < 14°C — all skipped cleanly
  when no weather is given. Also exports `OCCASIONS`, `LOCATION_TYPES`,
  `STYLE_OPTIONS`, `FORMALITY_OPTIONS`, and the `OutfitBrief`/`GeneratedOutfit` types.
- `image.ts` — `normalizeToWebp(file)` decodes an image via `createImageBitmap` +
  `<canvas>` and re-encodes it as a WebP `File` named `<original>.webp` (quality
  0.9). Throws `ImageConversionError` (with the user-facing message) for images the
  browser can't decode. Used by `ItemForm` (Phase 3C-1). The downstream upload in
  `useWardrobe` is unchanged — it derives the storage extension from the file name,
  which is now always `.webp`.

### Edge Functions — `supabase/functions/` (Deno)

Server-side proxies so the Anthropic key never reaches the browser. Each function
reads `ANTHROPIC_API_KEY` from Supabase Edge **secrets** only (never a `VITE_` var).

- **`analyze-wardrobe-item`** (Phase 3B; wired to the UI in 3C-2).
  `POST { image_url, item_id, user_id }` → Claude vision (`claude-opus-4-8`, strict
  tool use via `npm:@anthropic-ai/sdk`) → structured JSON: `category`, `subcategory`,
  `primary_color`, `secondary_color`, `style`, `formality_level` (1–5), `season`,
  `material`, `pattern`, `ai_notes`, `confidence` (0–1). CORS-enabled, typed error
  handling, prefixed logs (`[analyze-wardrobe-item]`). Does **not** touch the
  database. Model is overridable via the `ANTHROPIC_MODEL` secret.
  **Image-format guard:** before calling Anthropic it infers the media type from the
  URL extension + a `HEAD` `Content-Type` and rejects unsupported formats (AVIF,
  HEIC, …) with `HTTP 415` `{ "error": "Unsupported image format. Please upload JPG,
  PNG, or WEBP." }`. Anthropic vision supports only JPEG, PNG, WebP, GIF. Setup,
  deploy, and test instructions live in that function's `README.md`. Set the key with
  `supabase secrets set ANTHROPIC_API_KEY=...`.
- **`rank-outfits`** (Phase 3E, AI ranking layer). `POST { user_profile?, brief,
  candidate_outfits }` → Claude (`claude-opus-4-8`, strict tool use) →
  `{ ranked_candidate_ids, rankings[] }`, each ranking with `ai_score` + per-axis
  scores (occasion/color/style/premium/effortless), `weather_score` (always `null`
  for now), `explanation`, `styling_tip` (1–10 integers). **The AI only ranks
  rule-engine candidates** — it never sees or picks from the full wardrobe, and
  receives only safe structured fields (slot/name/category/colors/style/formality/
  material/pattern/last_worn_at + rule score & explanation). Reuses the same
  `ANTHROPIC_API_KEY` / optional `ANTHROPIC_MODEL` secret; no DB writes. Details in
  `supabase/functions/rank-outfits/README.md`. **Phase 4B:** also accepts an optional
  `weather` payload — when present the prompt factors it in and sets `weather_score`
  1–10 (otherwise `null`). **Redeploy required** to pick up the weather change.
- **`fit-check`** (Phase 4C, AI Fit Check). `POST { photo_url, user_profile?,
  selected_outfit?, weather?, occasion?, desired_style? }` → Claude vision
  (`claude-opus-4-8`, strict tool use) → structured JSON: `overall_score`, `fit_score`,
  `style_score`, `color_score`, `occasion_score`, `weather_score` (null without
  weather), `strengths[]`, `issues[]`, `recommendations[]`, `item_recommendations[]`,
  `fragrance_recommendation`, `final_verdict`. Evaluates fit/style/practicality; when
  `selected_outfit` is present it compares planned vs. actual and flags mismatches in
  recommendations. Image-format guard → `415`; reuses `ANTHROPIC_API_KEY`; no DB
  writes (the frontend persists to `fit_checks`). See
  `supabase/functions/fit-check/README.md`.

---

## Remaining tasks

### Phase 3 — AI features (in progress)

> The intended provider is Claude / Anthropic (`@anthropic-ai/sdk`), invoked
> **server-side** via Supabase Edge Functions — see Known issues for why the
> browser can't call it directly.

**1. Wardrobe Analyzer**
- **Phase 3B — proxy: DONE.** Edge Function `analyze-wardrobe-item` accepts
  `{ image_url, item_id, user_id }`, calls Claude vision (`claude-opus-4-8`, strict
  tool use), and returns the structured analysis. Key read only from the
  `ANTHROPIC_API_KEY` Edge secret. Not yet wired to the UI, no DB writes. See
  `supabase/functions/analyze-wardrobe-item/README.md` and the Edge Functions
  section under Architecture.
- **Phase 3C-2 — wiring: DONE.** `useClaudeAnalysis` calls the Edge Function; the
  **"Analyze with AI"** button on the item detail page (`WardrobeItemPage`) runs it,
  shows a loading state, surfaces status-specific errors (415/401/429/500/502), and
  opens `AnalysisReviewDialog` so the user reviews/edits the result before saving.
  On confirm, `useWardrobe.saveAnalysis` persists `category`, `subcategory`,
  `color[]` (from primary/secondary), `style`, `formality_level`, `season`,
  `material`, `pattern`, `ai_analysis` (full JSON), `ai_confidence`, `ai_analyzed_at`.
  - **Column mapping note:** there are no `primary_color` / `secondary_color` columns;
    they're stored in the existing `color text[]` and preserved verbatim inside the
    `ai_analysis` JSON.
  - The button is also available conceptually as a follow-up to upload — it currently
    lives on the detail page (post-create), not inside `WardrobeAddPage`.
- **Phase 3C-1 — DONE (wardrobe).** Wardrobe item images are normalized to WebP
  client-side before upload (`src/lib/image.ts` + `ItemForm`), so Storage holds only
  `.webp` for items. Undecodable formats (e.g. HEIC off iOS) show the clear error
  message. **Still pending:** the same normalization for **profile avatars**
  (`ProfilePage` / `useProfile.uploadAvatar` still upload the original format).
- Schema impact: **done** — `wardrobe_items` has `style`, `formality_level`,
  `season`, `material`, `pattern`, `ai_analysis`, `ai_confidence`, `ai_analyzed_at`
  (migration `20260619000000_wardrobe_ai_analysis.sql`; types already mirrored).

**2. Outfit Builder**
- **Phase 3D — rule-based: DONE.** `/outfits` is now `OutfitBuilderPage`: pick
  occasion / location / desired style / formality → `buildOutfits` (in
  `src/lib/outfit-engine.ts`) returns 3 scored outfits rendered as `OutfitCard`s,
  each saveable via `useOutfits.saveOutfit` (writes `outfits` + `outfit_items`). No
  Anthropic call.
  - **Notes:** `location_type` is an input only (no column) — it's recorded in the
    outfit's `notes` summary, not a dedicated field. The `fragrance` slot is rarely
    filled because there's no Fragrance subcategory in `wardrobe-constants`; it's
    matched by subcategory/name and simply omitted when absent.
- **Phase 3D-2 — saved outfits: DONE.** `/outfits/saved` lists saved outfits
  (`SavedOutfitsPage`) and `/outfits/:id` shows detail (`SavedOutfitDetailPage`) with
  **Mark as worn today**, which updates the outfit's and every item's
  `last_worn_at`/`worn_count` so the builder's rotation reflects it. Uses the
  existing `outfits.last_worn_at`/`worn_count` columns — **no `worn_at` column
  exists and none was added** (no migration needed). The builder links to the saved
  view.
- **Phase 3E — AI ranking: DONE.** The builder runs the rule engine first, then (when
  the "Use AI ranking" toggle is on) sends the candidates to the `rank-outfits` Edge
  Function. Results re-order by the AI ranking and each `OutfitCard` shows AI scores +
  styling tip; a header label reads **"AI ranked"** or **"Rule ranked"**. On any AI
  failure (or toggle off) it **falls back to the rule order** with a toast — the app
  stays fully usable without AI. The rule scoring is unchanged and still shown.
- **Phase 4B — Weather: DONE.** The builder has a Weather card (city input, persisted
  in `localStorage`, Open-Meteo). Weather feeds the rule engine (season/material/shoe
  fit, cold-weather `outerwear` slot, weather sub-score) and the `rank-outfits`
  payload (activating `weather_score`). Fully optional — generation works without it,
  and any fetch failure falls back to no-weather. **Constraint:** weather/occasion/
  formality stay hard; the profile never overrides them.
**4. Fit Check Pro (Phase 4C — DONE)**
- `/fit-check` (`FitCheckPage`, bottom-nav entry): upload a photo (auto-converted to
  WebP, stored in `outfit-photos`), optionally compare to a saved outfit, set
  occasion/style; runs the `fit-check` Edge Function with Style DNA + weather +
  planned-outfit context. Shows score cards, strengths, issues, recommendations,
  item suggestions, fragrance, and final verdict (`FitCheckResultView`), saves to
  `fit_checks`, and lists history → `/fit-check/:id` (`FitCheckDetailPage`).
- On any AI/upload failure the photo is kept, a friendly error shows, and the user
  can retry. Requires the `20260620010000_fit_checks.sql` migration + the `fit-check`
  function deployed.
- **Pending:** launching Fit Check directly from a generated outfit in the builder
  (currently compares against *saved* outfits); saved outfits still have no
  edit/delete-from-UI action.

**6. Dashboard Intelligence Hub (Phase 4.5A — DONE)**
- `DashboardPage` is the post-login landing (`/`, bottom-nav "Home"). Pure
  **read-only aggregation** over existing hooks — no new tables, Edge Functions, or
  SQL. Sections: greeting + date + city/weather + compact Style DNA; **Today's
  outfit** (rule engine + weather + DNA, AI-upgraded in the background via
  `rank-outfits` when available); quick actions (Fit Check / Planner / Wardrobe /
  Build Outfit); wardrobe stats (total / analyzed / never-worn / 30d-idle) + one
  insight; today's plan entry (or "Generate your weekly plan" CTA); last Fit Check
  (or CTA); recently worn + recently saved outfits. Every section **degrades
  gracefully** when its data source is missing. `HomePage` is retained but no longer
  routed. Extension points (notifications, Google Calendar, morning briefing, style
  insights engine) are commented at the bottom of the page.

**7. Wardrobe Insights & Shopping Gaps (Phase 4.5B — DONE)**
- `/wardrobe/insights` (`WardrobeInsightsPage`) — deterministic, **no AI/DB/deploy**.
  Shows a 0–100 wardrobe health score (with metric bars), usage sections (most worn /
  most versatile / 30d+ idle / never worn / recently added), and prioritized
  **shopping gaps** (missing categories/colors/formality/season + Style-DNA
  essentials + weather-specific) each with item type, color, priority, reason, and
  outfit impact. Logic in `src/lib/wardrobe-insights.ts`. Versatility uses outfit
  membership counts from `useOutfits`. Entry points: a TrendingUp button on the
  Wardrobe header and an "Insights →" link on the Dashboard. Loading/empty/error
  states handled; degrades when Style DNA or weather is absent.

**8. Polish & Reliability (Phase 4.5C — DONE)**
- Fixed unreachable `/settings` (Profile gear link). Standardized score display to
  always show scale (`/10`, `/100`). A11y: meaningful image alt, icon buttons keep
  `sr-only` labels. Mobile: bottom-nav items tightened + `whitespace-nowrap` so 5
  items don't overflow/wrap on small iPhones. Audited localStorage (only
  `styleai_weather_city`). Added App map, Cleanup candidates, and Next-phase (RTL)
  to this doc. No schema, auth, or Edge Function changes. `tsc -b` + build pass.

**5. Weekly Planner (Phase 4D — DONE)**
- `/planner` (`WeeklyPlannerPage`, linked from Outfits): choose start date + mode
  (Work Week 5 / Full Week 7) + AI toggle → **Generate week**. Per day it builds
  candidates with the rule engine (weather-aware via `fetchForecast`), optionally AI-
  ranks them, applies cross-day **rotation** (`chooseRotated`, reuse-with-explanation
  when the wardrobe is limited), and renders a `PlanDayCard` (date, weather, occasion,
  outfit thumbnails, explanation, score). **Replace** cycles a day's candidates;
  **Save plan** persists everything and routes to the detail view.
- `/planner/:id` (`WeeklyPlanDetailPage`): saved plan with **Mark as worn** per day,
  which bumps the outfit's and items' wear history (`useOutfits.markOutfitWorn`) and
  sets the day's `worn_at`. History list links saved plans.
- Reuses Outfit Builder + AI Ranking unchanged. Requires the
  `20260620020000_weekly_plans.sql` migration.
- **Future-ready:** `planDayBriefs` is the single seam for calendar-derived occasions
  (Google Calendar import / auto-inferred occasions / Sunday-night recommendations) —
  swap the occasion source without touching generation, save, or UI.

**3. Personal Style DNA (Phase 4A — DONE)**
- `/style-profile` (`StyleProfilePage`) — reachable via a **"Style DNA" card on the
  Profile page** (bottom-nav → Profile, top of the page) and via Settings →
  Personalization. Edits the full DNA: personal, work/lifestyle, style, fit, and context fields, with
  an **"Apply Personal Mode preset"** button. Saved via `useStyleProfile` (upsert to
  `style_profiles`). Requires the `20260620000000_style_profile_dna.sql` migration.
- The Outfit Builder loads the DNA and sends `buildProfileSummary()` (English,
  preferences only) as `user_profile` to `rank-outfits`, so AI explanations reflect
  the user's real context. The profile **never** overrides hard constraints — the
  rule engine still owns occasion/formality/availability, and the AI only ranks
  rule-engine candidates (no Edge Function change).
- **Pending:** `style_profiles` legacy columns (`preferred_styles[]`, etc.) are kept
  but unused by the new UI; could be consolidated later.

### Supporting work
- Set `ANTHROPIC_API_KEY` as a **Supabase Edge Function secret** (server-side only
  — never `VITE_`-prefixed, never in `.env.local`). Instructions in the function's
  README. Required before `analyze-wardrobe-item` will work.
- Deploy the function: `supabase functions deploy analyze-wardrobe-item`.
- Consider persisting generated outfits (new table) if they should survive reloads.

### Phase 3C recommendation — prevent AVIF/HEIC uploads

The analyzer guard returns `415` for AVIF/HEIC, but the better fix is to never store
unsupported formats. Options, in order of preference:

1. **Convert client-side before upload (recommended).** In `useWardrobe.createItem`
   / `useProfile.uploadAvatar`, draw the selected `File` onto a `<canvas>` and export
   via `canvas.toBlob(..., 'image/webp')` (or `image/jpeg`). This normalizes *every*
   input (AVIF, HEIC, PNG, …) to one supported format, also shrinks large photos, and
   makes the stored extension deterministic. Update the upload path to use the
   converted blob + a fixed `.webp`/`.jpg` extension instead of the original.
   - Caveat: browser `<canvas>` can decode AVIF/HEIC only if the OS/browser can; iOS
     Safari decodes HEIC, most desktop browsers now decode AVIF. For unreadable
     inputs, fall back to option 2's validation message.
2. **Reject at selection.** Tighten the file inputs from `accept="image/*"` to
   `accept="image/jpeg,image/png,image/webp"` and validate `file.type` on change,
   showing a toast for unsupported files. Simple, but doesn't help users whose phone
   exports HEIC and rejects rather than converts.
3. **Server-side conversion.** Convert in an Edge Function / storage transform. Most
   robust but heaviest; only worth it if client conversion proves unreliable.

Recommended: do (1) as the primary fix with (2) as the guardrail/fallback. Keep the
Edge Function's `415` guard regardless — it's the backstop for any image that slips
through (e.g. items uploaded before this change, like the existing `.avif` test item).

---

## Known issues

- **AI analyzer wired; outfit builder is rule-based (no AI yet).** The Wardrobe
  Analyzer is live end-to-end (detail-page "Analyze with AI" → Edge Function →
  review/edit → save; needs `ANTHROPIC_API_KEY`). The Outfit Builder (`/outfits`)
  generates and saves outfits with deterministic rules; an optional **AI ranking**
  layer (Phase 3E, `rank-outfits` Edge Function) re-orders and explains the
  rule-engine candidates, with automatic fallback to rule order. Saved outfits can be
  browsed (`/outfits/saved`) and opened in detail with a "Mark as worn today" action
  (Phase 3D-2); there's no edit/delete-from-UI yet. Requires the `rank-outfits`
  function to be deployed + `ANTHROPIC_API_KEY` set for the AI path.
- **Outfit quality depends on AI-analyzed items.** The engine works on un-analyzed
  items via inferred formality, but `style`/`season` matching and accurate formality
  only kick in once items have been run through "Analyze with AI". A wardrobe of
  un-analyzed items still produces outfits, just with weaker style/formality signal.
- **API key cannot live in the browser.** This is a client-only Vite SPA, so any
  `VITE_`-prefixed key ships in the bundle. The Anthropic key must stay server-side
  behind a Supabase Edge Function proxy (as `analyze-wardrobe-item` does); never
  import `@anthropic-ai/sdk` into client code with a real key.
- **Edge functions aren't covered by the frontend build.** `tsc -b` is scoped to
  `src` (+ `vite.config.ts`), so `supabase/functions/**` is type-checked only by
  Deno at deploy time, not by `npm run build`.
- **Profile avatars still accept unconverted formats.** `ProfilePage` uses
  `accept="image/*"` and `useProfile.uploadAvatar` stores the original extension, so
  AVIF/HEIC avatars are still possible. Wardrobe items are fixed (Phase 3C-1 converts
  to WebP); applying the same `normalizeToWebp` to avatars is the remaining gap.
- **Pre-existing non-WebP wardrobe images remain.** Normalization only affects new
  uploads/edits; items uploaded before Phase 3C-1 (e.g. the `.avif` test item) keep
  their old format. The Edge Function's `415` guard is the backstop for those.
- **DB types are hand-maintained.** `src/types/database.ts` is not generated from
  the live schema, so it can drift. Update it in lockstep with the SQL files.
- **Storage cleanup is best-effort.** `deleteItem` ignores Storage removal errors,
  so an orphaned image can remain if the object delete fails after the row delete.
- **Image cache-busting via `?t=`.** Re-uploading to the same path relies on the
  appended timestamp to dodge CDN caching; the old object is overwritten
  (`upsert: true`) rather than versioned.
- **No automated tests.** There is no test runner configured; verification is
  manual (`npm run dev` / `npm run build`).
- **Hebrew localization (Phase 5 + 5B).** UI chrome, labels, buttons, states, toasts,
  Style-DNA/wardrobe option labels, subcategories, colors, auth screens, and shopping-
  gap text are Hebrew with RTL. AI-generated text is Hebrew **once the three Edge
  Functions are redeployed** (prompt change). Remaining English: brand / disliked-
  style free-text the user types, the `Settings` "v0.1.0" version line, raw size
  values (e.g. "M", "32"), and any pre-existing rows whose AI text was generated in
  English before the redeploy (new analyses will be Hebrew). No English catalog /
  language switch yet (Hebrew-only).
- **Fixed: infinite `rank-outfits` loop / app stuck on Loading (Phase 5B-fix).**
  Root cause: `useOutfitRanking.rankOutfits` was a new function identity every render,
  and the Dashboard "today's outfit" effect listed it as a dependency. The effect's
  `setRec` → re-render → new `rankOutfits` → effect re-run → another `rank-outfits`
  call, repeating forever (each 502 re-rendered and refired), which froze React and
  left the app on the global loading screen. Fixes: (1) `rankOutfits` is now wrapped
  in `useCallback([])` (stable identity); (2) the Dashboard effect runs at most once
  per input **signature** (`recRanRef`) and, on AI failure, keeps the rule pick and
  **does not retry** (shows the "דירוג לפי כללים" fallback badge). The dashboard never
  blocks on AI — it shows the rule pick immediately and upgrades in the background.
- **RTL is dir-based, not fully logical-property audited.** Most layouts mirror
  correctly via flexbox/text flow; a few components still use physical spacing
  utilities that may need `ms-/me-` conversions in edge cases.
- **`/settings` was unreachable before Phase 4.5C** — now linked from the Profile
  page (gear icon). Settings rows themselves are still mostly "Coming soon" stubs.
- **Console audit is static-only.** Without running the app here, runtime
  console warnings can't be fully verified; none are evident in the source.

---

## App map (current)

Bottom nav (5): **Home** `/` · **Wardrobe** `/wardrobe` · **Outfits** `/outfits` ·
**Fit Check** `/fit-check` · **Profile** `/profile`.

| Area | Route | Reached from |
| --- | --- | --- |
| Dashboard | `/` | bottom nav (Home) |
| Wardrobe grid | `/wardrobe` | bottom nav |
| Wardrobe item | `/wardrobe/:id` | item card; "Analyze with AI" lives here |
| Add / Edit item | `/wardrobe/add`, `/wardrobe/:id/edit` | + button / item page |
| Wardrobe Insights | `/wardrobe/insights` | Wardrobe header (TrendingUp) + Dashboard "Insights →" |
| Outfit Builder | `/outfits` | bottom nav |
| Saved Outfits | `/outfits/saved` | Outfits "Saved outfits →" |
| Outfit detail | `/outfits/:id` | saved list / dashboard history |
| Weekly Planner | `/planner` | Outfits "Weekly planner →" + Dashboard quick action |
| Plan detail | `/planner/:id` | planner history / dashboard "Today's plan" |
| Fit Check | `/fit-check` | bottom nav |
| Fit Check detail | `/fit-check/:id` | history / dashboard |
| Style DNA | `/style-profile` | Profile card + Settings |
| Settings | `/settings` | Profile gear icon (added 4.5C) |
| Profile | `/profile` | bottom nav |

**Standardized UX conventions:** loading = centered spinner (`h-7 w-7 animate-spin …`)
or skeleton grid (Wardrobe); empty = icon + message + one CTA; AI/edge errors =
friendly mapped message + retry (Fit Check) or silent fallback (ranking/dashboard);
scores always carry their scale (`/10` for outfit/AI/fit, `/100` for wardrobe health).

## Cleanup candidates (do NOT delete yet)

- `src/pages/HomePage.tsx` — superseded by `DashboardPage` at `/`; no longer routed.
- `src/pages/PlaceholderPage.tsx` — no longer routed since `/outfits` became real.
- `supabase/schema.sql` and `supabase/wardrobe_schema.sql` — legacy pre-migration
  scripts; the `supabase/migrations/*` files are the source of truth.

## localStorage audit

Only one key is used: `styleai_weather_city` (the planner/weather city string,
non-sensitive). No tokens or PII are stored client-side beyond Supabase's own
auth session (managed by `@supabase/supabase-js`).

## Production & PWA (Phase 6)

### Required env vars (build-time, `VITE_`-prefixed → inlined into the bundle)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Local: `.env.local`. Production: set both in **Vercel → Project → Settings →
Environment Variables (Production)**. Template: `.env.production.example`.

### Build / output
- Build command: `npm run build` (`tsc -b && vite build`). Output dir: `dist`.
- `vercel.json` pins build/output and adds an SPA rewrite
  (`/(.*) → /index.html`) so deep links refresh correctly (`/wardrobe`, `/outfits`,
  `/fit-check`, `/planner`, `/style-profile`, …). Vercel serves real files first, so
  `sw.js`, `manifest.webmanifest`, and `/assets/*` are unaffected.

### Vercel deploy steps
1. Push the repo to GitHub and **Import** it in Vercel (framework auto-detects Vite).
2. Add the two `VITE_SUPABASE_*` env vars (Production).
3. Deploy. Build command `npm run build`, output `dist` (already in `vercel.json`).
4. In Supabase → Auth → URL Configuration, add the Vercel domain to **Site URL** /
   redirect allow-list so email confirmation/links resolve in production.
5. Edge Functions deploy separately via the Supabase CLI (unchanged this phase).

### PWA / iPhone install
- Manifest (`vite-plugin-pwa`): `name` StyleAI Men, `short_name` StyleAI, Hebrew
  description, `lang: he`, `dir: rtl`, `display: standalone`, `orientation: portrait`,
  theme `#09090b`, background `#fff`, icons 180/192/512 (PNG, generated by
  `scripts/gen-icons.mjs` from `public/favicon.svg`).
- `index.html`: `<html lang="he" dir="rtl">`, `viewport-fit=cover`, apple-mobile-web-app
  meta + `apple-touch-icon` (180). Bottom nav uses `pb-safe`
  (`env(safe-area-inset-bottom)`) so it clears the iPhone home indicator.
- **Install on iPhone:** open the site in **Safari** → Share → **Add to Home Screen**
  → Add. Launch from the home-screen icon → runs standalone (no browser chrome).

### Security notes
- Only the Supabase **anon** key + URL reach the browser (public by design; RLS
  protects data). Verified: no Anthropic key, no `service_role` key, and no
  `anthropic`/`service_role` references anywhere under `src/` or in env files.
- The Anthropic key lives **only** in Supabase Edge Function secrets
  (`ANTHROPIC_API_KEY`); the browser never calls Anthropic directly.

### Known production limitations
- **Auth email confirmation** must be configured in Supabase (Site URL/redirects) or
  signup lands on `/login` until confirmed.
- **Single JS chunk ~800 KB** (gzip ~227 KB) — no code-splitting yet (build warns).
  Acceptable for launch; a future pass can lazy-load routes.
- **Generated icons are a simple "S" mark** (brand-color tile) — replace with a
  designed icon set when available (regenerate or drop PNGs into `public/`).
- **iOS PWAs have no push notifications** below iOS 16.4 and limited background; the
  app is online-first (Supabase NetworkFirst cache only).

## i18n & RTL (Phase 5)

- **Approach:** lightweight, no library. `src/i18n/he.ts` is the Hebrew string tree
  (default + only catalog); `src/i18n/index.ts` exports `t` (the tree, type-checked,
  no runtime key lookup) and label helpers. To add English later, create `en.ts` with
  the same shape, select the active catalog in `index.ts`, and keep `Strings` as the
  contract.
- **Label helpers (`src/i18n/labels.ts`):** map internal **English values** →
  Hebrew display labels (`occasionLabel`, `categoryLabel`, `styleLabel`,
  `locationLabel`, `seasonLabel`, `slotLabel`, `frequencyLabel`, `formalityLabel`).
  Keys are the stored values and never change.
- **RTL:** `document.documentElement.dir = 'rtl'` + `lang = 'he'` set in
  `src/main.tsx`. Flexbox/text flow handle most mirroring automatically.
- **Internal values stay English** — categories (`tops`), occasions (`Office`),
  styles (`Smart Casual`), slots, seasons, AI payloads, storage paths, and function
  names are unchanged. Only presentation is localized.
- **Translated surfaces:** navigation, Dashboard, Wardrobe (list/item/add/edit/
  category filter), Wardrobe Insights, Outfit Builder + OutfitCard, Saved Outfits +
  detail, Weekly Planner + day card + detail, Fit Check + result view + detail,
  Style DNA (incl. all option labels), Profile, Settings, Analysis review dialog,
  ItemForm, ImageUpload, ItemCard, **auth (login/signup)** — titles, labels, buttons,
  empty/error/not-found states, and toasts.
- **Phase 5B label maps:** added body type, skin tone, hair color, shirt/pants fit,
  shoe style, tuck, cuffing, climate, fragrance, accessory, **subcategory**, and
  **color** maps (`subcategoryLabel`, `colorLabel`, …). `wardrobe-insights.ts` now
  emits Hebrew gap text + a stable English `key` (dedupe/analytics) per gap.

### Hebrew AI output (Phase 5B)

Edge Function prompts now instruct the model to **return user-facing text in Hebrew
and keep structured/enum-like values in English**:

- `analyze-wardrobe-item` → `ai_notes` Hebrew; `category`, `subcategory`,
  `primary_color`, `secondary_color`, `style`, `season`, `material`, `pattern` English.
- `rank-outfits` → `explanation`, `styling_tip` Hebrew; `ranked_candidate_ids`,
  `candidate_id`, all scores English/numeric.
- `fit-check` → `strengths`, `issues`, `recommendations`,
  `item_recommendations.recommendation`, `fragrance_recommendation`, `final_verdict`
  Hebrew; all scores and `item_recommendations.type` English.

**These three functions must be redeployed** for Hebrew AI output to take effect:

```bash
supabase functions deploy analyze-wardrobe-item --project-ref pbcjlgrbojtahnrefczq
supabase functions deploy rank-outfits --project-ref pbcjlgrbojtahnrefczq
supabase functions deploy fit-check --project-ref pbcjlgrbojtahnrefczq
```

No schema, secret, or signature changes — prompt-only. Fallback behavior is
unchanged (rule-based order on ranking failure; kept photo + retry on Fit Check).

## Next recommended phase

**RTL polish + AI-output language.** (a) Audit remaining physical-direction Tailwind
utilities (`ml-/mr-/left-/right-/pl-/pr-`) for RTL edge cases; (b) decide whether AI
explanations/verdicts (from `rank-outfits` / `fit-check`) should be returned in
Hebrew (prompt change, deferred this phase); (c) localize the option *values* that
lack label maps (body type, skin tone, hair color, fits, climate, fragrance,
accessory, subcategories, color names) and the auth/login screens; (d) optionally add
an English catalog + language switch.

