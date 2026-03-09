# StintLab — Local / Self-Hosted Setup Guide

This document describes how Supabase is used across the project and what is needed to run StintLab against a **local or self-hosted Supabase** instance (e.g. via `supabase start`).

---

## 1. Where Supabase config is used

| Layer | File(s) | What it does |
|---|---|---|
| **Client init** | `src/integrations/supabase/client.ts` _(auto-generated, read-only)_ | Creates the single `supabase` JS client using `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` |
| **Edge Functions** | `supabase/functions/*/index.ts` | Use `Deno.env.get("SUPABASE_URL")`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Vite config** | `vite.config.ts` | No Supabase-specific logic; just builds the app |
| **Supabase project** | `supabase/config.toml` | Contains `project_id`; used by the Supabase CLI |

All 21 files that call `supabase.*` import from the single centralized client at `@/integrations/supabase/client`.

---

## 2. Mandatory environment variables

### Frontend (`.env` — Vite injects these at build time)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase API URL (`http://localhost:54321` for local) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Anon key (safe to embed in the browser) |
| `VITE_SUPABASE_PROJECT_ID` | Optional | Used only for display / non-critical config |

### Edge Functions (server-side, Deno runtime)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Same Supabase URL as above (without `VITE_` prefix) |
| `SUPABASE_ANON_KEY` | ✅ | Anon key for user-context requests |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Admin key for privileged DB/storage operations |

> When running locally: `supabase functions serve --env-file supabase/.env`

---

## 3. Supabase feature dependencies

### Auth (`supabase.auth.*`)
- **Files:** `useAuth.tsx`, `Auth.tsx`, edge functions (token verification)
- **Usage:** Email/password sign-up & sign-in, session management, `onAuthStateChange`
- **Local note:** Run `supabase start` which includes a local GoTrue auth server. Email confirmation can be disabled for dev via `supabase/config.toml` `[auth]` settings.

### Database (`supabase.from(...)`)
- **Files:** 15+ hooks/pages/contexts (see list below)
- **Tables:** `events`, `sessions`, `laps`, `staged_sessions`, `staged_laps`, `profiles`, `user_roles`, `clubs`, `club_members`, `setups`, `issues`, `beta_feedback`, `beta_bug_reports`, `app_versions`, `imports`, etc.
- **Local note:** Migrations in `supabase/migrations/` will be applied automatically by `supabase start`.

### Storage (`supabase.storage.*`)
- **Files:** `useSupabaseTelemetry.tsx`, `SetupMediaUpload.tsx`, `BetaFeedback.tsx`, `TelemetryContext.tsx`
- **Buckets:** `race-files` (private), `setup-media` (public)
- **Local note:** Local Supabase includes storage. Create the buckets via seed SQL or the local dashboard.

### Edge Functions (`supabase.functions.invoke(...)`)
- **Files:** `TelemetryContext.tsx`, `useSupabaseTelemetry.tsx`
- **Functions:** `ingest-race-file`, `scan-mdb`, `import-mdb-races`, `insert-mdb-laps`
- **Local note:** `supabase functions serve` runs them locally on port 54321.

### Realtime
- Currently **not heavily used** in production flows. Some tables may have realtime enabled at the publication level but no active channel subscriptions in the main app code.

---

## 4. Files that import the Supabase client

```
src/hooks/useAuth.tsx
src/hooks/useSupabaseTelemetry.tsx
src/hooks/useRunScope.tsx
src/hooks/useOnboarding.tsx
src/hooks/useLapFilter.tsx
src/hooks/useUserRole.tsx
src/contexts/TelemetryContext.tsx
src/contexts/LiveContext.tsx
src/contexts/GarageContext.tsx
src/pages/Auth.tsx
src/pages/Admin.tsx
src/pages/AdminFeedback.tsx
src/pages/AdminIssues.tsx
src/pages/BetaFeedback.tsx
src/pages/Clubs.tsx
src/pages/Events.tsx
src/pages/Garage.tsx
src/pages/GarageSetups.tsx
src/pages/Settings.tsx
src/components/UpdateNotification.tsx
src/components/ReportIssueDialog.tsx
src/components/garage/SetupMediaUpload.tsx
```

---

## 5. Internet-dependent features

| Feature | Requires internet? | Notes |
|---|---|---|
| Auth (sign-in/up) | Only if using hosted Supabase | Works offline with local Supabase |
| Data CRUD | Only if using hosted Supabase | Works offline with local Supabase |
| File upload (CSV/MDB) | Only if using hosted Supabase | Works offline with local Supabase + storage |
| Edge Functions | Only if using hosted Supabase | `supabase functions serve` works locally |
| Landing page images | ✅ Yes (if hosted externally) | Currently bundled in `src/assets/` — no CDN dependency |

---

## 6. Blockers for a future offline / desktop version

1. **Edge Functions require a Deno runtime** — For a fully packaged desktop app (e.g. Tauri/Electron), the edge functions would need to be replaced with local Node/Deno processes or embedded into the app.
2. **Auth depends on GoTrue** — A local Supabase instance includes GoTrue, but a fully offline desktop app would need an alternative auth mechanism or an embedded GoTrue.
3. **Storage bucket creation** — Buckets (`race-files`, `setup-media`) must be created on the local instance. A seed script should handle this.
4. **Database migrations** — All migrations in `supabase/migrations/` must be applied. `supabase start` does this automatically.
5. **No hardcoded URLs** — ✅ Already resolved. All config is env-based.

---

## Quick start (local Supabase)

```bash
# 1. Install Supabase CLI
brew install supabase/tap/supabase

# 2. Start local Supabase (applies migrations automatically)
supabase start

# 3. Copy env and fill in local values from `supabase status`
cp .env.example .env

# 4. Start the dev server
npm run dev

# 5. (Optional) Serve edge functions locally
supabase functions serve --env-file supabase/.env
```
