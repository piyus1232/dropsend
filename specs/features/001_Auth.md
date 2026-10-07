# Auth

Email + password authentication with Supabase Auth.

## Decisions

- **Sign-in method:** Email + password only.
- **Email confirmation:** Disabled. "Confirm email" must be turned off in the Supabase dashboard (Authentication → Sign In / Providers → Email), so signup creates a session immediately.
- **User name:** Stored in Supabase Auth user metadata as `full_name` (passed via `options.data` on `signUp`). No `profiles` table yet; it can be added with the database schema later.
- **Backend:** API Route Handlers (not Server Actions), so they can be tested independently of the UI.
- **Validation:** zod schemas shared between the forms (client) and the API routes (server).
- **Forms:** react-hook-form + `@hookform/resolvers/zod`, built with shadcn `Card`, `Field`, `Input`, `Label`.
- **Landing page (`/`):** Public for everyone; logged-in users are not redirected away from it.

## Environment

Set in `apps/web/.env` (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## API Routes

All routes live in `apps/web/src/app/api/auth/`. Request and response bodies are JSON. Errors are returned as `{ "error": string }`.

| Method | Route | Body | Success | Errors |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | `{ name, email, password }` | `201 { user: { id, email, name } }`, session cookies set | `400` validation, Supabase error status (e.g. user already registered) |
| `POST` | `/api/auth/login` | `{ email, password }` | `200 { user: { id, email, name } }`, session cookies set | `400` validation / invalid credentials |
| `POST` | `/api/auth/logout` | — | `200 { success: true }`, session cookies cleared | Supabase error status |
| `GET` | `/api/auth/user` | — | `200 { user: { id, email, name } }` | `401 Unauthorized` |

### Validation rules (`src/lib/auth/schemas.ts`)

- **name** (signup): trimmed, 1–100 characters.
- **email**: trimmed, lowercased, valid email.
- **password**:
    - signup: 6–72 characters (6 is the Supabase default minimum; 72 is the bcrypt limit Supabase enforces).
    - login: required only.

`src/lib/parse-json-body.ts` reads a JSON body and validates it against a zod schema, returning the first issue's message on failure. It is generic and can be reused by future API routes.

## Route Protection

Two layers:

1. **Proxy** (`src/proxy.ts` + `src/lib/supabase/proxy.ts`). Next.js 16 renamed `middleware` to `proxy`. On every request (except static assets) it refreshes the Supabase session cookies and reads the user's claims via `getClaims()`.
    - `/login`, `/signup`: logged-in users are redirected to `/dashboard`.
    - `/`, `/api/auth/*`: public.
    - Any other page: logged-out users are redirected to `/login`.
    - Any other `/api/*` route: logged-out users get `401 { error: "Unauthorized" }`.
    - Refreshed session cookies are copied onto redirect responses.
2. **Protected layout** (`src/app/(protected)/layout.tsx`). Server-side `getClaims()` check that redirects to `/login` if there is no session; a safety net in case the proxy matcher misses a route.

Protection is **default-deny**: any new page is protected unless added to `PUBLIC_PATHS` in `src/proxy.ts`.

## Frontend

### Route groups

- `src/app/(auth)/`: `layout.tsx` (centered layout with app name and tagline), `login/page.tsx`, `signup/page.tsx`.
- `src/app/(protected)/`: `layout.tsx` (session check + header with app name, user's name and Log out button), `dashboard/page.tsx` ("Coming soon").

New authenticated pages should go inside `(protected)`.

### Components (`src/components/auth/`)

- `login-form.tsx`: email + password. On success → `router.replace("/dashboard")` + `router.refresh()`.
- `signup-form.tsx`: name + email + password (no confirm password). On success → `/dashboard`.
- `logout-button.tsx`: calls logout, then → `/login`.

Forms show per-field zod errors and the server's error message (e.g. "Invalid login credentials") below the fields.

`src/lib/auth/request.ts` (`authRequest`) is the client helper that POSTs to `/api/auth/*` and returns `{ error: string | null }`, handling network failures.

## Dependencies Added

- `zod`
- `react-hook-form`
- `@hookform/resolvers`
- shadcn components: `card`, `field`, `input`, `label`, `separator`

## Not Included / Future Work

- Password reset / forgot password.
- `profiles` table (name currently lives in auth user metadata).
- OAuth providers.
