create or replace function public.create_project_with_roles(
  p_title text,
  p_description text,
  p_why_it_matters text,
  p_commitment_hours_pw int,
  p_commitment_role text,
  p_commitment_description text,
  p_roles jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_project_id uuid;
  v_role jsonb;
begin
  insert into public.projects (
    owner_id,
    title,
    description,
    why_it_matters,
    commitment_hours_pw,
    commitment_role,
    commitment_description,
    status
  ) values (
    auth.uid(),
    p_title,
    p_description,
    p_why_it_matters,
    p_commitment_hours_pw,
    p_commitment_role,
    p_commitment_description,
    'active'
  )
  returning id into v_project_id;

  for v_role in select * from jsonb_array_elements(p_roles)
  loop
    insert into public.roles (
      project_id,
      title,
      description,
      skills_needed,
      status
    ) values (
      v_project_id,
      trim(v_role->>'title'),
      nullif(trim(v_role->>'description'), ''),
      coalesce(
        (
          select array_agg(trim(value))
          from jsonb_array_elements_text(coalesce(v_role->'skills_needed', '[]'::jsonb)) value
          where trim(value) <> ''
        ),
        array[]::text[]
      ),
      'open'
    );
  end loop;

  return v_project_id;
end;
$$;
