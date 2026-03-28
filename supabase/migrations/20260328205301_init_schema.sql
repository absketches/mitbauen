-- Users profile table (extends Supabase auth)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text,
  avatar_url text,
  bio text,
  skills text[],
  created_at timestamp with time zone default now()
);

-- Projects table
create type project_status as enum ('draft', 'active', 'dormant', 'completed');

create table public.projects (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  why_it_matters text,
  status project_status default 'active',
  commitment_hours_pw int,
  commitment_role text,
  commitment_description text,
  created_at timestamp with time zone default now()
);

-- Roles table
create type role_status as enum ('open', 'filled', 'closed');

create table public.roles (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  skills_needed text[],
  description text,
  status role_status default 'open'
);

-- Applications table
create type application_status as enum ('pending', 'accepted', 'rejected');

create table public.applications (
  id uuid default gen_random_uuid() primary key,
  role_id uuid references public.roles(id) on delete cascade not null,
  applicant_id uuid references public.users(id) on delete cascade not null,
  message text,
  what_i_bring text,
  status application_status default 'pending',
  created_at timestamp with time zone default now()
);

-- Votes table (one per user per project)
create table public.votes (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(project_id, user_id)
);

-- Comments table
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  body text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.roles enable row level security;
alter table public.applications enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;

-- Basic RLS policies
create policy "Public projects are viewable by everyone" on public.projects
  for select using (true);

create policy "Users can create projects" on public.projects
  for insert with check (auth.uid() = owner_id);

create policy "Owners can update their projects" on public.projects
  for update using (auth.uid() = owner_id);

create policy "Profiles are viewable by everyone" on public.users
  for select using (true);

create policy "Users can update their own profile" on public.users
  for update using (auth.uid() = id);

create policy "Roles are viewable by everyone" on public.roles
  for select using (true);

create policy "Comments are viewable by everyone" on public.comments
  for select using (true);

create policy "Authenticated users can comment" on public.comments
  for insert with check (auth.uid() = user_id);

create policy "Votes are viewable by everyone" on public.votes
  for select using (true);

create policy "Authenticated users can vote" on public.votes
  for insert with check (auth.uid() = user_id);

create policy "Users can delete their own vote" on public.votes
  for delete using (auth.uid() = user_id);
