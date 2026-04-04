// @vitest-environment node
/**
 * Tests for computeUnreadCounts — the pure per-thread unread counter.
 * This is separate from computeMessageNotifications (which counts across all threads).
 * computeUnreadCounts produces a per-applicationId map used inside the project page.
 */
import { describe, it, expect } from 'vitest'
import { computeUnreadCounts } from '@/lib/db/messages'
import type { ThreadMessage } from '@/lib/db/messages'

const USER  = 'user-1'
const OTHER = 'other-user'

function msg(applicationId: string, senderId: string, createdAt: string): ThreadMessage {
  return {
    id: `msg-${Math.random()}`,
    application_id: applicationId,
    body: 'hi',
    created_at: createdAt,
    sender_id: senderId,
    users: null,
  }
}

describe('computeUnreadCounts', () => {
  it('returns 0 for all threads when there are no messages', () => {
    const result = computeUnreadCounts([], [], USER, ['app-1', 'app-2'])
    expect(result).toEqual({ 'app-1': 0, 'app-2': 0 })
  })

  it('counts unread messages from others per thread', () => {
    const messages = [
      msg('app-1', OTHER, '2024-01-02T10:00:00Z'),
      msg('app-1', OTHER, '2024-01-03T10:00:00Z'),
    ]
    const result = computeUnreadCounts(messages, [], USER, ['app-1'])
    expect(result['app-1']).toBe(2)
  })

  it('does not count own messages', () => {
    const messages = [msg('app-1', USER, '2024-01-02T10:00:00Z')]
    const result = computeUnreadCounts(messages, [], USER, ['app-1'])
    expect(result['app-1']).toBe(0)
  })

  it('does not count messages before last-read timestamp', () => {
    const messages = [msg('app-1', OTHER, '2024-01-01T08:00:00Z')]
    const reads    = [{ application_id: 'app-1', last_read_at: '2024-01-02T00:00:00Z' }]
    const result = computeUnreadCounts(messages, reads, USER, ['app-1'])
    expect(result['app-1']).toBe(0)
  })

  it('counts messages after last-read timestamp', () => {
    const messages = [msg('app-1', OTHER, '2024-01-03T10:00:00Z')]
    const reads    = [{ application_id: 'app-1', last_read_at: '2024-01-02T00:00:00Z' }]
    const result = computeUnreadCounts(messages, reads, USER, ['app-1'])
    expect(result['app-1']).toBe(1)
  })

  it('counts independently across multiple threads', () => {
    const messages = [
      msg('app-1', OTHER, '2024-01-03T10:00:00Z'), // unread
      msg('app-1', OTHER, '2024-01-01T08:00:00Z'), // read
      msg('app-2', OTHER, '2024-01-04T10:00:00Z'), // unread (no read entry)
      msg('app-2', USER,  '2024-01-05T10:00:00Z'), // own → not counted
    ]
    const reads = [{ application_id: 'app-1', last_read_at: '2024-01-02T00:00:00Z' }]
    const result = computeUnreadCounts(messages, reads, USER, ['app-1', 'app-2'])
    expect(result['app-1']).toBe(1)
    expect(result['app-2']).toBe(1)
  })

  it('returns 0 for application IDs that have no messages at all', () => {
    const result = computeUnreadCounts([], [], USER, ['app-99'])
    expect(result['app-99']).toBe(0)
  })
})
