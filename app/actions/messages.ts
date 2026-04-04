'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { sendMessage as dbSendMessage, upsertReadReceipt } from '@/lib/db/messages'

export async function sendMessage(applicationId: string, projectId: string, formData: FormData) {
  const body = (formData.get('body') as string)?.trim()
  if (!body) return { error: 'Message cannot be empty.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const result = await dbSendMessage(applicationId, user.id, body)
  if (result.error) return result

  await upsertReadReceipt(applicationId, user.id)

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/messages')
  return { success: true }
}

export async function markThreadRead(applicationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await upsertReadReceipt(applicationId, user.id)
}
