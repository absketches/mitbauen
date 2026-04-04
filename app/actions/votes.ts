'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export async function toggleVote(projectId: string): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: existing } = await supabase
    .from('votes')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    await supabase.from('votes').delete().eq('id', existing.id)
  } else {
    await supabase.from('votes').insert({ project_id: projectId, user_id: user.id })
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/projects')
  return { success: true }
}
