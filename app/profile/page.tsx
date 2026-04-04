import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, email, bio, skills')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">
          {profile?.name ?? 'Your profile'}
        </h1>
        <p className="text-gray-500 mt-2">
          This page is ready for richer profile features as the product grows.
        </p>
      </div>

      <div className="border border-gray-200 rounded-xl bg-white p-6 space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Email</p>
          <p className="text-sm text-gray-900 mt-1">{profile?.email ?? user.email ?? 'Unknown'}</p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Bio</p>
          <p className="text-sm text-gray-700 mt-1">
            {profile?.bio?.trim() || 'No bio added yet.'}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Skills</p>
          {profile?.skills?.length ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.skills.map((skill: string) => (
                <span key={skill} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-700 mt-1">No skills listed yet.</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Link href="/projects" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
          Back to ideas
        </Link>
      </div>
    </div>
  )
}
