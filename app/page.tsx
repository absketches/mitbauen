import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import SignOutButton from '@/components/SignOutButton'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-5xl font-semibold text-gray-900 mb-4">
          Mitbauen
        </h1>
        <p className="text-xl text-gray-500 mb-8">
          Post your idea. Show your commitment. Find your crew.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/projects"
            className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Browse ideas
          </Link>
          {user ? (
            <>
              <Link
                href="/projects/new"
                className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Post an idea
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
        {user && (
          <p className="mt-6 text-sm text-gray-400">
            Signed in as {user.email}
          </p>
        )}
      </div>
    </div>
  )
}
