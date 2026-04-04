'use client'

import { useState } from 'react'
import Link from 'next/link'
import { respondToApplication } from '@/app/actions/applications'
import ApplicationThread from './ApplicationThread'
import AvatarImage from '@/components/AvatarImage'

type Message = {
  id: string
  body: string
  created_at: string
  sender_id: string
  users: { name: string | null; avatar_url: string | null } | null
}

type Application = {
  id: string
  applicant_id: string
  message: string
  what_i_bring: string
  status: 'pending' | 'accepted' | 'rejected'
  users: { name: string | null; avatar_url: string | null } | null
}

type Role = {
  id: string
  title: string
  applications: Application[]
}

type Props = {
  roles: Role[]
  projectId: string
  currentUserId: string
  threadsData: Record<string, { messages: Message[]; unreadCount: number }>
}

function ApplicationCard({
  app,
  projectId,
  currentUserId,
  thread,
}: {
  app: Application
  projectId: string
  currentUserId: string
  thread: { messages: Message[]; unreadCount: number }
}) {
  const [status, setStatus] = useState(app.status)
  const [loading, setLoading] = useState<'accepted' | 'rejected' | null>(null)

  async function respond(newStatus: 'accepted' | 'rejected') {
    setLoading(newStatus)
    const result = await respondToApplication(projectId, app.id, newStatus)
    if (!result || !('error' in result) || !result.error) setStatus(newStatus)
    setLoading(null)
  }

  const initials = app.users?.name?.[0]?.toUpperCase() ?? '?'

  return (
    <article className="rounded-[1.75rem] border border-black/10 bg-white/95 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.05)] sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/[0.07] text-xs font-semibold text-black/58">
            {app.users?.avatar_url
              ? <AvatarImage src={app.users.avatar_url} alt="" size={40} className="h-full w-full object-cover" />
              : initials
            }
          </div>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.26em] text-black/35">
              Applicant
            </p>
            <Link href={`/profile/${app.applicant_id}`} className="truncate text-base font-semibold tracking-[-0.02em] text-black hover:underline">
              {app.users?.name ?? 'Anonymous'}
            </Link>
          </div>
        </div>

        {status === 'pending' ? (
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => respond('accepted')}
              disabled={!!loading}
              className="rounded-full border border-black bg-black px-4 py-2 text-xs font-medium text-white hover:-translate-y-0.5 hover:bg-black/86 disabled:opacity-50"
            >
              {loading === 'accepted' ? '...' : 'Accept'}
            </button>
            <button
              onClick={() => respond('rejected')}
              disabled={!!loading}
              className="rounded-full border border-black/12 bg-white px-4 py-2 text-xs font-medium text-black/62 hover:bg-black/[0.03] disabled:opacity-50"
            >
              {loading === 'rejected' ? '...' : 'Decline'}
            </button>
          </div>
        ) : (
          <span className={`inline-flex shrink-0 items-center rounded-full border px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] ${
            status === 'accepted'
              ? 'border-black bg-black text-white'
              : 'border-black/12 bg-black/[0.04] text-black/48'
          }`}>
            {status === 'accepted' ? 'Accepted' : 'Declined'}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.35rem] border border-black/8 bg-black/[0.025] p-4">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.26em] text-black/38">
            Why they want to join
          </p>
          <p className="mt-3 text-sm leading-6 text-black/64">{app.message}</p>
        </div>
        <div className="rounded-[1.35rem] border border-black/8 bg-black/[0.025] p-4">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.26em] text-black/38">
            What they bring
          </p>
          <p className="mt-3 text-sm leading-6 text-black/64">{app.what_i_bring}</p>
        </div>
      </div>

      <ApplicationThread
        applicationId={app.id}
        projectId={projectId}
        currentUserId={currentUserId}
        messages={thread.messages}
        unreadCount={thread.unreadCount}
      />
    </article>
  )
}

export default function ApplicationsPanel({ roles, projectId, currentUserId, threadsData }: Props) {
  const rolesWithApps = roles.filter(r => r.applications.length > 0)
  const totalCount = roles.reduce((sum, r) => sum + r.applications.length, 0)

  return (
    <section className="mt-10 rounded-[2rem] border border-black/10 bg-white/92 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.05)] sm:p-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">
            Applications
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-black">
            People who want in
          </h2>
          <p className="mt-3 text-sm leading-7 text-black/50">
            Only visible to you as the project owner.
          </p>
        </div>

        <div className="inline-flex items-center rounded-full border border-black/10 bg-black/[0.03] px-4 py-2 text-sm text-black/58">
          {totalCount} {totalCount === 1 ? 'application' : 'applications'}
        </div>
      </div>

      {rolesWithApps.length === 0 ? (
        <div className="rounded-[1.6rem] border border-dashed border-black/12 bg-black/[0.02] px-6 py-10 text-center text-sm text-black/42">
          No applications yet.
        </div>
      ) : (
        <div className="space-y-6">
          {rolesWithApps.map(role => (
            <div key={role.id} className="rounded-[1.75rem] border border-black/8 bg-black/[0.025] p-5 sm:p-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-black">
                  {role.title}
                </h3>
                <span className="inline-flex items-center rounded-full border border-black/10 bg-white/90 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-black/48">
                  {role.applications.length} {role.applications.length === 1 ? 'candidate' : 'candidates'}
                </span>
              </div>
              <div className="space-y-3">
                {role.applications.map(app => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    projectId={projectId}
                    currentUserId={currentUserId}
                    thread={threadsData[app.id] ?? { messages: [], unreadCount: 0 }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
