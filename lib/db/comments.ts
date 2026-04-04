import { createClient } from '@/lib/supabase-server'

export async function createComment(projectId: string, userId: string, body: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('comments').insert({
    project_id: projectId,
    user_id: userId,
    body,
  })
  return error ? { error: error.message } : { success: true }
}
