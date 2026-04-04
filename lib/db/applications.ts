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

export type RoleApplicationContext = {
  roleId: string
  projectId: string
  ownerId: string
  status: 'open' | 'filled' | 'closed'
}

export type ApplicationOwnershipContext = {
  applicationId: string
  projectId: string
  ownerId: string
}

export type UserRoleApplication = {
  id: string
  role_id: string
}

export type RoleApplication = {
  id: string
  applicant_id: string
  message: string
  what_i_bring: string
  status: 'pending' | 'accepted' | 'rejected'
  role_id: string
  users: { name: string | null; avatar_url: string | null } | null
}

type JoinedUser =
  | { name: string | null; avatar_url: string | null }
  | Array<{ name: string | null; avatar_url: string | null }>
  | null

type ApplicationIdRow = { id: string }
type ProjectIdRow = { id: string }
type RoleIdRow = { id: string }
type RoleWithProjectRow = { id: string; title: string; project_id: string }
type ProjectWithOwnerRow = {
  id: string
  title: string
  owner_id: string
  users: JoinedUser
}
type RoleApplicationRow = {
  id: string
  applicant_id: string
  message: string
  what_i_bring: string
  status: 'pending' | 'accepted' | 'rejected'
  role_id: string
  users: JoinedUser
}
type ApplicationWithApplicantRow = {
  id: string
  applicant_id: string
  role_id: string
  users: JoinedUser
}

function extractJoinedUser(user: JoinedUser) {
  if (Array.isArray(user)) return user[0] ?? null
  return user
}

export async function getApplicationsByUserForRoles(
  userId: string,
  roleIds: string[]
): Promise<UserRoleApplication[]> {
  if (!roleIds.length) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('applications')
    .select('id, role_id')
    .eq('applicant_id', userId)
    .in('role_id', roleIds)
  return (data ?? []) as UserRoleApplication[]
}

export async function getRoleApplicationContext(
  roleId: string
): Promise<RoleApplicationContext | null> {
  const supabase = await createClient()
  const { data: role, error } = await supabase
    .from('roles')
    .select('id, project_id, status')
    .eq('id', roleId)
    .single()
  if (error) console.error('[getRoleApplicationContext]', error.message)

  if (!role) return null

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', role.project_id)
    .single()
  if (projectError) console.error('[getRoleApplicationContext:project]', projectError.message)
  if (!project?.owner_id) return null

  return {
    roleId: role.id,
    projectId: role.project_id,
    ownerId: project.owner_id,
    status: role.status,
  }
}

export async function getApplicationOwnershipContext(
  applicationId: string
): Promise<ApplicationOwnershipContext | null> {
  const supabase = await createClient()
  const { data: application, error } = await supabase
    .from('applications')
    .select('id, role_id')
    .eq('id', applicationId)
    .single()
  if (error) console.error('[getApplicationOwnershipContext]', error.message)

  if (!application) return null

  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('project_id')
    .eq('id', application.role_id)
    .single()
  if (roleError) console.error('[getApplicationOwnershipContext:role]', roleError.message)
  if (!role?.project_id) return null

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', role.project_id)
    .single()
  if (projectError) console.error('[getApplicationOwnershipContext:project]', projectError.message)
  if (!project?.owner_id) return null

  return {
    applicationId: application.id,
    projectId: role.project_id,
    ownerId: project.owner_id,
  }
}

export async function getApplicationsForRoles(roleIds: string[]): Promise<RoleApplication[]> {
  if (!roleIds.length) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('applications')
    .select('id, applicant_id, message, what_i_bring, status, role_id, users!applicant_id (name, avatar_url)')
    .in('role_id', roleIds)
    .order('created_at', { ascending: true })
  return ((data ?? []) as RoleApplicationRow[]).map(application => ({
    id: application.id,
    message: application.message,
    what_i_bring: application.what_i_bring,
    status: application.status,
    role_id: application.role_id,
    users: extractJoinedUser(application.users),
  }))
}

// Returns application IDs where the user is the applicant (flat query)
export async function getApplicationIdsByApplicant(userId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('applications')
    .select('id')
    .eq('applicant_id', userId)
  return ((data ?? []) as ApplicationIdRow[]).map(application => application.id)
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
    .in('project_id', (projects as ProjectIdRow[]).map(project => project.id))
  if (!roles?.length) return []

  const { data: apps } = await supabase
    .from('applications')
    .select('id')
    .in('role_id', (roles as RoleIdRow[]).map(role => role.id))
  return ((apps ?? []) as ApplicationIdRow[]).map(application => application.id)
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
  const appRows = apps as ApplicationWithApplicantRow[]
  const roleIds = [...new Set(appRows.map(application => application.role_id))]
  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('id, title, project_id')
    .in('id', roleIds)
  if (rolesError) console.error('[getApplicationsById:roles]', rolesError.message)

  // Step 3: fetch projects + owner profile
  const roleRows = (roles ?? []) as RoleWithProjectRow[]
  const projectIds = [...new Set(roleRows.map(role => role.project_id))]
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, title, owner_id, users!owner_id (name, avatar_url)')
    .in('id', projectIds)
  if (projectsError) console.error('[getApplicationsById:projects]', projectsError.message)

  // Build lookup maps
  const projectRows = (projects ?? []) as ProjectWithOwnerRow[]
  const roleMap = new Map(roleRows.map(role => [role.id, role]))
  const projectMap = new Map(projectRows.map(project => [project.id, project]))

  return appRows.map(application => {
    const role = roleMap.get(application.role_id)
    const project = role ? projectMap.get(role.project_id) : null
    return {
      id: application.id,
      applicant_id: application.applicant_id,
      role_id: application.role_id,
      role_title: role?.title ?? 'Unknown role',
      project_id: project?.id ?? '',
      project_title: project?.title ?? 'Unknown project',
      project_owner_id: project?.owner_id ?? '',
      applicant_name: extractJoinedUser(application.users)?.name ?? null,
      applicant_avatar: extractJoinedUser(application.users)?.avatar_url ?? null,
      owner_name: extractJoinedUser(project?.users ?? null)?.name ?? null,
      owner_avatar: extractJoinedUser(project?.users ?? null)?.avatar_url ?? null,
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
