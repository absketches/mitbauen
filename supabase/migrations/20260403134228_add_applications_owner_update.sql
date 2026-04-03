-- Project owners can accept or reject applications for their roles
create policy "Project owners can update application status" on public.applications
  for update using (
    auth.uid() = (
      select p.owner_id from public.projects p
      join public.roles r on r.project_id = p.id
      where r.id = role_id
    )
  );
