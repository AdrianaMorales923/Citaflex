# AGENTS.md

Citaflex — SaaS (Spanish UI, COP) para gestionar citas/clientes/servicios de negocios locales (Barranquilla). React 19 + TypeScript + Vite + TanStack Router + Tailwind 4 (shadcn/ui) + Supabase (Postgres + realtime). **No usa Supabase Auth**: el login es una consulta directa a `public.users` (email + password en texto plano, demo) y la sesión vive en `localStorage`. Single-business demo: el frontend no filtra por `business_id`.

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

- Providers: `AuthProvider` → `BusinessProvider` in `src/routes/__root.tsx`; `RoleProvider` inside `app/route.tsx` (layout + role permissions). **Auth:** `src/lib/auth-context.tsx` stores the logged-in user (`AppUser` from `public.users`: `id, email, role, business_name`) in `localStorage["citaflex.session"]`. `signIn` = `select from users where email=? and password_hash=?`. `signUp` inserts into `users` + `profiles` and fires `notifyRoles(["admin"])`. There is no JWT, no refresh token; `signOut` just clears localStorage — the app **requires re-running `database.sql`** after deploy or demo accounts won't exist.
- `src/routes/login.tsx` has **no role pills anymore**: the role comes from the authenticated `users` row (client → redirect a `/app/my-appointments` por el layout; demás → `/app`). Shows a demo-accounts hint (admin@/staff@/client@salonbella.co, pw `test1234`).
- `src/lib/business-settings.tsx` — the business config system: reads the first `businesses` row (`order(created_at).limit(1)`), settings live in `businesses.settings` jsonb (merged with defaults). Brand color is applied as inline CSS vars (`--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring`, `--chart-1`). Exposes `saveBusiness`, `saveSettings`, `formatMoney`.
- `src/routes/app/clients.$id.tsx` — **still a hardcoded demo** (`clientDb` mock map, no Supabase query). Only the rows in README marked "Conectado" are real; don't assume the app is fully wired.
- `src/lib/money.ts` — module-level currency formatter synced by `BusinessProvider`. **Use `useBusiness().formatMoney` or `import { formatMoney } from "@/lib/money"` — never write a new local `Intl.NumberFormat` / `"$"+toLocaleString` helper.**
- `src/lib/image-upload.ts` — uploads are resized (canvas) **base64 data URLs** stored in text columns (`profiles.avatar_url`, `businesses.logo_url`). Do NOT introduce Supabase Storage for avatars/logos.
- `src/lib/analytics.ts` — shared aggregations for Statistics/Reports. `fetchAppointments` uses nested selects `services(name, price, category)`, `staff(name)`, `clients(name)`.
- `src/lib/report-export.ts` — "PDF" export = printable HTML window (`window.print()`), not a real PDF.
- `src/lib/use-notifications.ts` — notification hook + helpers. `createNotification` (target a user) and `notifyRoles` (target admin/staff by role) both call **security-definer RPCs** (`create_notification`, `notify_roles` in `database.sql`) — the app never inserts into `notifications` directly. The bell subscribes to **realtime** (`supabase_realtime` publication in `database.sql`) filtered on `user_id`, so notifications arrive without refresh. If you add notification triggers, keep them via RPC + realtime.
- `src/routes/book.tsx` — public booking page, reads **real data** (services, staff, `service_staff`, `business_hours`, `businesses.settings`) and inserts client + appointment (`Pendiente` if `booking.manualConfirm`, else `Confirmada`). On success it calls `notifyRoles` (admins + staff). Todos los queries corren como rol `anon` (RLS desactivada en `database.sql`); si añades columnas/tablas, asegúrate de que `anon` tenga grants (sección 2 de `database.sql`) o la reserva se rompe.

## Conventions / traps

- Appointment statuses are exact Spanish strings: `Pendiente | Confirmada | Completada | Cancelada`. Code branches on these — don't rename.
- Chart colors: use `var(--chart-1)`…`var(--chart-5)` directly. CSS vars are **oklch**; `hsl(var(--chart-N))` is an invalid color → charts render **black** (this was a real bug in `reports.tsx`).
- Profile saves must `upsert(..., { onConflict: "user_id" })` — a plain `.update()` silently no-ops when the profile row is missing.
- Settings/business_hours upserts use `onConflict: "business_id,day"`.
- Currency options are **COP and USD only** (MXN was intentionally removed). Language `es-CO | es-ES | en-US` changes number/currency formatting only — the UI is Spanish-only.

## Database seed (`supabase/database.sql`)

- Demo accounts (`admin@/staff@/client@salonbella.co`, pw `test1234`) are created **directly in `public.users`** with the password as plain text. The seed uses `on conflict (email) do update` to **force** the demo password/role on every run (so re-running always restores test accounts). IDs for `profiles`, `businesses.owner_id`, `clients.user_id` and notifications are resolved **by email from `public.users`** — never reference fixed `auth/users` UUIDs (there is no `auth.users` anymore).
- The compat block drops/re-adds the `user_id` FK on `profiles`, `clients`, `notifications` to point at `public.users` instead of `auth.users`.
- **RLS is disabled on all tables**, and `anon` has full grants (section 2) — the whole app queries as `anon`. Per-user filtering of notifications happens in the app (`WHERE user_id = <id de la sesión>`).
- The `alter table ... add column if not exists` compatibility block must run **before** the `create index` statements (indexes reference added columns).
- Section 4.10 generates ~1800 deterministic historical appointments (md5-based ids, `on conflict do nothing`) so Statistics/Reports show data.
- `notifications` must be in the `supabase_realtime` publication (idempotent `do $$ ... pg_publication_tables` block) for the live bell. The RPC functions (`create_notification`, `notify_roles`) are `security definer` with `set search_path = ''` and execute granted to `anon, authenticated`.
- Editing the SQL: keep the `COMMIT;` after each DDL/policy block (header comment explains why). Running it without those against a live deployed app hits `40P01 deadlock` (AccessExclusiveLock vs. app queries).

## Misc

- `eslint.config.js` disables `no-unused-vars`; `tsconfig` sets `noUnusedLocals: false`. Dead code won't fail the build — clean it manually.
- Keep dependencies lean: only the `@radix-ui` packages actually imported (currently 11) are installed; don't re-add unused radix packages.
- Deploy is Vercel static hosting: `vercel.json` rewrites every route to `/index.html` (SPA). Needed for TanStack Router deep links (`/book`, `/login`, …) to not 404.
- Git: the machine previously hit "dubious ownership" on this repo — now fixed with `git config --global --add safe.directory D:/Files/Citaflex` (if a fresh machine errors, re-apply it). Identity/remote already configured; only commit/push when the user asks.
