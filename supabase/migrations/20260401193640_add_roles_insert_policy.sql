create policy "Project owners can insert roles" on public.roles
  for insert with check (
    auth.uid() = (select owner_id from public.projects where id = project_id)
  );
