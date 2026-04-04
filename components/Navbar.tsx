import Link from 'next/link'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { getNotifications } from '@/lib/db/notifications'
import UserMenu from './UserMenu'
import NotificationBell from './NotificationBell'

export default async function Navbar() {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  // Don't render the navbar on auth pages
  if (pathname === '/login') return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: { name: string | null; avatar_url: string | null } | null = null
  let notifications: Awaited<ReturnType<typeof getNotifications>> = []

  if (user) {
    const [{ data }, notifs] = await Promise.all([
      supabase.from('users').select('name, avatar_url').eq('id', user.id).single(),
      getNotifications(user.id),
    ])
    profile = data
    notifications = notifs
  }

  return (
    <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
      <nav className="w-full px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-base font-semibold text-gray-900 hover:text-gray-600 transition-colors">
          Mitbauen
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Browse ideas
          </Link>

          {user ? (
            <>
              <Link
                href="/projects/new"
                className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Post an idea
              </Link>

              {/* Notification bell — opens Facebook-style dropdown */}
              <NotificationBell notifications={notifications} />

              <UserMenu
                name={profile?.name ?? null}
                email={user.email ?? null}
                avatarUrl={profile?.avatar_url ?? null}
              />
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
