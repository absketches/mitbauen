# Mitbauen — Project Guide for Claude Code

## What is this project?
Mitbauen (German: "to build together") is a platform where people post project ideas, show their personal commitment, and find contributors to build with. The core mechanic: before posting an idea, the founder must declare what they personally commit — hours per week, their role, and what they bring. This commitment signal is displayed prominently on every idea card to attract serious contributors.

## Tech Stack
- **Frontend + API routes:** Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth with GitHub OAuth and Google OAuth
- **Deployment:** Vercel (frontend), Supabase (database)
- **Package manager:** npm
- **Testing:** Vitest, Testing Library (unit + integration)

## Key Conventions
- Next.js 16 uses `proxy.ts` instead of `middleware.ts` (renamed in v16)
- Two Supabase clients: `lib/supabase.ts` (browser) and `lib/supabase-server.ts` (server)
- All mutations use **Server Actions** (`app/actions/`) — not API routes
- Data access is layered: `lib/db/` (DAO — pure Supabase calls) → `app/actions/` (thin auth + revalidate wrappers) → components
- All schema changes go through migrations: `supabase migration new <name>` → edit SQL → `supabase db push`
- Never run SQL directly in the dashboard without also creating a migration file
- Test SQL in Supabase SQL Editor first, then put it in a migration file

## Project Structure
```
mitbauen/
├── app/
│   ├── layout.tsx               # Root layout — includes Navbar
│   ├── page.tsx                 # Homepage (static)
│   ├── globals.css              # Global styles
│   ├── actions/
│   │   ├── auth.ts              # signOut server action
│   │   ├── applications.ts      # applyToRole, respondToApplication
│   │   ├── comments.ts          # addComment, markCommentsRead
│   │   ├── messages.ts          # sendMessage, markThreadRead
│   │   ├── projects.ts          # createProject, updateProject, deleteProject
│   │   ├── users.ts             # updateProfile (bio, skills)
│   │   └── votes.ts             # toggleVote (insert or delete vote row)
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts         # OAuth callback handler
│   ├── login/
│   │   └── page.tsx             # Login page (GitHub + Google OAuth)
│   ├── messages/
│   │   └── page.tsx             # Messages inbox — all threads, most recently updated first
│   ├── projects/
│   │   ├── page.tsx             # Browse feed — responsive 3-col grid, oldest first
│   │   ├── new/
│   │   │   └── page.tsx         # Create project form
│   │   └── [id]/
│   │       ├── page.tsx         # Project detail: roles, apply, comments, owner panel
│   │       └── edit/
│   │           └── page.tsx     # Edit project (owner only); non-owners redirected to detail
│   └── profile/
│       ├── page.tsx             # Own profile — editable bio/skills, your projects list
│       └── [id]/
│           └── page.tsx         # Public profile — view-only bio/skills/projects for any user
├── components/
│   ├── AvatarImage.tsx          # next/image wrapper for user avatars
│   ├── Navbar.tsx               # Sticky navbar (server component, hidden on /login)
│   ├── NotificationBell.tsx     # Client component — bell icon + Facebook-style dropdown
│   ├── UserMenu.tsx             # Avatar dropdown: profile, messages, sign out (client)
│   ├── profile/
│   │   └── ProfileEditForm.tsx     # Edit/view toggle for bio + skills on own profile
│   └── projects/
│       ├── ApplicationThread.tsx   # Collapsible message thread per application
│       ├── ApplicationsPanel.tsx   # Owner-only panel: view + accept/reject applications
│       ├── ApplyModal.tsx          # Bottom-sheet on mobile / dialog on desktop
│       ├── MarkCommentsRead.tsx    # Invisible client component — marks project comments read on mount
│       ├── ProjectEditForm.tsx     # Pre-populated edit form (no roles); includes delete with confirmation
│       ├── ProjectForm.tsx         # Create project form with client-side validation
│       └── VoteButton.tsx          # Vote toggle with optimistic update (client component)
├── lib/
│   ├── supabase.ts              # Browser Supabase client
│   ├── supabase-server.ts       # Server Supabase client
│   ├── notifications-ui.ts      # Pure UI helpers: formatLocalTime, notificationLabel
│   └── db/
│       ├── applications.ts      # DAO: application queries, context lookups
│       ├── comments.ts          # DAO: createComment
│       ├── messages.ts          # DAO: getMessages, getReadReceipts, computeUnreadCounts, sendMessage, upsertReadReceipt
│       ├── notifications.ts     # DAO: getNotifications, getNotificationCount, markProjectCommentsRead
│       ├── projects.ts          # DAO: getProjectFeed, getProjectById, getProjectOwnerId
│       └── users.ts             # DAO: getUserProfile, getProjectsByOwner
├── supabase/
│   └── migrations/              # All DB migrations in order
├── __tests__/
│   ├── helpers/
│   │   └── in-memory-db.ts      # TestDatabase + createTestClient + seed helpers
│   ├── actions/                 # Unit tests for server actions
│   ├── components/              # Unit tests for React components
│   ├── db/                      # Unit tests for lib/db/ (notifications logic)
│   ├── lib/                     # Unit tests for pure lib/ helpers
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
- **applications** — a user applying to a role on a project. Unique constraint on (role_id, applicant_id).
- **votes** — upvotes on projects. Unique constraint: one per user per project.
- **comments** — flat comment thread on a project.
- **application_messages** — messages in an application thread between applicant and project owner.
- **application_message_reads** — per-user read receipts for application threads (last_read_at per application).
- **project_comment_reads** — per-user read receipts for project comment sections (last_read_at per project).

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
applications → application_messages (application_id)
users → application_messages (sender_id)
users → application_message_reads (user_id)
applications → application_message_reads (application_id)
users → project_comment_reads (user_id)
projects → project_comment_reads (project_id)
```

