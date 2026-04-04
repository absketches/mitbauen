/**
 * Pure UI helpers for notification display.
 * Kept in lib/ (not components/) so they can be imported by tests without
 * requiring a DOM or React rendering environment.
 */

import type { NotificationItem } from '@/lib/db/notifications'

/**
 * Converts a UTC ISO timestamp to a human-readable string in the user's local
 * timezone (determined by the browser at runtime).
 *
 * Examples:
 *   Today 14:35
 *   Yesterday 09:12
 *   Mon 08:00
 *   12 Jan 14:35
 */
export function formatLocalTime(utcIso: string): string {
  const date = new Date(utcIso)
  const now  = new Date()

  const startOfToday     = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000)
  const startOfDate      = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  if (startOfDate.getTime() === startOfToday.getTime())     return `Today ${timeStr}`
  if (startOfDate.getTime() === startOfYesterday.getTime()) return `Yesterday ${timeStr}`

  const diffDays = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000)
  if (diffDays < 7) {
    return `${date.toLocaleDateString('en-GB', { weekday: 'short' })} ${timeStr}`
  }

  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${timeStr}`
}

/**
 * Returns a human-readable one-line label for a notification item.
 * E.g. "Alice messaged you in My Project · Frontend Dev"
 */
export function notificationLabel(item: NotificationItem): string {
  const actor = item.actorName ?? 'Someone'
  const role  = item.roleTitle ? ` · ${item.roleTitle}` : ''
  switch (item.type) {
    case 'thread':
      return `${actor} messaged you in ${item.projectTitle}${role}`
    case 'new_application':
      return `${actor} applied to ${item.roleTitle ?? 'a role'} in ${item.projectTitle}`
    case 'comment':
      return `${actor} commented on ${item.projectTitle}`
  }
}
