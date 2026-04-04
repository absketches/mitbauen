/**
 * Data-access layer for applications.
 *
 * FK hint rule: when joining `users`, always use the explicit hint
 * (`users!applicant_id`, `users!owner_id`) — Supabase silently returns null
 * when the FK is ambiguous.
 *
 * Deep nesting (projects → roles → applications) is done with three flat
 * sequential queries instead of nested Supabase joins. Nested joins beyond
 * two levels fail silently under RLS.
 */
import { createClient } from '@/lib/supabase-server'

export async function getApplicationsByUserForRoles(userId: string, roleIds: string[]) {
  if (!roleIds.length) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('applications')
    .select('id, role_id')
    .eq('applicant_id', userId)
    .in('role_id', roleIds)
  return data ?? []
}

export async function getApplicationsForRoles(roleIds: string[]) {
  if (!roleIds.length) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('applications')
    .select('id, message, what_i_bring, status, role_id, users!applicant_id (name, avatar_url)')
    .in('role_id', roleIds)
    .order('created_at', { ascending: true })
  return data ?? []
}

// Returns application IDs where the user is the applicant (flat query)
export async function getApplicationIdsByApplicant(userId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('applications')
    .select('id')
    .eq('applicant_id', userId)
  return (data ?? []).map((a: any) => a.id)
}

// Returns application IDs for all projects owned by userId (three flat queries, no nesting)
export async function getApplicationIdsByOwner(userId: string): Promise<string[]> {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', userId)
  if (!projects?.length) return []

  const { data: roles } = await supabase
    .from('roles')
    .select('id')
    .in('project_id', projects.map((p: any) => p.id))
  if (!roles?.length) return []

  const { data: apps } = await supabase
    .from('applications')
    .select('id')
    .in('role_id', roles.map((r: any) => r.id))
  return (apps ?? []).map((a: any) => a.id)
}

export type ApplicationInboxRow = {
  id: string
  applicant_id: string
  role_id: string
  role_title: string
  project_id: string
  project_title: string
  project_owner_id: string
  applicant_name: string | null
  applicant_avatar: string | null
  owner_name: string | null
  owner_avatar: string | null
}

// Fetch application metadata for the messages inbox using flat queries only.
// Avoids nested join ambiguity that causes Supabase to silently return null.
export async function getApplicationsById(
  applicationIds: string[]
): Promise<ApplicationInboxRow[]> {
  if (!applicationIds.length) return []
  const supabase = await createClient()

  // Step 1: fetch applications + applicant profile
  const { data: apps, error: appsError } = await supabase
    .from('applications')
    .select('id, applicant_id, role_id, users!applicant_id (name, avatar_url)')
    .in('id', applicationIds)
  if (appsError) console.error('[getApplicationsById:apps]', appsError.message)
  if (!apps?.length) return []

  // Step 2: fetch roles
  const roleIds = [...new Set(apps.map((a: any) => a.role_id))]
  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('id, title, project_id')
    .in('id', roleIds)
  if (rolesError) console.error('[getApplicationsById:roles]', rolesError.message)

  // Step 3: fetch projects + owner profile
  const projectIds = [...new Set((roles ?? []).map((r: any) => r.project_id))]
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, title, owner_id, users!owner_id (name, avatar_url)')
    .in('id', projectIds)
  if (projectsError) console.error('[getApplicationsById:projects]', projectsError.message)

  // Build lookup maps
  const roleMap = new Map((roles ?? []).map((r: any) => [r.id, r]))
  const projectMap = new Map((projects ?? []).map((p: any) => [p.id, p]))

  return apps.map((app: any) => {
    const role = roleMap.get(app.role_id)
    const project = role ? projectMap.get(role.project_id) : null
    return {
      id: app.id,
      applicant_id: app.applicant_id,
      role_id: app.role_id,
      role_title: role?.title ?? 'Unknown role',
      project_id: project?.id ?? '',
      project_title: project?.title ?? 'Unknown project',
      project_owner_id: project?.owner_id ?? '',
      applicant_name: app.users?.name ?? null,
      applicant_avatar: app.users?.avatar_url ?? null,
      owner_name: project?.users?.name ?? null,
      owner_avatar: project?.users?.avatar_url ?? null,
    }
  })
}

export async function createApplication(data: {
  roleId: string
  applicantId: string
  message: string
  whatIBring: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('applications').insert({
    role_id: data.roleId,
    applicant_id: data.applicantId,
    message: data.message,
    what_i_bring: data.whatIBring,
  })
  return error ? { error: error.message } : { success: true }
}

export async function updateApplicationStatus(
  applicationId: string,
  status: 'accepted' | 'rejected'
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', applicationId)
  return error ? { error: error.message } : { success: true }
}
