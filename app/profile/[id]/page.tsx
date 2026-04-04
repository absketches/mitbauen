import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import AvatarImage from '@/components/AvatarImage'
import { getUserProfile, getProjectsByOwner } from '@/lib/db/users'

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [profile, projects, { data: { user } }] = await Promise.all([
    getUserProfile(id),
    getProjectsByOwner(id),
    supabase.auth.getUser(),
  ])

  if (!profile) notFound()

  // Redirect to own profile page if viewing yourself
  if (user?.id === id) {
    const { redirect } = await import('next/navigation')
    redirect('/profile')
  }

  const initials = profile.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="mx-auto max-w-2xl px-4 py-[clamp(2.75rem,7vw,4.5rem)] sm:px-6">
      <Link
        href="/projects"
        className="mb-8 inline-flex items-center rounded-full border border-black/10 bg-white/85 px-4 py-2 text-sm text-black/58 shadow-[0_10px_28px_rgba(0,0,0,0.04)] hover:bg-white hover:text-black"
      >
        ← Back to ideas
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-center gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-black/[0.06] text-lg font-semibold text-black/58">
          {profile.avatar_url
            ? <AvatarImage src={profile.avatar_url} alt={profile.name ?? 'User'} size={64} className="h-full w-full object-cover" />
            : initials
          }
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-black">
            {profile.name ?? 'Anonymous'}
          </h1>
        </div>
      </div>

      {/* Bio + Skills (view-only) */}
      <div className="mb-8 rounded-[2rem] border border-black/10 bg-white/92 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.05)] space-y-6">
        <div>
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.26em] text-black/38">Bio</p>
          <p className="mt-2 text-sm leading-7 text-black/65">
            {profile.bio?.trim() || <span className="italic text-black/32">No bio yet.</span>}
          </p>
        </div>

        <div>
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.26em] text-black/38">Skills</p>
          {profile.skills?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.skills.map(skill => (
                <span key={skill} className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs font-medium text-black/62">
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm italic text-black/32">No skills listed.</p>
          )}
        </div>
      </div>

      {/* Their projects */}
      <div className="rounded-[2rem] border border-black/10 bg-white/92 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.05)]">
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">
          Projects
        </p>
        {projects.length === 0 ? (
          <p className="mt-4 text-sm italic text-black/32">No active projects.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {projects.map(project => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between rounded-[1.35rem] border border-black/8 bg-black/[0.02] px-4 py-3 text-sm hover:bg-black/[0.04]"
                >
                  <span className="font-medium text-black">{project.title}</span>
                  <span className="text-xs text-black/38">
                    {new Date(project.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