### Enums
- `project_status`: draft, active, dormant, completed
- `role_status`: open, filled, closed
- `application_status`: pending, accepted, rejected

### RLS policies in place
- **projects**: public select, owner insert/update
- **roles**: public select, project owner insert
- **applications**: authenticated insert (own, open non-owned roles only), select (own or project owner), update (project owner only — status field only, enforced by trigger)
- **votes**: public select, authenticated insert (own), own delete
- **comments**: public select, authenticated insert (own)
- **application_messages**: select and insert for thread participants (applicant or project owner)
- **application_message_reads**: users manage their own read receipts
- **project_comment_reads**: users manage their own read receipts

### DB-level hardening
- **Unique constraint** on `applications(role_id, applicant_id)` — prevents duplicate applications at DB level
- **`enforce_application_update_rules` trigger** — only `status` can be updated on an application; all other fields are immutable; status must be `accepted` or `rejected`
- **`create_project_with_roles` RPC** — atomic function that inserts a project and its roles in one transaction, using `auth.uid()` server-side for owner_id

### User trigger
The `on_auth_user_created` trigger fires on `auth.users` INSERT and calls `handle_new_user()` to create a row in `public.users`. Both the function and trigger are defined in migration `20260328213825_create_user_on_signup.sql`. The function uses `security definer` and has a defensive `exception when others then return new` to prevent auth failures if the insert fails. The Google auth migration (`20260404203000_support_google_auth_metadata.sql`) updated the function to handle both GitHub (`full_name`) and Google (`name`, `picture`) metadata fields.

## Auth Flow

### GitHub
1. User clicks "Continue with GitHub" on `/login`
2. Supabase redirects to GitHub OAuth with `prompt: login` (forces account picker — needed for multi-account switching)
3. GitHub redirects to `https://<project-ref>.supabase.co/auth/v1/callback`
4. Supabase exchanges code, creates auth.users row, fires trigger → creates public.users row
5. App callback at `/auth/callback/route.ts` exchanges code for session
6. User is redirected to `/projects`

### Google
Same flow as GitHub but with `prompt: select_account` — Google uses this flag (not `login`) to show the account chooser.

### Sign out
Sign out uses a **Server Action** (`app/actions/auth.ts`). It calls `supabase.auth.signOut()` then explicitly deletes all `sb-*` cookies via `next/headers` before redirecting. This is necessary because Supabase's `onAuthStateChange` cookie flush is async and races the redirect if you rely on it alone.

### Protected routes (proxy.ts)
- `/projects/new` — requires auth
- `/projects/[id]/edit` — requires auth (ownership also verified in the page and action)
- `/profile` — requires auth (own profile edit page)
- `/messages` — requires auth
- `/login` — redirects to `/projects` if already authenticated

Note: `/profile/[id]` (public profiles) does **not** require auth — only `/profile` exactly is protected.

The proxy also sets an `x-pathname` request header so server components (e.g. Navbar) can conditionally render based on the current route.

## Notifications
The notification bell in the Navbar shows a count badge and opens a Facebook-style dropdown. One item per thread (not per message) or per project comment section. Notifications are generated for:

- **Thread messages**: unread messages from the other party in application threads you participate in (as applicant or owner)
- **New applications**: pending applications on roles in projects you own
- **Comments**: unread comments from others on projects you own, applied to, or previously commented on

Own messages/comments never generate a notification. The badge count equals `getNotifications().length` so the badge and dropdown are always in sync. Clicking a notification marks it read and calls `router.refresh()` so the badge drops immediately.

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
- **Unit tests** (`__tests__/actions/`, `__tests__/components/`, `__tests__/lib/`, `__tests__/db/`) — mock all external deps, test logic in isolation
- **Integration tests** (`__tests__/integration/`) — use `TestDatabase` (in-memory store) via `createTestClient`, data persists across action calls within a test

