-- Tracks the last time a user read comments on a project.
-- Used to compute unread comment notifications for project owners.
create table public.project_comment_reads (
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id    uuid references public.users(id) on delete cascade not null,
  last_read_at timestamp with time zone default now() not null,
  primary key (project_id, user_id)
);

alter table public.project_comment_reads enable row level security;

create policy "Users manage their own comment reads" on public.project_comment_reads
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
