# Mitbauen

Mitbauen is a platform for people who want to build something real. Post your idea, declare your personal commitment upfront, and find serious contributors who want to join.

The core mechanic: before anyone can see your idea, you must state what **you** personally commit — hours per week, your role, and what you bring. That signal is displayed prominently on every idea card, so contributors can judge whether you're serious before they apply.

---

## Features

- **Post an idea** — title, description, why it matters, your personal commitment, and the roles you need
- **Browse ideas** — responsive grid, sorted oldest first, with commitment badge and vote count on each card
- **Apply to a role** — bottom-sheet modal on mobile, dialog on desktop; duplicate prevention at app and database level; owners cannot apply to their own project
- **Owner dashboard** — project owners see all applicants per role inline on their project page, with accept/reject controls
- **Private messaging** — each application has a collapsible thread between the applicant and the project owner
- **Messages inbox** — `/messages` lists all your threads ordered by most recently updated, with deep-links into each thread
- **Notification bell** — Facebook-style dropdown in the navbar; one item per thread or project comment section; local-timezone timestamps; marks read on click
- **Comments** — scrollable comment thread on every project page; project owners are notified of new comments from others
- **OAuth sign-in** — sign in with GitHub or Google, both with explicit account selection flows

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend + API | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth + GitHub / Google OAuth |
| Deployment | Vercel (app), Supabase (database) |
| Testing | Vitest, Testing Library |
| CI | GitHub Actions |

---

## Getting Started

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project
- GitHub and/or Google OAuth configured in Supabase (see below)

### 1. Clone and install

```bash
git clone <repo-url>
cd mitbauen
npm install
```

### 2. Environment variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxx
```

### 3. Database setup

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

This applies all migrations, including the user trigger and all RLS policies.

### 4. OAuth Providers

**GitHub**
1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Set **Authorization callback URL** to `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Copy the Client ID and Secret into Supabase under Authentication → Providers → GitHub

Create two OAuth apps: one pointing at `localhost:3000` (dev) and one pointing at your Vercel URL (prod).

**Google**
1. Create a Google OAuth client in [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Add the Supabase callback URL shown in Authentication → Providers → Google as an Authorized redirect URI
3. Copy the Client ID and Secret into Supabase

Create two OAuth clients for dev and prod as with GitHub.

### 5. Run locally

```bash
npm run dev
```

---

## Testing

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

The test suite has two layers:

- **Unit tests** (`__tests__/actions/`, `__tests__/components/`, `__tests__/lib/`, `__tests__/db/`) — all external dependencies mocked, fast
- **Integration tests** (`__tests__/integration/`) — use an in-memory `TestDatabase` that mimics the Supabase client API; data actually persists across action calls within each test so cross-action flows (apply → duplicate check, owner responds → status updated) are verified end-to-end without a real database

---

## CI

GitHub Actions (`test.yml`) runs on every push to `main`/`dev` and all PRs:

1. **Type check** — `tsc --noEmit` for both app and test configs
2. **Tests + coverage** — all tests run, coverage summary posted to the job log, full HTML report uploaded as artifact
3. **Build smoke test** — `next build` with dummy env vars to catch compile errors

---

## Project Structure

```
app/
  actions/
    auth.ts           # signOut
    applications.ts   # applyToRole, respondToApplication
    comments.ts       # addComment, markCommentsRead
    messages.ts       # sendMessage, markThreadRead
    projects.ts       # createProject
  auth/callback/      # OAuth callback route
  login/              # Login page (GitHub + Google)
  messages/           # Messages inbox
  projects/
    page.tsx          # Browse feed
    new/              # Create project
    [id]/             # Project detail
  profile/            # User profile
components/
  AvatarImage.tsx             # next/image wrapper for avatars
  Navbar.tsx                  # Sticky navbar (hidden on /login)
  NotificationBell.tsx        # Bell icon + notification dropdown
  UserMenu.tsx                # Avatar dropdown (profile, messages, sign out)
  projects/
    ApplicationThread.tsx     # Collapsible message thread per application
    ApplicationsPanel.tsx     # Owner applications view
    ApplyModal.tsx            # Apply to role modal
    MarkCommentsRead.tsx      # Marks project comments read on mount
    ProjectForm.tsx           # Create form with validation
lib/
  supabase.ts             # Browser client
  supabase-server.ts      # Server client
  notifications-ui.ts     # Pure helpers: formatLocalTime, notificationLabel
  db/
    applications.ts       # Application queries and context lookups
    comments.ts           # createComment
    messages.ts           # Message queries, read receipts, computeUnreadCounts
    notifications.ts      # getNotifications, getNotificationCount, markProjectCommentsRead
    projects.ts           # Project feed and detail queries
supabase/migrations/      # Database migrations (applied via supabase db push)
__tests__/
  helpers/                # TestDatabase + seed helpers
  actions/                # Unit tests for server actions
  components/             # Component tests
  db/                     # Tests for lib/db/ logic
  lib/                    # Tests for pure lib/ helpers
  integration/            # Integration tests
proxy.ts                  # Route protection (Next.js 16 middleware)
```

---

## Remaining features

- [ ] Vote toggle — upvote/unvote a project
- [ ] Profile page — full implementation (your projects, your applications; bio/skills fields need DB columns added)
- [ ] Application count on project cards (show when > 0)
