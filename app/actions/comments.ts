'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function addComment(projectId: string, formData: FormData) {
  const body = (formData.get('body') as string)?.trim()
  if (!body) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('comments').insert({
    project_id: projectId,
    user_id: user.id,
    body,
  })

  revalidatePath(`/projects/${projectId}`)
}
