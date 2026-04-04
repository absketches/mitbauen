'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { markThreadRead } from '@/app/actions/messages'
import { markCommentsRead } from '@/app/actions/comments'
import type { NotificationItem } from '@/lib/db/notifications'
import { formatLocalTime, notificationLabel } from '@/lib/notifications-ui'
import AvatarImage from './AvatarImage'

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, url }: { name: string | null; url: string | null }) {
  const initials = name?.[0]?.toUpperCase() ?? '?'
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/[0.08] text-sm font-medium text-black/58">
      {url
        ? <AvatarImage src={url} alt="" size={40} className="h-full w-full object-cover" />
        : initials
      }
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = { notifications: NotificationItem[] }

export default function NotificationBell({ notifications }: Props) {
  const router  = useRouter()
  const ref     = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  // Close when clicking outside
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  async function handleClick(item: NotificationItem) {
    setOpen(false)
    // Mark the notification source as read (invalidates layout cache server-side)
    if (item.type === 'thread' && item.applicationId) {
      await markThreadRead(item.applicationId)
    } else if (item.type === 'comment') {
      await markCommentsRead(item.projectId)
    }
    // Navigate to the notification target, then refresh server components
    // so the badge drops immediately (works even if navigating to current page)
    router.push(item.link)
    router.refresh()
  }

  const count = notifications.length

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/74 text-black/52 hover:bg-white hover:text-black"
        aria-label={count > 0 ? `${count} notifications` : 'Notifications'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[10px] font-medium leading-none text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-[1.6rem] border border-black/10 bg-[rgba(250,250,247,0.98)] shadow-[0_24px_80px_rgba(0,0,0,0.12)] sm:w-96">
          {/* Header */}
          <div className="border-b border-black/8 px-5 py-4">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.28em] text-black/38">Inbox</p>
            <h3 className="mt-1 text-sm font-semibold text-black">Notifications</h3>
          </div>

          {/* Items */}
          {notifications.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-black/42">
              All caught up!
            </div>
          ) : (
            <ul className="max-h-[480px] overflow-y-auto divide-y divide-black/6">
              {notifications.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => handleClick(item)}
                    className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-black/[0.03]"
                  >
                    <Avatar name={item.actorName} url={item.actorAvatar} />

                    <div className="flex-1 min-w-0">
                      {/* Label + timestamp on same row */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium leading-snug text-black/78">
                          {notificationLabel(item)}
                        </p>
                        <span className="mt-0.5 shrink-0 whitespace-nowrap text-[11px] text-black/32">
                          {formatLocalTime(item.latestAt)}
                        </span>
                      </div>

                      {/* Message / comment preview */}
                      <p className="mt-1 text-xs text-black/48 line-clamp-2">
                        {item.latestBody}
                      </p>

                      {/* Unread count badge (only when > 1 unread) */}
                      {item.unreadCount > 1 && (
                        <span className="mt-2 inline-flex items-center rounded-full border border-black/8 bg-white px-2.5 py-1 text-[11px] text-black/46">
                          {item.unreadCount} unread
                        </span>
                      )}
                    </div>

                    {/* Unread dot */}
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-black" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
