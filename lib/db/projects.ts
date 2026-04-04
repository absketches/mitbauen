/**
 * Data-access layer for projects.
 *
 * All joins that reference the `users` table MUST use explicit FK hints
 * (e.g. `users!owner_id`, `users!user_id`). Without them, Supabase cannot
 * resolve the ambiguous FK and silently returns `null` — no error is thrown.
 */
import { createClient } from '@/lib/supabase-server'

export async function getProjectFeed() {
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
  return data ?? []
}

export async function getProjectById(id: string) {
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
  return data ?? null
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
