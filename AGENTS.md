# AGENTS.md

Citaflex — SaaS (Spanish UI, COP) para gestionar citas/clientes/servicios de negocios locales (Barranquilla). React 19 + TypeScript + Vite + TanStack Router + Tailwind 4 (shadcn/ui) + Supabase (auth + Postgres). Single-business demo: el frontend no filtra por `business_id`.

## Commands

- `npm run dev` — dev server (needs `.env`, see below)
- `npm run build` — `tsc -b && vite build` (full verify)
- `npm run lint` — `eslint .` (enforces Prettier)
- `npm run format` — `prettier --write .`
- Quick verify after edits: `npx tsc --noEmit` then `npm run format` then `npm run lint`
- **No tests and no CI exist.** `lint` + `build` are the only gates.

## Setup gotchas

- Copy `.env.example` → `.env` with `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. Without them `src/lib/supabase.ts` `createClient(undefined)` throws at boot.
- DB schema: `supabase/database.sql` (run in the Supabase SQL Editor). It is **idempotent** and re-runnable. Docs no longer reference `schema.sql`.

## Routing (TanStack Router)

- File-based routes in `src/routes/`. `src/routeTree.gen.ts` is generated and **committed**; the project has **no vite plugin and no `tsr` CLI installed**, so it does NOT auto-regenerate. After adding/removing a route file, regenerate with `npx @tanstack/router-cli generate` (or the route won't resolve). Never hand-edit `routeTree.gen.ts` (also in `.prettierignore`).

## Architecture — where things live

- Providers: `AuthProvider` → `BusinessProvider` in `src/routes/__root.tsx`; `RoleProvider` inside `app/route.tsx` (layout + role permissions).
- `src/lib/business-settings.tsx` — the business config system: reads the first `businesses` row (`order(created_at).limit(1)`), settings live in `businesses.settings` jsonb (merged with defaults). Brand color is applied as inline CSS vars (`--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring`, `--chart-1`). Exposes `saveBusiness`, `saveSettings`, `formatMoney`.
- `src/routes/app/clients.$id.tsx` — **still a hardcoded demo** (`clientDb` mock map, no Supabase query). Only the rows in README marked "Conectado" are real; don't assume the app is fully wired.
- `src/lib/money.ts` — module-level currency formatter synced by `BusinessProvider`. **Use `useBusiness().formatMoney` or `import { formatMoney } from "@/lib/money"` — never write a new local `Intl.NumberFormat` / `"$"+toLocaleString` helper.**
- `src/lib/image-upload.ts` — uploads are resized (canvas) **base64 data URLs** stored in text columns (`profiles.avatar_url`, `businesses.logo_url`). Do NOT introduce Supabase Storage for avatars/logos.
- `src/lib/analytics.ts` — shared aggregations for Statistics/Reports. `fetchAppointments` uses nested selects `services(name, price, category)`, `staff(name)`, `clients(name)`.
- `src/lib/report-export.ts` — "PDF" export = printable HTML window (`window.print()`), not a real PDF.
- `src/lib/use-notifications.ts` — notification hook + helpers. `createNotification` (target a user) and `notifyRoles` (target admin/staff by role) both call **security-definer RPCs** (`create_notification`, `notify_roles` in `database.sql`) — the app never inserts into `notifications` directly (RLS would block targeting others, and anon `/book` can't read `users`). The bell subscribes to **realtime** (`supabase_realtime` publication in `database.sql`) filtered on `user_id`, so notifications arrive without refresh. If you add notification triggers, keep them via RPC + realtime.
- `src/routes/book.tsx` — public booking page, reads **real data** (services, staff, `service_staff`, `business_hours`, `businesses.settings`) and inserts client + appointment (`Pendiente` if `booking.manualConfirm`, else `Confirmada`). On success it calls `notifyRoles` (admins + staff). Relies on the **anon RLS grants** in `database.sql` (insert on `clients`/`appointments`; select on appointments limited to `date,time,staff_id,service_id,status`). If you add columns to those tables, extend the anon grants or booking breaks.

## Conventions / traps

- Appointment statuses are exact Spanish strings: `Pendiente | Confirmada | Completada | Cancelada`. Code branches on these — don't rename.
- Chart colors: use `var(--chart-1)`…`var(--chart-5)` directly. CSS vars are **oklch**; `hsl(var(--chart-N))` is an invalid color → charts render **black** (this was a real bug in `reports.tsx`).
- Profile saves must `upsert(..., { onConflict: "user_id" })` — a plain `.update()` silently no-ops when the profile row is missing.
- Settings/business_hours upserts use `onConflict: "business_id,day"`.
- Currency options are **COP and USD only** (MXN was intentionally removed). Language `es-CO | es-ES | en-US` changes number/currency formatting only — the UI is Spanish-only.

## Database seed (`supabase/database.sql`)

- Auth test users (`admin@/staff@/client@salonbella.co`, pw `test1234`) are resolved **by email to their real `auth.users.id`** — never reference fixed auth UUIDs outside the `insert into auth.users` literals.
- Use `ON CONFLICT DO NOTHING` **without a target** for `auth.users` (its email unique is a partial index → `on conflict (email)` fails with 42P10).
- The `alter table ... add column if not exists` compatibility block must run **before** the `create index` statements (indexes reference added columns).
- Section 4.10 generates ~1800 deterministic historical appointments (md5-based ids, `on conflict do nothing`) so Statistics/Reports show data.
- `notifications` must be in the `supabase_realtime` publication (idempotent `do $$ ... pg_publication_tables` block) for the live bell. The RPC functions (`create_notification`, `notify_roles`) are `security definer` with `set search_path = ''` and execute granted to `anon, authenticated`.
- Editing the SQL: keep the `COMMIT;` after each DDL/policy block (header comment explains why). Running it without those against a live deployed app hits `40P01 deadlock` (AccessExclusiveLock vs. app queries).

## Misc

- `eslint.config.js` disables `no-unused-vars`; `tsconfig` sets `noUnusedLocals: false`. Dead code won't fail the build — clean it manually.
- Keep dependencies lean: only the `@radix-ui` packages actually imported (currently 11) are installed; don't re-add unused radix packages.
- Deploy is Vercel static hosting: `vercel.json` rewrites every route to `/index.html` (SPA). Needed for TanStack Router deep links (`/book`, `/login`, …) to not 404.
- Git: the machine previously hit "dubious ownership" on this repo — now fixed with `git config --global --add safe.directory D:/Files/Citaflex` (if a fresh machine errors, re-apply it). Identity/remote already configured; only commit/push when the user asks.
