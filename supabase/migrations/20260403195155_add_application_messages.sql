-- Messages within an application thread (private to applicant + project owner)
create table public.application_messages (
  id uuid default gen_random_uuid() primary key,
  application_id uuid references public.applications(id) on delete cascade not null,
  sender_id uuid references public.users(id) on delete cascade not null,
  body text not null,
  created_at timestamp with time zone default now()
);

-- Tracks last-read timestamp per user per thread (used for unread counts)
create table public.application_message_reads (
  application_id uuid references public.applications(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  last_read_at timestamp with time zone default now(),
  primary key (application_id, user_id)
);

alter table public.application_messages enable row level security;
alter table public.application_message_reads enable row level security;

-- Only the applicant and the project owner can read messages
create policy "Thread participants can view messages" on public.application_messages
  for select using (
    auth.uid() = sender_id
    or auth.uid() = (
      select a.applicant_id from public.applications a where a.id = application_id
    )
    or auth.uid() = (
      select p.owner_id from public.projects p
      join public.roles r on r.project_id = p.id
      join public.applications a on a.role_id = r.id
      where a.id = application_id
    )
  );

-- Only thread participants can send messages
create policy "Thread participants can send messages" on public.application_messages
  for insert with check (
    auth.uid() = sender_id
    and (
      auth.uid() = (
        select a.applicant_id from public.applications a where a.id = application_id
      )
      or auth.uid() = (
        select p.owner_id from public.projects p
        join public.roles r on r.project_id = p.id
        join public.applications a on a.role_id = r.id
        where a.id = application_id
      )
    )
  );

-- Each user manages only their own read receipts
create policy "Users manage their own read receipts" on public.application_message_reads
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