### TestDatabase
`__tests__/helpers/in-memory-db.ts` provides:
- `TestDatabase` — in-memory store with `from()`, chainable query builder, FK relation resolution
- `createTestClient(db, userId)` — returns a Supabase-shaped client backed by the store
- `seedUser / seedProject / seedRole` — seed helpers for test setup

### CI (`test.yml`)
- Runs on push to `main`/`dev` and all PRs to `main`
- Jobs: **type check** (app + tests) → **tests + coverage** → **coverage summary** → **build smoke test**
- Full HTML coverage report uploaded as artifact on every run

## What's Built
- [x] Homepage
- [x] GitHub OAuth login (with forced account picker)
- [x] Google OAuth login (with account chooser)
- [x] Auth callback + session handling
- [x] Route protection via proxy.ts
- [x] Auto user profile creation on signup (trigger, handles GitHub and Google metadata)
- [x] Persistent navbar with notification bell and user avatar dropdown
- [x] Create project form — validated client-side, submitted via `createProject` server action calling a Postgres RPC (atomic project + roles insert)
- [x] Projects feed — responsive 3-col grid, oldest first
- [x] Single project page — roles, commitment badge, comments, apply button (hidden for project owner)
- [x] Apply to role — modal (bottom sheet mobile / dialog desktop), duplicate prevention at app and DB level
- [x] Owner cannot apply to their own project (enforced in action, RLS policy, and DB trigger)
- [x] Owner applications panel — view applicants, accept/reject; application field immutability enforced at DB level
- [x] Private messaging — application threads between applicant and project owner, collapsible per role
- [x] Messages inbox (`/messages`) — all threads, most recently updated first, deep-links to thread
- [x] Facebook-style notification bell — one item per thread/project, local timezone timestamps, marks read on click
- [x] Comment thread — post, display ordered, scroll container
- [x] Unread read receipts for both message threads and project comments
- [x] Sign out (server action, properly clears cookies)
- [x] Vote toggle — optimistic VoteButton client component; `toggleVote` server action
- [x] Application count on feed cards (flat second query to avoid 3-level RLS nesting)
- [x] Profile page — own profile (`/profile`) with editable bio/skills; public profile (`/profile/[id]`) view-only
- [x] Clickable owner names, comment authors, and applicant names link to `/profile/[id]`
- [x] Edit project — `/projects/[id]/edit`, owner-only; edits title/description/why/commitment (roles read-only post-creation)
- [x] Delete project — inline confirmation in danger zone; all related records cascade-deleted via FK
- [x] Unit + integration tests (159 tests, ~63% coverage)
- [x] GitHub Actions CI with type check, tests, coverage, and build smoke test

## What Needs Building
All core features are complete. The product is MVP-ready.

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
- Commit messages use conventional commits: `feat:`, `fix:`, `chore:`, `test:`, `refactor:`

## Common Gotchas
1. Always use `createClient()` from `lib/supabase-server.ts` in server components, server actions, and `lib/db/` — use `lib/supabase.ts` only in client components
2. `proxy.ts` replaced `middleware.ts` in Next.js 16 — don't create a middleware.ts file
3. Supabase migrations are immutable once pushed — fix forward with new migrations, don't edit old ones
4. When joining `users` from a table that has a non-standard FK column name (e.g. `applicant_id`, `owner_id`, `sender_id`), you **must** use explicit FK hints in the select string: `users!applicant_id (name, avatar_url)`. Without the hint, Supabase cannot resolve the ambiguous FK and silently returns `null` — no error is thrown.
5. Nested Supabase joins beyond two levels fail silently under RLS. Use three flat sequential queries instead (see `getApplicationsById` in `lib/db/applications.ts`).
6. GitHub OAuth app has two versions: dev (localhost:3000) and prod (Vercel URL) — remember to create the prod one when deploying. Same applies to Google OAuth (two Authorized redirect URIs).
7. Sign out must use the server action — client-side `supabase.auth.signOut()` does not reliably clear cookies.
8. `prompt: login` (GitHub) and `prompt: select_account` (Google) in the OAuth calls are intentional — they force the provider to show the account chooser so users can switch accounts.
9. `revalidatePath('/', 'layout')` must be called from any action that changes notification state (marking reads, accepting/rejecting applications) so the Navbar server component re-renders and the badge count updates. The client component must then call `router.refresh()` to pull the fresh layout.
10. In server components, you cannot pass event handlers (e.g. `onClick`) as props, and nested `<Link>` elements are invalid HTML. For cards that need both a main navigation link and an inner interactive link (e.g. owner name → profile), use the **stretched-link pattern**: make the card a `div`, put a `<Link className="absolute inset-0">` inside it for the main navigation, and give inner links `relative z-10` so they sit above the stretched link and capture clicks independently.
