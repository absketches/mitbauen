alter table public.applications
  add constraint applications_role_id_applicant_id_key unique (role_id, applicant_id);

drop policy if exists "Authenticated users can apply to roles" on public.applications;
create policy "Authenticated users can apply to open non-owned roles" on public.applications
  for insert with check (
    auth.uid() = applicant_id
    and exists (
      select 1
      from public.roles r
      join public.projects p on p.id = r.project_id
      where r.id = role_id
        and r.status = 'open'
        and p.owner_id <> auth.uid()
    )
  );

drop policy if exists "Project owners can update application status" on public.applications;
create policy "Project owners can update application status" on public.applications
  for update using (
    auth.uid() = (
      select p.owner_id from public.projects p
      join public.roles r on r.project_id = p.id
      where r.id = role_id
    )
  )
  with check (
    auth.uid() = (
      select p.owner_id from public.projects p
      join public.roles r on r.project_id = p.id
      where r.id = role_id
    )
    and status in ('accepted', 'rejected')
  );

create or replace function public.enforce_application_update_rules()
returns trigger as $$
begin
  if new.role_id is distinct from old.role_id
     or new.applicant_id is distinct from old.applicant_id
     or new.message is distinct from old.message
     or new.what_i_bring is distinct from old.what_i_bring
     or new.created_at is distinct from old.created_at then
    raise exception 'Only application status can be updated';
  end if;

  if new.status not in ('accepted', 'rejected') then
    raise exception 'Invalid application status';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists applications_update_guard on public.applications;
create trigger applications_update_guard
  before update on public.applications
  for each row execute procedure public.enforce_application_update_rules();
