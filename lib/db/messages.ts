import { createClient } from '@/lib/supabase-server'

export type ThreadMessage = {
  id: string
  application_id: string
  body: string
  created_at: string
  sender_id: string
  users: { name: string | null; avatar_url: string | null } | null
}

export async function getMessages(applicationIds: string[]): Promise<ThreadMessage[]> {
  if (!applicationIds.length) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('application_messages')
    .select('id, application_id, body, created_at, sender_id, users!sender_id (name, avatar_url)')
    .in('application_id', applicationIds)
    .order('created_at', { ascending: true })
  return (data ?? []) as unknown as ThreadMessage[]
}

export async function getReadReceipts(applicationIds: string[], userId: string) {
  if (!applicationIds.length) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('application_message_reads')
    .select('application_id, last_read_at')
    .eq('user_id', userId)
    .in('application_id', applicationIds)
  return (data ?? []) as Array<{ application_id: string; last_read_at: string }>
}

export async function sendMessage(applicationId: string, senderId: string, body: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('application_messages').insert({
    application_id: applicationId,
    sender_id: senderId,
    body,
  })
  return error ? { error: error.message } : { success: true }
}

export async function upsertReadReceipt(applicationId: string, userId: string) {
  const supabase = await createClient()
  await supabase.from('application_message_reads').upsert(
    { application_id: applicationId, user_id: userId, last_read_at: new Date().toISOString() },
    { onConflict: 'application_id,user_id' }
  )
}

// Computes per-thread unread counts for a given user and set of application IDs
export function computeUnreadCounts(
  messages: ThreadMessage[],
  reads: Array<{ application_id: string; last_read_at: string }>,
  userId: string,
  applicationIds: string[]
): Record<string, number> {
  const readMap = new Map(reads.map(r => [r.application_id, r.last_read_at]))
  const result: Record<string, number> = {}
  for (const appId of applicationIds) {
    const lastRead = readMap.get(appId)
    result[appId] = messages.filter(
      m => m.application_id === appId &&
           m.sender_id !== userId &&
           (!lastRead || new Date(m.created_at) > new Date(lastRead))
    ).length
  }
  return result
}
