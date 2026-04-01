# Mitbauen — Project Guide for Claude Code

## What is this project?
Mitbauen (German: "to build together") is a platform where people post project ideas, show their personal commitment, and find contributors to build with. The core mechanic: before posting an idea, the founder must declare what they personally commit — hours per week, their role, and what they bring. This commitment signal is displayed prominently on every idea card to attract serious contributors.

## Tech Stack
- **Frontend + API routes:** Next.js 16 (App Router, TypeScript, Tailwind CSS)
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth with GitHub OAuth
- **Deployment:** Vercel (frontend), Supabase (database)
- **Package manager:** npm

## Key Conventions
- Next.js 16 uses `proxy.ts` instead of `middleware.ts` (renamed in v16)
- Two Supabase clients: `lib/supabase.ts` (browser) and `lib/supabase-server.ts` (server)
- All schema changes go through migrations: `supabase migration new <name>` → edit SQL → `supabase db push`
- Never run SQL directly in the dashboard without also creating a migration file
- Test SQL in Supabase SQL Editor first, then put it in a migration file

## Project Structure
```
mitbauen/
├── app/
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Homepage
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts         # OAuth callback handler
│   ├── login/
│   │   └── page.tsx             # Login page (GitHub OAuth)
│   ├── projects/
│   │   ├── page.tsx             # Browse all projects feed
│   │   ├── new/
│   │   │   └── page.tsx         # Create project form
│   │   └── [id]/
│   │       └── page.tsx         # Single project view (TODO)
│   └── profile/
│       └── page.tsx             # User profile (TODO)
├── components/
│   ├── SignOutButton.tsx         # Client sign out button
│   └── projects/
│       └── ProjectForm.tsx      # Create project form component
├── lib/
│   ├── supabase.ts              # Browser Supabase client
│   └── supabase-server.ts       # Server Supabase client
├── supabase/
│   └── migrations/              # All DB migrations in order
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

### Important: User trigger
A PostgreSQL trigger `on_auth_user_created` fires on `auth.users` INSERT and calls `handle_new_user()` to create a row in `public.users`. This trigger was created manually in the Supabase dashboard (not via migration) because Supabase restricts DDL on the auth schema. The function uses `security definer` and has a defensive `exception when others then return new` to prevent auth failures if the insert fails.

## Auth Flow
1. User clicks "Continue with GitHub" on `/login`
2. Supabase redirects to GitHub OAuth
3. GitHub redirects to `https://<project-ref>.supabase.co/auth/v1/callback`
4. Supabase exchanges code, creates auth.users row, fires trigger → creates public.users row
5. App callback at `/auth/callback/route.ts` exchanges code for session
6. User is redirected to `/projects`

### Protected routes (proxy.ts)
- `/projects/new` — requires auth
- `/profile` — requires auth
- `/login` — redirects to `/projects` if already authenticated

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxx
```

## What's Built
- [x] Homepage with session-aware buttons
- [x] GitHub OAuth login
- [x] Auth callback + session handling
- [x] Route protection via proxy.ts
- [x] Auto user profile creation on signup (trigger)
- [x] Create project form (title, description, why it matters, commitment signal, roles)
- [x] Projects feed page (lists all active projects with commitment badge and vote count)
- [x] Sign out button

## What Needs Building (MVP remaining)
- [ ] Single project page (`/projects/[id]`) — full view with roles, comments, vote button, apply button, application count
- [ ] Apply to role — modal or inline form with message + "what I bring" fields
- [ ] Vote toggle — upvote/unvote a project
- [ ] Comment thread — add and display comments on a project
- [ ] Nav bar — persistent navigation with sign in/out, post idea button
- [ ] Profile page — your projects, your applications
- [ ] Application management — project owner can accept/reject applications

## Application count display (product decision)
Show application count publicly on project cards and detail page, but only when count > 0. A project with 0 applications shows nothing. 1+ applications shows "X people applied".

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
- Commit messages use conventional commits: feat:, fix:, chore:

## Common Gotchas
1. Always use `createClient()` from `lib/supabase-server.ts` in server components and API routes, and `lib/supabase.ts` in client components
2. `proxy.ts` replaced `middleware.ts` in Next.js 16 — don't create a middleware.ts file
3. Supabase migrations are immutable once pushed — fix forward with new migrations, don't edit old ones
4. The trigger on auth.users was created via Supabase dashboard, not migration — if you reset the DB you need to recreate it manually
5. GitHub OAuth app has two versions: dev (localhost:3000) and prod (vercel URL) — remember to create the prod one when deploying
