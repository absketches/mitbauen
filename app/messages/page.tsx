import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AvatarImage from '@/components/AvatarImage'
import {
  getApplicationIdsByApplicant,
  getApplicationIdsByOwner,
  getApplicationsById,
} from '@/lib/db/applications'
import { getMessages, getReadReceipts, computeUnreadCounts } from '@/lib/db/messages'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [applicantAppIds, ownerAppIds] = await Promise.all([
    getApplicationIdsByApplicant(user.id),
    getApplicationIdsByOwner(user.id),
  ])
  const allAppIds = [...new Set([...applicantAppIds, ...ownerAppIds])]

  if (allAppIds.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-[clamp(2.75rem,7vw,4.5rem)] sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-black/10 bg-white/92 px-6 py-14 text-center shadow-[0_24px_80px_rgba(0,0,0,0.05)] sm:px-10">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">
            Messages
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-black">
            No conversations yet
          </h1>
          <p className="mt-4 text-sm leading-7 text-black/48">
            Apply to a project or review your applications to start a thread.
          </p>
        </div>
      </div>
    )
  }

  const [appRows, messages, reads] = await Promise.all([
    getApplicationsById(allAppIds),
    getMessages(allAppIds),
    getReadReceipts(allAppIds, user.id),
  ])

  const unreadCounts = computeUnreadCounts(messages, reads, user.id, allAppIds)

  const lastMessageMap = new Map<string, { body: string; created_at: string }>()
  for (const msg of messages) {
    lastMessageMap.set(msg.application_id, msg)
  }

  const threads = appRows.map(app => {
    const isOwner = app.project_owner_id === user.id
    return {
      applicationId: app.id,
      projectId: app.project_id,
      projectTitle: app.project_title,
      roleTitle: app.role_title,
      otherPartyName: isOwner ? app.applicant_name : app.owner_name,
      otherPartyAvatar: isOwner ? app.applicant_avatar : app.owner_avatar,
      lastMessage: lastMessageMap.get(app.id) ?? null,
      unread: unreadCounts[app.id] ?? 0,
    }
  })

  threads.sort((a, b) => {
    if (!a.lastMessage && !b.lastMessage) return 0
    if (!a.lastMessage) return 1
    if (!b.lastMessage) return -1
    return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-[clamp(2.75rem,7vw,4.5rem)] sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">
            Inbox
          </p>
          <h1 className="mt-2 text-[clamp(2.35rem,6vw,3.3rem)] font-semibold tracking-[-0.05em] text-black">
            Messages
          </h1>
          <p className="mt-2 text-sm leading-7 text-black/56">
            Conversations are grouped by application so every thread stays tied to the role and project context.
          </p>
        </div>

        <div className="inline-flex items-center rounded-full border border-black/10 bg-white/85 px-4 py-2 text-sm text-black/58 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          {threads.length} active {threads.length === 1 ? 'thread' : 'threads'}
        </div>
      </div>

      <div className="space-y-3">
        {threads.map(thread => {
          const initials = thread.otherPartyName?.[0]?.toUpperCase() ?? '?'
          return (
            <Link
              key={thread.applicationId}
              href={`/projects/${thread.projectId}#thread-${thread.applicationId}`}
              className="group grid grid-cols-[auto_1fr] gap-3 rounded-[1.75rem] border border-black/10 bg-white/92 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-0.5 hover:border-black/16 hover:shadow-[0_28px_80px_rgba(0,0,0,0.08)] sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4 sm:p-5"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/[0.08] text-sm font-medium text-black/60">
                {thread.otherPartyAvatar
                  ? <AvatarImage src={thread.otherPartyAvatar} alt="" size={48} className="h-full w-full object-cover" />
                  : initials
                }
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-black truncate">
                    {thread.otherPartyName ?? 'Anonymous'}
                  </span>
                  <span className="text-[0.68rem] uppercase tracking-[0.24em] text-black/32">
                    {thread.roleTitle}
                  </span>
                </div>
                <p className="mt-1 text-sm text-black/45 truncate">{thread.projectTitle}</p>
                <p className="mt-3 text-sm leading-6 text-black/58 truncate">
                  {thread.lastMessage ? thread.lastMessage.body : 'No messages yet'}
                </p>
              </div>

              <div className="col-start-2 flex items-center gap-2 sm:col-start-auto sm:flex-col sm:items-end sm:justify-center">
                {thread.lastMessage && (
                  <span className="text-xs text-black/38">
                    {new Date(thread.lastMessage.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                )}
                {thread.unread > 0 && (
                  <span className="rounded-full bg-black px-2 py-1 text-xs font-medium leading-none text-white">
                    {thread.unread}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
