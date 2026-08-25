# Brixton Property — Investor Portal

Investor-facing portal and internal admin panel for Brixton Property, built on React + Vite +
TypeScript and Supabase (Postgres + Auth + Storage). Deployed on Netlify, connected to this
GitHub repo for automatic deploys on push.

The live site launches empty — no example properties, investors, or documents. All real content
is entered afterward by an admin through the admin panel.

## Stack

- React 18 + Vite + TypeScript + React Router (data router)
- `@supabase/supabase-js` + `@tanstack/react-query`
- Hand-authored CSS (`src/styles`) ported from the original design prototype — no CSS framework
- Netlify Functions (`netlify/functions`) for the small number of operations that require the
  Supabase **service_role** key (creating logins, generating invite links, banning a deactivated
  user at the Auth layer) — everything else talks to Supabase directly from the browser using the
  anon key, gated entirely by Row Level Security.

## One-time setup (do this before the app will work)

These are the steps that can't be done from code with the anon/service_role keys alone — they
need someone with dashboard access to the Supabase project and, later, Netlify.

1. **Run the database migration.** Open the Supabase Dashboard → SQL Editor → New query, paste
   the entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql),
   and run it. This creates every table, RLS policy, trigger, and the three storage buckets in one
   shot. It's safe to re-run if it fails partway through.
2. **Supabase Dashboard → Authentication → Settings:**
   - Disable "Allow new users to sign up" (no public sign-up — accounts are admin-created only).
   - Add `http://localhost:5173/accept-invite` and `https://investor.brixtonproperty.co.nz/accept-invite`
     (once deployed) to the redirect URL allowlist.
   - Enable **TOTP** as an available MFA factor type.
3. **Environment variables.** Copy `.env.example` to `.env.local` and fill in the project's URL,
   anon/publishable key, and service_role/secret key (Supabase Dashboard → Project Settings → API).
   `.env.local` is gitignored — never commit it.
4. **Create the first admin.** Run:
   ```bash
   npm run bootstrap-admin
   ```
   This creates `riley@brixtonproperty.co.nz` as the first admin account and prints a one-time
   invite link. Open it once to set a password and enroll MFA — after that there's a working admin
   login to use the admin panel from.
5. **Deploy:**
   - Push this repo to GitHub (already done as part of the initial build).
   - In Netlify: "Import an existing project" → connect the GitHub repo. Build settings are
     pre-filled from `netlify.toml`.
   - Set four environment variables in Netlify's site settings: `VITE_SUPABASE_URL`,
     `VITE_SUPABASE_ANON_KEY` (client build), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
     (Functions runtime only — never exposed to the browser bundle).
   - Add the `investor.brixtonproperty.co.nz` custom domain in Netlify once you're ready to go
     live, then add the DNS record Netlify gives you at the domain's DNS provider.

## Local development

```bash
npm install
npm run dev
```

Requires `.env.local` (step 3 above) and the migration (step 1) already applied to a real
Supabase project — there's no local/offline mode.

## Security model, in brief

- **RLS on every table, no exceptions.** Investors can only read rows linked to their own
  `investor_account_id` (via their `investor_users` row); this is enforced in Postgres and holds
  even against a direct API call or guessed URL, not just a hidden UI. Admin access requires both
  `role = 'admin'` **and** a completed MFA session (`aal2`) — see `is_admin_verified()` in the
  migration.
- **service_role key never ships to the browser.** It's used only in local scripts
  (`scripts/bootstrap-admin.mjs`) and Netlify Functions (`netlify/functions/*`), both of which run
  server-side. Every function re-verifies the caller is a real, MFA-verified admin itself — it
  never trusts a client-claimed role.
- **Documents and photos are private buckets**, served only via short-expiry signed URLs generated
  fresh per request and gated by the same RLS rules as the database.
- **Audit log** (`audit_log` table) records every insert/update/delete on business tables, via a
  trigger — who changed what, and when.

Before go-live, confirm: RLS is actually enabled on every table (not just the obvious ones), a
logged-in investor genuinely cannot reach admin routes or another investor's data via direct URL,
MFA is enforced for every admin, and Supabase's point-in-time recovery / backups are turned on.

## Project structure

```
src/
  app/            auth context, route guards, router
  components/     shared, role-agnostic UI (Card, PhotoGrid, DocTable, Lightbox, ...)
  features/       pages — investor-facing and admin, mirrored 1:1 where the brief calls for it
  queries/        one file per entity, wraps supabase-js calls in React Query hooks
  lib/            supabase client, signed-URL helpers, formatting
  types/          hand-written database types (kept in sync with the migration by hand)
netlify/functions/ the only code paths that touch the service_role key
supabase/migrations/ SQL — run once, by hand, in the Supabase SQL Editor
scripts/          local-only bootstrap script
```
