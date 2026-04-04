import Link from 'next/link'
import { getProjectFeed, type ProjectFeedItem, type ProjectRoleSummary } from '@/lib/db/projects'

export default async function ProjectsPage() {
  const projects = await getProjectFeed()

  return (
    <div className="mx-auto max-w-7xl px-4 py-[clamp(2.75rem,7vw,4.5rem)] sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">
            Project Feed
          </p>
          <h1 className="mt-3 text-[clamp(2.35rem,6vw,3.4rem)] font-semibold tracking-[-0.05em] text-black">
            Find a project worth building.
          </h1>
          <p className="mt-3 text-base leading-7 text-black/58">
            Every card starts with the founder&apos;s own commitment so the strongest signals are
            visible before the pitch.
          </p>
        </div>

        <div className="inline-flex items-center rounded-full border border-black/10 bg-white/85 px-4 py-2 text-sm text-black/58 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          {projects.length} {projects.length === 1 ? 'idea' : 'ideas'} live
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-[2rem] border border-black/10 bg-white/90 px-6 py-20 text-center text-black/45 shadow-[0_24px_80px_rgba(0,0,0,0.05)]">
          No ideas yet. Be the first to post one.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project: ProjectFeedItem) => {
            const openRoles = project.roles?.filter(
              (role: ProjectRoleSummary) => role.status === 'open'
            ) ?? []
            const voteCount = project.votes?.length ?? 0

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group flex min-h-[clamp(18.5rem,38vw,21rem)] flex-col rounded-[1.9rem] border border-black/10 bg-white/92 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-1 hover:border-black/18 hover:shadow-[0_30px_90px_rgba(0,0,0,0.1)] sm:p-6"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="inline-flex items-center rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.24em] text-black/45">
                    Founder-led
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-1 text-sm text-black/48">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    {voteCount}
                  </div>
                </div>

                <div className="mb-4 flex-1">
                  <h2 className="text-xl font-semibold leading-tight tracking-[-0.03em] text-black line-clamp-3">
                    {project.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-black/58 line-clamp-4">
                    {project.description}
                  </p>
                </div>

                <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-2xl border border-black/10 bg-black px-4 py-3 text-xs text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
                  <span className="truncate">
                    <strong>{project.commitment_hours_pw}h/wk</strong> · <strong>{project.commitment_role}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/8 pt-4 text-xs text-black/46">
                  <span className="truncate">by {project.users?.name ?? 'Anonymous'}</span>
                  {openRoles.length > 0 && (
                    <span className="rounded-full border border-black/10 px-3 py-1">
                      {openRoles.length} open {openRoles.length === 1 ? 'role' : 'roles'}
                    </span>
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
