/**
 * Data-access layer for projects.
 *
 * All joins that reference the `users` table MUST use explicit FK hints
 * (e.g. `users!owner_id`, `users!user_id`). Without them, Supabase cannot
 * resolve the ambiguous FK and silently returns `null` — no error is thrown.
 */
import { createClient } from '@/lib/supabase-server'

export type ProjectUser = {
  name: string | null
  avatar_url: string | null
}

export type ProjectRoleSummary = {
  id: string
  status: 'open' | 'filled' | 'closed'
}

export type ProjectVote = {
  id: string
}

export type ProjectFeedItem = {
  id: string
  title: string
  description: string | null
  commitment_hours_pw: number | null
  commitment_role: string | null
  created_at: string
  users: ProjectUser | null
  roles: ProjectRoleSummary[]
  votes: ProjectVote[]
}

export type ProjectRole = {
  id: string
  title: string
  description: string | null
  skills_needed: string[] | null
  status: 'open' | 'filled' | 'closed'
}

export type ProjectComment = {
  id: string
  body: string
  created_at: string
  users: ProjectUser | null
}

export type ProjectDetails = {
  id: string
  owner_id: string
  title: string
  description: string | null
  why_it_matters: string | null
  status: 'draft' | 'active' | 'dormant' | 'completed'
  commitment_hours_pw: number | null
  commitment_role: string | null
  commitment_description: string | null
  created_at: string
  users: ProjectUser | null
  roles: ProjectRole[]
  votes: ProjectVote[]
  comments: ProjectComment[]
}

type JoinedUser =
  | ProjectUser
  | ProjectUser[]
  | null

type ProjectFeedRow = {
  id: string
  title: string
  description: string | null
  commitment_hours_pw: number | null
  commitment_role: string | null
  created_at: string
  users: JoinedUser
  roles: ProjectRoleSummary[]
  votes: ProjectVote[]
}

type ProjectCommentRow = {
  id: string
  body: string
  created_at: string
  users: JoinedUser
}

type ProjectDetailRow = Omit<ProjectDetails, 'users' | 'comments'> & {
  users: JoinedUser
  comments: ProjectCommentRow[]
}

function extractJoinedUser(user: JoinedUser) {
  if (Array.isArray(user)) return user[0] ?? null
  return user
}

export async function getProjectFeed(): Promise<ProjectFeedItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id, title, description, commitment_hours_pw, commitment_role, created_at,
      users!owner_id (name, avatar_url),
      roles (id, status),
      votes (id)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
  if (error) console.error('[getProjectFeed]', error.message)
  return ((data ?? []) as ProjectFeedRow[]).map(project => ({
    ...project,
    users: extractJoinedUser(project.users),
  }))
}

export async function getProjectById(id: string): Promise<ProjectDetails | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      users!owner_id (name, avatar_url),
      roles (id, title, description, skills_needed, status),
      votes (id),
      comments (id, body, created_at, users!user_id (name, avatar_url))
    `)
    .eq('id', id)
    .single()
  if (error) console.error('[getProjectById]', error.message)
  if (!data) return null

  const project = data as ProjectDetailRow
  return {
    ...project,
    users: extractJoinedUser(project.users),
    comments: project.comments.map(comment => ({
      ...comment,
      users: extractJoinedUser(comment.users),
    })),
  }
}

export async function getProjectOwnerId(projectId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single()
  return data?.owner_id ?? null
}
