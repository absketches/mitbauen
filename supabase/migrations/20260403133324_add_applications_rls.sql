-- Applicants can submit applications
create policy "Authenticated users can apply to roles" on public.applications
  for insert with check (auth.uid() = applicant_id);

-- Applicants can see their own applications
-- Project owners can see applications for their roles
create policy "Users can view relevant applications" on public.applications
  for select using (
    auth.uid() = applicant_id
    or auth.uid() = (
      select p.owner_id from public.projects p
      join public.roles r on r.project_id = p.id
      where r.id = role_id
    )
  );
