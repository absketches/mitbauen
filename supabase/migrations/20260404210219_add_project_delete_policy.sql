-- Allow project owners to delete their own projects.
-- Without this policy, RLS silently blocks the DELETE and returns no error.
create policy "Project owners can delete their project"
  on public.projects
  for delete
  using (auth.uid() = owner_id);
