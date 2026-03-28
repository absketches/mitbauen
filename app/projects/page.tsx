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
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
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
        <div className="space-y-4">
          {projects.map((project: any) => {
            const openRoles = project.roles?.filter((r: any) => r.status === 'open') ?? []
            const voteCount = project.votes?.length ?? 0

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block border border-gray-200 rounded-xl p-6 hover:border-gray-400 transition-colors bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-medium text-gray-900 truncate">
                      {project.title}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 text-sm shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    {voteCount}
                  </div>
                </div>

                {/* Commitment badge */}
                <div className="mt-4 inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <span className="text-gray-700">
                    Founder commits <strong>{project.commitment_hours_pw}h/week</strong> as <strong>{project.commitment_role}</strong>
                  </span>
                </div>

                {/* Roles and meta */}
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                  {openRoles.length > 0 && (
                    <span>
                      {openRoles.length} open {openRoles.length === 1 ? 'role' : 'roles'}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    by {project.users?.name ?? 'Anonymous'}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
