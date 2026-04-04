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
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[rgba(250,250,247,0.82)] backdrop-blur-xl">
      <nav className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link href="/" className="group flex min-w-0 flex-col">
          <span className="hidden text-[0.65rem] uppercase tracking-[0.34em] text-black/45 transition-colors group-hover:text-black/60 sm:block">
            Build Together
          </span>
          <span className="text-sm font-semibold tracking-[-0.02em] text-black sm:text-base">
            Mitbauen
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/projects"
            className="hidden rounded-full px-3 py-2 text-sm font-medium text-black/60 hover:bg-black/[0.04] hover:text-black md:inline-flex"
          >
            Browse ideas
          </Link>

          {user ? (
            <>
              <Link
                href="/projects/new"
                className="inline-flex items-center rounded-full border border-black bg-black px-3 py-2 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-black/85 sm:px-4"
              >
                <span className="sm:hidden">Post</span>
                <span className="hidden sm:inline">Post an idea</span>
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
              className="inline-flex items-center rounded-full border border-black bg-black px-3 py-2 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-black/85 sm:px-4"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
