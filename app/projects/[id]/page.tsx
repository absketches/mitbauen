import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import AvatarImage from '@/components/AvatarImage'
import {
  getProjectById,
  type ProjectComment,
  type ProjectRole,
} from '@/lib/db/projects'
import {
  getApplicationsByUserForRoles,
  getApplicationsForRoles,
  type RoleApplication,
  type UserRoleApplication,
} from '@/lib/db/applications'
import {
  getMessages,
  getReadReceipts,
  computeUnreadCounts,
  type ThreadMessage,
} from '@/lib/db/messages'
import { addComment } from '@/app/actions/comments'
import ApplyModal from '@/components/projects/ApplyModal'
import ApplicationsPanel from '@/components/projects/ApplicationsPanel'
import ApplicationThread from '@/components/projects/ApplicationThread'
import MarkCommentsRead from '@/components/projects/MarkCommentsRead'
import VoteButton from '@/components/projects/VoteButton'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const [project, { data: { user } }] = await Promise.all([
    getProjectById(id),
    supabase.auth.getUser(),
  ])

  if (!project) notFound()

  const isOwner = user?.id === project.owner_id
  const roleIds = project.roles.map((role: ProjectRole) => role.id)

  // Applicant sees only their own applications; owner sees all.
  const myApplications: UserRoleApplication[] = user && !isOwner
    ? await getApplicationsByUserForRoles(user.id, roleIds)
    : []

  const allApplications: RoleApplication[] = isOwner ? await getApplicationsForRoles(roleIds) : []
  const rolesWithApplications = isOwner
    ? project.roles.map((role: ProjectRole) => ({
        ...role,
        applications: allApplications.filter(application => application.role_id === role.id),
      }))
    : []

  // Load thread messages for whichever application IDs are relevant to this user.
  // The result is keyed by applicationId and passed down to ApplicationThread /
  // ApplicationsPanel so each thread renders with server-fetched initial state.
  const relevantAppIds = isOwner
    ? allApplications.map(application => application.id)
    : myApplications.map(application => application.id)

  const threadsData: Record<string, { messages: ThreadMessage[]; unreadCount: number }> = {}
  if (user && relevantAppIds.length > 0) {
    const [messages, reads] = await Promise.all([
      getMessages(relevantAppIds),
      getReadReceipts(relevantAppIds, user.id),
    ])
    const unreadCounts = computeUnreadCounts(messages, reads, user.id, relevantAppIds)
    // Group messages by application_id
    const messagesByApp: Record<string, ThreadMessage[]> = {}
    for (const msg of messages) {
      if (!messagesByApp[msg.application_id]) messagesByApp[msg.application_id] = []
      messagesByApp[msg.application_id].push(msg)
    }
    for (const appId of relevantAppIds) {
      threadsData[appId] = {
        messages: messagesByApp[appId] ?? [],
        unreadCount: unreadCounts[appId] ?? 0,
      }
    }
  }

  const roleToApplication = new Map(
    myApplications.map(application => [application.role_id, application] as const)
  )
  const appliedRoleIds = new Set(myApplications.map(application => application.role_id))
  const openRoles = project.roles.filter((role: ProjectRole) => role.status === 'open')
  const voteCount = project.votes?.length ?? 0
  const hasVoted = !!user && project.votes.some(v => v.user_id === user.id)
  const comments = [...project.comments].sort(
    (a: ProjectComment, b: ProjectComment) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-[clamp(2.75rem,7vw,4.5rem)] sm:px-6 lg:px-8">
      <Link href="/projects" className="mb-8 inline-flex items-center rounded-full border border-black/10 bg-white/85 px-4 py-2 text-sm text-black/58 shadow-[0_10px_28px_rgba(0,0,0,0.04)] hover:bg-white hover:text-black">
        ← Back to ideas
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.35fr_0.9fr] lg:items-start">
        <div className="rounded-[2rem] border border-black/10 bg-white/92 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.06)] sm:p-8">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">
            Project
          </p>
          <h1 className="mt-4 text-[clamp(2.5rem,6vw,4.25rem)] font-semibold leading-tight tracking-[-0.05em] text-black">
            {project.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-black/52">
            <span>
              by{' '}
              <Link href={`/profile/${project.owner_id}`} className="hover:underline">
                {project.users?.name ?? 'Anonymous'}
              </Link>
            </span>
            <span className="h-1 w-1 rounded-full bg-black/20" />
            <VoteButton
              projectId={project.id}
              initialCount={voteCount}
              initialHasVoted={hasVoted}
              isAuthenticated={!!user}
            />
            <span className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1">
              {openRoles.length} open {openRoles.length === 1 ? 'role' : 'roles'}
            </span>
          </div>

          <section className="mt-10">
            <h2 className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">
              About
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-black/68">
              {project.description}
            </p>
          </section>

          {project.why_it_matters && (
            <section className="mt-10 border-t border-black/8 pt-10">
              <h2 className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">
                Why It Matters
              </h2>
              <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-black/68">
                {project.why_it_matters}
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-[2rem] border border-black bg-black p-6 text-white shadow-[0_28px_90px_rgba(0,0,0,0.18)] lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto">
            <p className="text-[0.7rem] uppercase tracking-[0.32em] text-white/48">Founder Commitment</p>
            <div className="mt-5 text-4xl font-semibold tracking-[-0.05em]">
              {project.commitment_hours_pw ?? 0}h
            </div>
            <p className="mt-2 text-sm uppercase tracking-[0.22em] text-white/45">per week</p>
            <div className="mt-6 rounded-[1.4rem] border border-white/12 bg-white/5 p-4">
              <p className="text-[0.68rem] uppercase tracking-[0.28em] text-white/42">Role</p>
              <p className="mt-2 text-lg font-medium text-white">
                {project.commitment_role ?? 'Undisclosed'}
              </p>
              {project.commitment_description && (
                <p className="mt-3 text-sm leading-6 text-white/68">
                  {project.commitment_description}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/10 bg-white/92 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.05)]">
            <p className="text-[0.7rem] uppercase tracking-[0.32em] text-black/42">Project Snapshot</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[1.25rem] border border-black/8 bg-black/[0.03] p-4">
                <p className="text-[0.66rem] uppercase tracking-[0.26em] text-black/38">Owner</p>
                <Link href={`/profile/${project.owner_id}`} className="mt-2 block text-sm font-medium text-black hover:underline">
                  {project.users?.name ?? 'Anonymous'}
                </Link>
              </div>
              <div className="rounded-[1.25rem] border border-black/8 bg-black/[0.03] p-4">
                <p className="text-[0.66rem] uppercase tracking-[0.26em] text-black/38">Interest</p>
                <p className="mt-2 text-sm font-medium text-black">{voteCount} {voteCount === 1 ? 'upvote' : 'upvotes'}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Open roles */}
      {openRoles.length > 0 && (
        <section className="mt-10">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">
                Open Roles
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-black">
                Where help is needed now
              </h2>
            </div>
            <div className="text-sm text-black/45">
              {openRoles.length} {openRoles.length === 1 ? 'role' : 'roles'} available
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {openRoles.map((role: ProjectRole) => {
              const myApp = roleToApplication.get(role.id)
              const skillsNeeded = role.skills_needed ?? []
              return (
                <div key={role.id} className="rounded-[1.9rem] border border-black/10 bg-white/92 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.05)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-xl font-semibold tracking-[-0.03em] text-black">{role.title}</h3>
                      {role.description && (
                        <p className="mt-2 text-sm leading-6 text-black/58">{role.description}</p>
                      )}
                      {skillsNeeded.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {skillsNeeded.map((skill: string) => (
                            <span key={skill} className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs font-medium text-black/62">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Only show apply button to authenticated non-owners */}
                    {user && !isOwner && (
                      <ApplyModal
                        role={role}
                        projectId={project.id}
                        alreadyApplied={appliedRoleIds.has(role.id)}
                      />
                    )}
                  </div>

                  {/* Message thread for the applicant */}
                  {myApp && user && (
                    <ApplicationThread
                      applicationId={myApp.id}
                      projectId={project.id}
                      currentUserId={user.id}
                      messages={threadsData[myApp.id]?.messages ?? []}
                      unreadCount={threadsData[myApp.id]?.unreadCount ?? 0}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Mark comments as read when owner visits — clears comment notification count */}
      {isOwner && user && <MarkCommentsRead projectId={project.id} />}

      {/* Applications panel — owner only */}
      {isOwner && user && (
        <ApplicationsPanel
          roles={rolesWithApplications}
          projectId={project.id}
          currentUserId={user.id}
          threadsData={threadsData}
        />
      )}

      {/* Comments */}
      <section className="mt-10 rounded-[2rem] border border-black/10 bg-white/92 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.05)] sm:p-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">
              Discussion
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-black">
              Comments {comments.length > 0 && <span className="font-normal text-black/32">({comments.length})</span>}
            </h2>
          </div>
          <div className="text-sm text-black/45">
            Open conversation around the project
          </div>
        </div>

        {comments.length === 0 ? (
          <p className="mb-6 rounded-[1.5rem] border border-dashed border-black/12 bg-black/[0.02] px-5 py-8 text-center text-sm text-black/42">
            No comments yet.
          </p>
        ) : (
          <div className="mb-6 max-h-[28rem] space-y-5 overflow-y-auto pr-2">
            {comments.map((comment: ProjectComment) => (
              <div key={comment.id} className="flex gap-3 rounded-[1.5rem] border border-black/8 bg-black/[0.02] p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/[0.08] text-xs font-medium text-black/60">
                  {comment.users?.avatar_url
                    ? <AvatarImage src={comment.users.avatar_url} alt="" size={36} className="h-full w-full object-cover" />
                    : comment.users?.name?.[0]?.toUpperCase() ?? '?'
                  }
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/profile/${comment.user_id}`} className="text-sm font-medium text-black hover:underline">
                      {comment.users?.name ?? 'Anonymous'}
                    </Link>
                    <span className="text-xs text-black/35">
                      {new Date(comment.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-black/65">{comment.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {user ? (
          <form action={addComment.bind(null, project.id) as (fd: FormData) => void} className="rounded-[1.6rem] border border-black/10 bg-black/[0.02] p-4">
            <textarea
              name="body"
              required
              rows={3}
              placeholder="Leave a comment..."
              className="w-full rounded-[1.2rem] border border-black/10 bg-white px-4 py-3 text-sm text-black placeholder:text-black/32 focus:outline-none focus:ring-2 focus:ring-black"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center rounded-full border border-black bg-black px-5 py-2.5 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-black/85"
              >
                Post comment
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-black/42">
            <Link href="/login" className="underline hover:text-black">Sign in</Link> to leave a comment.
          </p>
        )}
      </section>
    </div>
  )
}
