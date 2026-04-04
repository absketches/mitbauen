'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import {
  getApplicationsByUserForRoles,
  createApplication,
  updateApplicationStatus,
} from '@/lib/db/applications'
import { getProjectOwnerId } from '@/lib/db/projects'

export async function applyToRole(projectId: string, roleId: string, formData: FormData) {
  const message = (formData.get('message') as string)?.trim()
  const whatIBring = (formData.get('what_i_bring') as string)?.trim()
  if (!message || !whatIBring) return { error: 'All fields are required.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const existing = await getApplicationsByUserForRoles(user.id, [roleId])
  if (existing.length > 0) return { error: 'You have already applied for this role.' }

  const result = await createApplication({ roleId, applicantId: user.id, message, whatIBring })
  if (result.error) return result

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

  const ownerId = await getProjectOwnerId(projectId)
  if (ownerId !== user.id) return { error: 'Not authorised.' }

  const result = await updateApplicationStatus(applicationId, status)
  if (result.error) return result

  revalidatePath(`/projects/${projectId}`)
  // Bust the layout cache: accepting/rejecting changes the pending-applications count
  revalidatePath('/', 'layout')
  return { success: true }
}
