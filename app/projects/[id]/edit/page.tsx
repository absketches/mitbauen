import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getProjectById } from '@/lib/db/projects'
import ProjectEditForm from '@/components/projects/ProjectEditForm'

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [project, { data: { user } }] = await Promise.all([
    getProjectById(id),
    supabase.auth.getUser(),
  ])

  if (!project) notFound()
  if (!user) redirect('/login')
  if (user.id !== project.owner_id) redirect(`/projects/${id}`)

  return (
    <ProjectEditForm
      projectId={id}
      initial={{
        title: project.title,
        description: project.description ?? '',
        why_it_matters: project.why_it_matters ?? '',
        commitment_hours_pw: project.commitment_hours_pw ?? 1,
        commitment_role: project.commitment_role ?? '',
        commitment_description: project.commitment_description ?? '',
      }}
    />
  )
}
