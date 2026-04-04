import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
      <div className="max-w-2xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Messages</h1>
        <p className="text-gray-400 text-sm">
          No conversations yet. Apply to a project or review your applications to start a thread.
        </p>
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
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Messages</h1>

      <div className="space-y-2">
        {threads.map(thread => {
          const initials = thread.otherPartyName?.[0]?.toUpperCase() ?? '?'
          return (
            <Link
              key={thread.applicationId}
              href={`/projects/${thread.projectId}#thread-${thread.applicationId}`}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0 overflow-hidden flex items-center justify-center text-sm font-medium text-gray-600">
                {thread.otherPartyAvatar
                  ? <img src={thread.otherPartyAvatar} alt="" className="w-full h-full object-cover" />
                  : initials
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {thread.otherPartyName ?? 'Anonymous'}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">·</span>
                  <span className="text-xs text-gray-400 truncate">{thread.projectTitle}</span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {thread.roleTitle}
                  {thread.lastMessage ? ` — ${thread.lastMessage.body}` : ' — No messages yet'}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                {thread.lastMessage && (
                  <span className="text-xs text-gray-400">
                    {new Date(thread.lastMessage.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                )}
                {thread.unread > 0 && (
                  <span className="bg-gray-900 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
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
