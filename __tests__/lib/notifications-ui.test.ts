// @vitest-environment jsdom
/**
 * Tests for the pure notification UI helpers.
 * These run in jsdom so Date uses the test runner's locale/timezone.
 * All assertions pin the time portion and use regex for the date so tests
 * remain correct regardless of the timezone the CI runner is in.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatLocalTime, notificationLabel } from '@/lib/notifications-ui'
import type { NotificationItem } from '@/lib/db/notifications'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a Date for "today" at the given UTC hour:minute */
function todayUtc(hour: number, minute = 0): string {
  const d = new Date()
  d.setUTCHours(hour, minute, 0, 0)
  return d.toISOString()
}

/** Build a Date N days ago at the given UTC hour */
function daysAgoUtc(days: number, hour = 10): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  d.setUTCHours(hour, 0, 0, 0)
  return d.toISOString()
}

// ─── formatLocalTime ──────────────────────────────────────────────────────────

describe('formatLocalTime', () => {
  afterEach(() => vi.useRealTimers())

  it('returns "Today HH:MM" for a timestamp earlier today', () => {
    const ts = todayUtc(8, 30)
    const result = formatLocalTime(ts)
    expect(result).toMatch(/^Today \d{2}:\d{2}$/)
  })

  it('returns "Yesterday HH:MM" for a timestamp 1 day ago', () => {
    const ts = daysAgoUtc(1, 9)
    const result = formatLocalTime(ts)
    expect(result).toMatch(/^Yesterday \d{2}:\d{2}$/)
  })

  it('returns a short weekday name for timestamps 2–6 days ago', () => {
    const ts = daysAgoUtc(3, 10)
    const result = formatLocalTime(ts)
    // Expect e.g. "Mon 10:00" — a 3-letter day name followed by HH:MM
    expect(result).toMatch(/^[A-Z][a-z]{2} \d{2}:\d{2}$/)
  })

  it('returns "D Mon HH:MM" for timestamps 7+ days ago', () => {
    const ts = daysAgoUtc(8, 14)
    const result = formatLocalTime(ts)
    // Expect e.g. "5 Jan 14:00"
    expect(result).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{2}:\d{2}$/)
  })
})

// ─── notificationLabel ────────────────────────────────────────────────────────

const base: Omit<NotificationItem, 'type' | 'roleTitle'> = {
  id: 'n-1',
  projectId: 'proj-1',
  projectTitle: 'Cool Project',
  actorName: 'Alice',
  actorAvatar: null,
  latestBody: 'Hello!',
  latestAt: '2024-06-01T10:00:00Z',
  unreadCount: 1,
  link: '/projects/proj-1',
  applicationId: 'app-1',
}

describe('notificationLabel', () => {
  it('formats a thread notification with role context', () => {
    const item: NotificationItem = { ...base, type: 'thread', roleTitle: 'Frontend Dev' }
    expect(notificationLabel(item)).toBe('Alice messaged you in Cool Project · Frontend Dev')
  })

  it('formats a thread notification without role context', () => {
    const item: NotificationItem = { ...base, type: 'thread', roleTitle: null }
    expect(notificationLabel(item)).toBe('Alice messaged you in Cool Project')
  })

  it('formats a new_application notification', () => {
    const item: NotificationItem = { ...base, type: 'new_application', roleTitle: 'Backend Dev' }
    expect(notificationLabel(item)).toBe('Alice applied to Backend Dev in Cool Project')
  })

  it('formats a new_application notification when role title is null', () => {
    const item: NotificationItem = { ...base, type: 'new_application', roleTitle: null }
    expect(notificationLabel(item)).toBe('Alice applied to a role in Cool Project')
  })

  it('formats a comment notification', () => {
    const item: NotificationItem = { ...base, type: 'comment', roleTitle: null }
    expect(notificationLabel(item)).toBe('Alice commented on Cool Project')
  })

  it('uses "Someone" when actorName is null', () => {
    const item: NotificationItem = { ...base, type: 'comment', roleTitle: null, actorName: null }
    expect(notificationLabel(item)).toBe('Someone commented on Cool Project')
  })
})
