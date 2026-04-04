'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { markThreadRead } from '@/app/actions/messages'
import { markCommentsRead } from '@/app/actions/comments'
import type { NotificationItem } from '@/lib/db/notifications'
import { formatLocalTime, notificationLabel } from '@/lib/notifications-ui'

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, url }: { name: string | null; url: string | null }) {
  const initials = name?.[0]?.toUpperCase() ?? '?'
  return (
    <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0 overflow-hidden flex items-center justify-center text-sm font-medium text-gray-600">
      {url
        ? <img src={url} alt="" className="w-full h-full object-cover" />
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
        className="relative p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
        aria-label={count > 0 ? `${count} notifications` : 'Notifications'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-gray-900 text-white text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          </div>

          {/* Items */}
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              All caught up!
            </div>
          ) : (
            <ul className="max-h-[480px] overflow-y-auto divide-y divide-gray-50">
              {notifications.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => handleClick(item)}
                    className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <Avatar name={item.actorName} url={item.actorAvatar} />

                    <div className="flex-1 min-w-0">
                      {/* Label + timestamp on same row */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-gray-800 leading-snug">
                          {notificationLabel(item)}
                        </p>
                        <span className="text-[11px] text-gray-400 shrink-0 mt-0.5 whitespace-nowrap">
                          {formatLocalTime(item.latestAt)}
                        </span>
                      </div>

                      {/* Message / comment preview */}
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {item.latestBody}
                      </p>

                      {/* Unread count badge (only when > 1 unread) */}
                      {item.unreadCount > 1 && (
                        <span className="mt-1 inline-flex items-center text-[11px] text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                          {item.unreadCount} unread
                        </span>
                      )}
                    </div>

                    {/* Unread dot */}
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-gray-900 shrink-0" />
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
