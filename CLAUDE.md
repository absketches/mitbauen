# Mitbauen — Project Guide for Claude Code

## What is this project?
Mitbauen (German: "to build together") is a platform where people post project ideas, show their personal commitment, and find contributors to build with. The core mechanic: before posting an idea, the founder must declare what they personally commit — hours per week, their role, and what they bring. This commitment signal is displayed prominently on every idea card to attract serious contributors.

## Tech Stack
- **Frontend + API routes:** Next.js 16 (App Router, TypeScript, Tailwind CSS)
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth with GitHub OAuth
- **Deployment:** Vercel (frontend), Supabase (database)
- **Package manager:** npm
- **Testing:** Vitest, Testing Library (unit + integration)

## Key Conventions
- Next.js 16 uses `proxy.ts` instead of `middleware.ts` (renamed in v16)
- Two Supabase clients: `lib/supabase.ts` (browser) and `lib/supabase-server.ts` (server)
- All mutations use **Server Actions** (`app/actions/`) — not API routes
- All schema changes go through migrations: `supabase migration new <name>` → edit SQL → `supabase db push`
- Never run SQL directly in the dashboard without also creating a migration file
- Test SQL in Supabase SQL Editor first, then put it in a migration file

## Project Structure
```
mitbauen/
├── app/
│   ├── layout.tsx               # Root layout — includes Navbar
│   ├── page.tsx                 # Homepage (static)
│   ├── globals.css              # Global styles (light mode only — dark mode removed)
│   ├── actions/
│   │   ├── auth.ts              # signOut server action
│   │   ├── applications.ts      # applyToRole, respondToApplication
│   │   └── comments.ts          # addComment
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts         # OAuth callback handler
│   ├── login/
│   │   └── page.tsx             # Login page (GitHub OAuth, prompt: login forced)
│   ├── projects/
│   │   ├── page.tsx             # Browse feed — responsive 3-col grid, oldest first
│   │   ├── new/
│   │   │   └── page.tsx         # Create project form
│   │   └── [id]/
│   │       └── page.tsx         # Project detail: roles, apply, comments, owner panel
│   └── profile/
│       └── page.tsx             # User profile (TODO)
├── components/
│   ├── Navbar.tsx               # Sticky full-width navbar (server, hidden on /login)
│   ├── UserMenu.tsx             # Avatar dropdown: profile + sign out (client)
│   ├── SignOutButton.tsx        # Legacy — superseded by UserMenu/signOut action
│   └── projects/
│       ├── ProjectForm.tsx      # Create project form with client-side validation
│       ├── ApplyModal.tsx       # Bottom-sheet on mobile / dialog on desktop
│       └── ApplicationsPanel.tsx # Owner-only panel: view + accept/reject applications
├── lib/
│   ├── supabase.ts              # Browser Supabase client
│   └── supabase-server.ts       # Server Supabase client
├── supabase/
│   └── migrations/              # All DB migrations in order
├── __tests__/
│   ├── helpers/
│   │   └── in-memory-db.ts      # TestDatabase + createTestClient + seed helpers
│   ├── actions/                 # Unit tests for server actions
│   ├── components/              # Unit tests for React components
│   └── integration/             # Integration tests (in-memory DB, full action flow)
├── .github/
│   └── workflows/
│       └── test.yml             # CI: type check, tests, coverage, build smoke test
├── proxy.ts                     # Route protection (Next.js 16)
└── .env.local                   # Supabase keys (never commit)
```

## Database Schema

### Tables
- **users** — extends Supabase auth.users. Created automatically via trigger on signup.
- **projects** — the core entity. Has commitment fields (hours_pw, role, description).
- **roles** — open roles needed for a project. Each project has 1+ roles.
- **applications** — a user applying to a role on a project.
- **votes** — upvotes on projects. Unique constraint: one per user per project.
- **comments** — flat comment thread on a project.

### Key relationships
```
users → projects (owner_id)
projects → roles (project_id)
roles → applications (role_id)
users → applications (applicant_id)
users → votes (user_id)
projects → votes (project_id)
users → comments (user_id)
projects → comments (project_id)
```

### Enums
- `project_status`: draft, active, dormant, completed
- `role_status`: open, filled, closed
- `application_status`: pending, accepted, rejected

### RLS policies in place
- **projects**: public select, owner insert/update
- **roles**: public select, project owner insert
- **applications**: authenticated insert (own), select (own or project owner), update (project owner only)
- **votes**: public select, authenticated insert (own), own delete
- **comments**: public select, authenticated insert (own)

