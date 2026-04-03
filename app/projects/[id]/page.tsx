import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { addComment } from '@/app/actions/comments'
import ApplyModal from '@/components/projects/ApplyModal'
import ApplicationsPanel from '@/components/projects/ApplicationsPanel'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select(`
      *,
      users (name, avatar_url),
      roles (id, title, description, skills_needed, status),
      votes (id),
      comments (id, body, created_at, users (name, avatar_url))
    `)
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch this user's existing applications for roles on this project
  let appliedRoleIds = new Set<string>()
  if (user) {
    const roleIds = (project.roles ?? []).map((r: any) => r.id)
    const { data: existingApplications } = await supabase
      .from('applications')
      .select('role_id')
      .eq('applicant_id', user.id)
      .in('role_id', roleIds)
    appliedRoleIds = new Set((existingApplications ?? []).map((a: any) => a.role_id))
  }

  const isOwner = user?.id === project.owner_id

  // If owner, fetch all applications grouped by role
  let rolesWithApplications: any[] = []
  if (isOwner) {
    const roleIds = (project.roles ?? []).map((r: any) => r.id)
    const { data: applications } = await supabase
      .from('applications')
      .select('id, message, what_i_bring, status, role_id, users (name, avatar_url)')
      .in('role_id', roleIds)
      .order('created_at', { ascending: true })

    rolesWithApplications = (project.roles ?? []).map((role: any) => ({
      ...role,
      applications: (applications ?? []).filter((a: any) => a.role_id === role.id),
    }))
  }

  const openRoles = project.roles?.filter((r: any) => r.status === 'open') ?? []
  const voteCount = project.votes?.length ?? 0
  const comments = (project.comments ?? []).sort(
    (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      {/* Back */}
      <Link href="/projects" className="text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8 inline-block">
        ← Back to ideas
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">{project.title}</h1>
        <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
          <span>by {project.users?.name ?? 'Anonymous'}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
          </span>
        </div>
      </div>

      {/* Commitment badge */}
      <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-8">
        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
        <span className="text-gray-700">
          Founder commits <strong>{project.commitment_hours_pw}h/week</strong> as <strong>{project.commitment_role}</strong>
          {project.commitment_description && (
            <span className="text-gray-500"> — {project.commitment_description}</span>
          )}
        </span>
      </div>

      {/* Description */}
      <section className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-3">About</h2>
        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{project.description}</p>
      </section>

      {/* Why it matters */}
      {project.why_it_matters && (
        <section className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-3">Why it matters</h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{project.why_it_matters}</p>
        </section>
      )}

      {/* Open roles */}
      {openRoles.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Open roles <span className="text-gray-400 font-normal text-base">({openRoles.length})</span>
          </h2>
          <div className="space-y-3">
            {openRoles.map((role: any) => (
              <div key={role.id} className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{role.title}</h3>
                    {role.description && (
                      <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                    )}
                    {role.skills_needed?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {role.skills_needed.map((skill: string) => (
                          <span key={skill} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {user && (
                    <ApplyModal
                      role={role}
                      projectId={project.id}
                      alreadyApplied={appliedRoleIds.has(role.id)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Applications — owner only */}
      {isOwner && (
        <ApplicationsPanel roles={rolesWithApplications} projectId={project.id} />
      )}

      {/* Comments */}
      <section>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Comments {comments.length > 0 && <span className="text-gray-400 font-normal text-base">({comments.length})</span>}
        </h2>

        {comments.length === 0 ? (
          <p className="text-gray-400 text-sm mb-6">No comments yet.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-4 mb-6 pr-2">
            {comments.map((comment: any) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0 overflow-hidden flex items-center justify-center text-xs font-medium text-gray-600">
                  {comment.users?.avatar_url
                    ? <img src={comment.users.avatar_url} alt="" className="w-full h-full object-cover" />
                    : comment.users?.name?.[0]?.toUpperCase() ?? '?'
                  }
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-900">{comment.users?.name ?? 'Anonymous'}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(comment.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{comment.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {user ? (
          <form action={addComment.bind(null, project.id)}>
            <textarea
              name="body"
              required
              rows={3}
              placeholder="Leave a comment..."
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              type="submit"
              className="mt-2 text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Post comment
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-400">
            <Link href="/login" className="underline hover:text-gray-700">Sign in</Link> to leave a comment.
          </p>
        )}
      </section>
    </div>
  )
}
