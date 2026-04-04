'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

type RoleInput = {
  title: string
  description: string
  skills_needed: string[]
}

export type CreateProjectInput = {
  title: string
  description: string
  why_it_matters: string
  commitment_hours_pw: number
  commitment_role: string
  commitment_description: string
  roles: RoleInput[]
}

function trimRole(role: RoleInput): RoleInput {
  return {
    title: role.title.trim(),
    description: role.description.trim(),
    skills_needed: role.skills_needed.map(skill => skill.trim()).filter(Boolean),
  }
}

export async function createProject(input: CreateProjectInput) {
  const title = input.title.trim()
  const description = input.description.trim()
  const whyItMatters = input.why_it_matters.trim()
  const commitmentRole = input.commitment_role.trim()
  const commitmentDescription = input.commitment_description.trim()
  const roles = input.roles.map(trimRole).filter(role => role.title)

  if (title.length < 5 || title.length > 120) {
    return { error: 'Title must be between 5 and 120 characters.' }
  }
  if (description.length < 30) {
    return { error: 'Description must be at least 30 characters.' }
  }
  if (commitmentRole.length < 3 || commitmentRole.length > 80) {
    return { error: 'Commitment role must be between 3 and 80 characters.' }
  }
  if (!Number.isInteger(input.commitment_hours_pw) || input.commitment_hours_pw < 1 || input.commitment_hours_pw > 80) {
    return { error: 'Commitment hours must be between 1 and 80.' }
  }
  if (roles.some(role => role.title.length < 3 || role.title.length > 80)) {
    return { error: 'Each role title must be between 3 and 80 characters.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data, error } = await supabase.rpc('create_project_with_roles', {
    p_title: title,
    p_description: description,
    p_why_it_matters: whyItMatters || null,
    p_commitment_hours_pw: input.commitment_hours_pw,
    p_commitment_role: commitmentRole,
    p_commitment_description: commitmentDescription || null,
    p_roles: roles,
  })

  if (error) return { error: error.message }

  revalidatePath('/projects')
  return { success: true, projectId: data as string }
}
