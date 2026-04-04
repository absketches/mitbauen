import Link from 'next/link'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { getNotificationCount } from '@/lib/db/notifications'
import UserMenu from './UserMenu'

export default async function Navbar() {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  // Don't render the navbar on auth pages
  if (pathname === '/login') return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: { name: string | null; avatar_url: string | null } | null = null
  let unreadCount = 0
  if (user) {
    const [{ data }, count] = await Promise.all([
      supabase.from('users').select('name, avatar_url').eq('id', user.id).single(),
      getNotificationCount(user.id),
    ])
    profile = data
    unreadCount = count
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
              <Link href="/messages" className="relative p-1.5 text-gray-500 hover:text-gray-900 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gray-900 text-white text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
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
