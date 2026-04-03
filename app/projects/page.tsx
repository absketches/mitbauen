import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function ProjectsPage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      users (name, avatar_url),
      roles (id, title, status),
      votes (id)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Ideas</h1>
          <p className="text-gray-500 mt-1">Find a project worth building.</p>
        </div>
        <Link
          href="/projects/new"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
        >
          Post an idea
        </Link>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          No ideas yet. Be the first to post one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: any) => {
            const openRoles = project.roles?.filter((r: any) => r.status === 'open') ?? []
            const voteCount = project.votes?.length ?? 0

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex flex-col border border-gray-200 rounded-xl p-5 hover:border-gray-400 hover:shadow-sm transition-all bg-white"
              >
                {/* Title + votes */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-base font-medium text-gray-900 line-clamp-2 flex-1">
                    {project.title}
                  </h2>
                  <div className="flex items-center gap-1 text-gray-400 text-sm shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    {voteCount}
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-500 text-sm line-clamp-3 flex-1 mb-4">
                  {project.description}
                </p>

                {/* Commitment badge */}
                <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-xs mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  <span className="text-gray-600 truncate">
                    <strong>{project.commitment_hours_pw}h/wk</strong> · <strong>{project.commitment_role}</strong>
                  </span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                  <span>by {project.users?.name ?? 'Anonymous'}</span>
                  {openRoles.length > 0 && (
                    <span>{openRoles.length} open {openRoles.length === 1 ? 'role' : 'roles'}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
