'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function applyToRole(projectId: string, roleId: string, formData: FormData) {
  const message = (formData.get('message') as string)?.trim()
  const whatIBring = (formData.get('what_i_bring') as string)?.trim()

  if (!message || !whatIBring) return { error: 'All fields are required.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Check for duplicate application
  const { data: existing } = await supabase
    .from('applications')
    .select('id')
    .eq('role_id', roleId)
    .eq('applicant_id', user.id)
    .single()

  if (existing) return { error: 'You have already applied for this role.' }

  const { error } = await supabase.from('applications').insert({
    role_id: roleId,
    applicant_id: user.id,
    message,
    what_i_bring: whatIBring,
  })

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function respondToApplication(
  projectId: string,
  applicationId: string,
  status: 'accepted' | 'rejected'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Verify the current user owns the project this application belongs to
  const { data: application } = await supabase
    .from('applications')
    .select('id, roles (project_id, projects (owner_id))')
    .eq('id', applicationId)
    .single()

  const ownerIdPath = (application?.roles as any)?.projects?.owner_id
  if (!application || ownerIdPath !== user.id) {
    return { error: 'Not authorised.' }
  }

  const { error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', applicationId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
