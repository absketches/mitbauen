import { createClient } from '@/lib/supabase-server'

export type UserProfile = {
  id: string
  name: string | null
  avatar_url: string | null
  bio: string | null
  skills: string[] | null
}

export type UserProject = {
  id: string
  title: string
  created_at: string
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('id, name, avatar_url, bio, skills')
    .eq('id', userId)
    .single()
  return data ?? null
}

export async function getProjectsByOwner(userId: string): Promise<UserProject[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('id, title, created_at')
    .eq('owner_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  return (data ?? []) as UserProject[]
}