### Important: User trigger
A PostgreSQL trigger `on_auth_user_created` fires on `auth.users` INSERT and calls `handle_new_user()` to create a row in `public.users`. This trigger was created manually in the Supabase dashboard (not via migration) because Supabase restricts DDL on the auth schema. The function uses `security definer` and has a defensive `exception when others then return new` to prevent auth failures if the insert fails.

## Auth Flow
1. User clicks "Continue with GitHub" on `/login`
2. Supabase redirects to GitHub OAuth with `prompt: login` (forces account picker — needed for multi-account switching)
3. GitHub redirects to `https://<project-ref>.supabase.co/auth/v1/callback`
4. Supabase exchanges code, creates auth.users row, fires trigger → creates public.users row
5. App callback at `/auth/callback/route.ts` exchanges code for session
6. User is redirected to `/projects`

### Sign out
Sign out uses a **Server Action** (`app/actions/auth.ts`). It calls `supabase.auth.signOut()` then explicitly deletes all `sb-*` cookies via `next/headers` before redirecting. This is necessary because Supabase's `onAuthStateChange` cookie flush is async and races the redirect if you rely on it alone.

### Protected routes (proxy.ts)
- `/projects/new` — requires auth
- `/profile` — requires auth
- `/login` — redirects to `/projects` if already authenticated

The proxy also sets an `x-pathname` request header so server components (e.g. Navbar) can conditionally render based on the current route.

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxx
```

## Testing

### Running tests
```bash
npm test                 # Run all tests once
npm run test:watch       # Watch mode
npm run test:coverage    # Run with coverage report
```

### Test structure
- **Unit tests** (`__tests__/actions/`, `__tests__/components/`) — mock all external deps, test logic in isolation
- **Integration tests** (`__tests__/integration/`) — use `TestDatabase` (in-memory store) via `createTestClient`, data persists across action calls within a test

### TestDatabase
`__tests__/helpers/in-memory-db.ts` provides:
- `TestDatabase` — in-memory store with `from()`, chainable query builder, FK relation resolution
- `createTestClient(db, userId)` — returns a Supabase-shaped client backed by the store
- `seedUser / seedProject / seedRole` — seed helpers for test setup

### CI (`test.yml`)
- Runs on push to `main`/`dev` and all PRs to `main`
- Jobs: **type check** → **tests + coverage** → **coverage PR comment** → **build smoke test**
- Coverage report posted as PR comment (✅/⚠️/❌ by metric), full HTML report uploaded as artifact

## What's Built
- [x] Homepage
- [x] GitHub OAuth login (with forced account picker)
- [x] Auth callback + session handling
- [x] Route protection via proxy.ts
- [x] Auto user profile creation on signup (trigger)
- [x] Persistent navbar with user avatar dropdown (sign out, profile link)
- [x] Create project form with client-side validation (length checks on all fields)
- [x] Projects feed — responsive 3-col grid, oldest first
- [x] Single project page — roles, commitment badge, comments, apply button
- [x] Apply to role — modal (bottom sheet mobile / dialog desktop), duplicate prevention
- [x] Owner applications panel — view applicants, accept/reject
- [x] Comment thread — post, display ordered, scroll container
- [x] Sign out (server action, properly clears cookies)
- [x] Unit + integration tests (57 tests)
- [x] GitHub Actions CI with coverage reporting

## What Needs Building (MVP remaining)
- [ ] Vote toggle — upvote/unvote a project
- [ ] Profile page — your projects, your applications
- [ ] Application count on project cards/detail (show only when > 0)

## Supabase CLI Commands
```bash
supabase migration new <name>     # Create new migration file
supabase db push                  # Apply pending migrations to remote
supabase link --project-ref <ref> # Link local to remote project
supabase login                    # Authenticate CLI
```

## Git Workflow
- `main` branch → auto-deploys to Vercel
- `dev` branch → development work
- Commit messages use conventional commits: feat:, fix:, fix:, chore:, test:

## Common Gotchas
1. Always use `createClient()` from `lib/supabase-server.ts` in server components, API routes and server actions — use `lib/supabase.ts` only in client components
2. `proxy.ts` replaced `middleware.ts` in Next.js 16 — don't create a middleware.ts file
3. Supabase migrations are immutable once pushed — fix forward with new migrations, don't edit old ones
4. The trigger on auth.users was created via Supabase dashboard, not migration — if you reset the DB you need to recreate it manually
5. GitHub OAuth app has two versions: dev (localhost:3000) and prod (vercel URL) — remember to create the prod one when deploying
6. Sign out must use the server action — client-side `supabase.auth.signOut()` does not reliably clear cookies
7. `prompt: login` in the OAuth call is intentional — it forces GitHub to show the login screen so users can switch accounts
