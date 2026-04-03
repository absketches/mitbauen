'use client'

import { useState } from 'react'
import { respondToApplication } from '@/app/actions/applications'

type Application = {
  id: string
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
}

function ApplicationCard({ app, projectId }: { app: Application; projectId: string }) {
  const [status, setStatus] = useState(app.status)
  const [loading, setLoading] = useState<'accepted' | 'rejected' | null>(null)

  async function respond(newStatus: 'accepted' | 'rejected') {
    setLoading(newStatus)
    const result = await respondToApplication(projectId, app.id, newStatus)
    if (!result?.error) setStatus(newStatus)
    setLoading(null)
  }

  const initials = app.users?.name?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      {/* Applicant header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0 overflow-hidden flex items-center justify-center text-xs font-medium text-gray-600">
            {app.users?.avatar_url
              ? <img src={app.users.avatar_url} alt="" className="w-full h-full object-cover" />
              : initials
            }
          </div>
          <span className="text-sm font-medium text-gray-900">{app.users?.name ?? 'Anonymous'}</span>
        </div>

        {status === 'pending' ? (
          <div className="flex gap-2">
            <button
              onClick={() => respond('accepted')}
              disabled={!!loading}
              className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading === 'accepted' ? '...' : 'Accept'}
            </button>
            <button
              onClick={() => respond('rejected')}
              disabled={!!loading}
              className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {loading === 'rejected' ? '...' : 'Decline'}
            </button>
          </div>
        ) : (
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            status === 'accepted'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}>
            {status === 'accepted' ? 'Accepted' : 'Declined'}
          </span>
        )}
      </div>

      {/* Message */}
      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Why they want to join</p>
          <p className="text-sm text-gray-700">{app.message}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">What they bring</p>
          <p className="text-sm text-gray-700">{app.what_i_bring}</p>
        </div>
      </div>
    </div>
  )
}

export default function ApplicationsPanel({ roles, projectId }: Props) {
  const rolesWithApps = roles.filter(r => r.applications.length > 0)
  const totalCount = roles.reduce((sum, r) => sum + r.applications.length, 0)

  return (
    <section className="mb-8 border border-gray-200 rounded-xl p-6 bg-gray-50">
      <h2 className="text-lg font-medium text-gray-900 mb-1">
        Applications
        <span className="ml-2 text-sm font-normal text-gray-400">
          {totalCount} {totalCount === 1 ? 'application' : 'applications'}
        </span>
      </h2>
      <p className="text-xs text-gray-400 mb-5">Only visible to you as the project owner.</p>

      {rolesWithApps.length === 0 ? (
        <p className="text-sm text-gray-400">No applications yet.</p>
      ) : (
        <div className="space-y-6">
          {rolesWithApps.map(role => (
            <div key={role.id}>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                {role.title}
                <span className="ml-2 text-gray-400 font-normal">({role.applications.length})</span>
              </h3>
              <div className="space-y-3">
                {role.applications.map(app => (
                  <ApplicationCard key={app.id} app={app} projectId={projectId} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
