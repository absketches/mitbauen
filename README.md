# Mitbauen

> *German: "to build together"*

Mitbauen is a platform for people who want to build something real. Post your idea, declare your personal commitment upfront, and find serious contributors who want to join.

The core mechanic: before anyone can see your idea, you must state what **you** personally commit — hours per week, your role, and what you bring. That signal is displayed prominently on every idea card, so contributors can judge whether you're serious before they apply.

---

## Features

- **Post an idea** — title, description, why it matters, your personal commitment, and the roles you need
- **Browse ideas** — responsive grid, sorted oldest first, with commitment badge and vote count on each card
- **Apply to a role** — bottom-sheet modal on mobile, dialog on desktop; duplicate prevention built in
- **Owner dashboard** — project owners see all applicants per role inline on their project page, with accept/reject
- **Comments** — scrollable thread on every project page
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

Then manually create the user trigger in the Supabase SQL Editor (cannot be done via migration — Supabase restricts DDL on the `auth` schema):

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
exception when others then
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 4. OAuth Providers

1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Set **Authorization callback URL** to `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Copy the Client ID and Secret into your Supabase project under Authentication → Providers → GitHub

Create two OAuth apps: one for `localhost:3000` (dev) and one for your Vercel URL (prod).

For Google, add a Google OAuth client in Google Cloud Console and copy the Client ID / Secret into Supabase under Authentication → Providers → Google. Use the Supabase callback URL shown in that provider screen.

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

- **Unit tests** (`__tests__/actions/`, `__tests__/components/`) — all external dependencies mocked, fast
- **Integration tests** (`__tests__/integration/`) — use an in-memory `TestDatabase` that mimics the Supabase client API; data actually persists across action calls within each test so cross-action flows (apply → duplicate check, owner responds → status updated) are verified end-to-end without a real database

---

## CI

GitHub Actions (`test.yml`) runs on every push to `main`/`dev` and all PRs:

1. **Type check** — `tsc --noEmit`
2. **Tests + coverage** — all tests run, coverage report posted as PR comment with ✅/⚠️/❌ per metric
3. **Build smoke test** — `next build` with dummy env vars to catch compile errors

---

## Project Structure

```
app/
  actions/          # Server actions (auth, applications, comments)
  auth/callback/    # OAuth callback route
  login/            # Login page
  projects/
    page.tsx        # Browse feed
    new/            # Create project
    [id]/           # Project detail
components/
  Navbar.tsx              # Sticky navbar (hidden on /login)
  UserMenu.tsx            # Avatar dropdown with sign out
  projects/
    ProjectForm.tsx       # Create form with validation
    ApplyModal.tsx        # Apply to role modal
    ApplicationsPanel.tsx # Owner applications view
lib/
  supabase.ts         # Browser client
  supabase-server.ts  # Server client
supabase/migrations/  # Database migrations
__tests__/
  helpers/            # TestDatabase + seed helpers
  actions/            # Unit tests for server actions
  components/         # Component tests
  integration/        # Integration tests
proxy.ts              # Route protection (Next.js 16 middleware)
```

---

## MVP remaining

- [ ] Vote toggle on project cards and detail page
- [ ] Profile page — your projects and applications
- [ ] Application count display on cards (show when > 0)
