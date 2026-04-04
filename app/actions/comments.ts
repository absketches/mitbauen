'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { createComment } from '@/lib/db/comments'
import { markProjectCommentsRead } from '@/lib/db/notifications'

export async function markCommentsRead(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await markProjectCommentsRead(projectId, user.id)
  // Bust the layout cache so the navbar bell re-computes its count
  revalidatePath('/', 'layout')
}

export async function addComment(projectId: string, formData: FormData) {
  const body = (formData.get('body') as string)?.trim()
  if (!body) return { error: 'Comment cannot be empty.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const result = await createComment(projectId, user.id, body)
  if (result.error) return result

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
