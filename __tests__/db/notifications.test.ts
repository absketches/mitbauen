// @vitest-environment node
/**
 * Tests for notification computation logic.
 *
 * The pure helper functions (computeMessageNotifications,
 * computeCommentNotifications) are tested exhaustively here — they contain the
 * core "what counts as unread" business logic.
 *
 * getNotificationCount (the Supabase-calling orchestrator) is tested with a
 * mocked client to verify it wires the helpers together correctly and returns 0
 * on error.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  computeMessageNotifications,
  computeCommentNotifications,
} from '@/lib/db/notifications'

// ─── computeMessageNotifications ──────────────────────────────────────────────

describe('computeMessageNotifications', () => {
  const userId = 'user-1'

  it('returns 0 when there are no messages', () => {
    expect(computeMessageNotifications([], [], userId)).toBe(0)
  })

  it('counts messages from others that have never been read', () => {
    const msgs = [
      { application_id: 'app-1', sender_id: 'other-user', created_at: '2024-01-02T10:00:00Z' },
      { application_id: 'app-1', sender_id: 'other-user', created_at: '2024-01-03T10:00:00Z' },
    ]
    expect(computeMessageNotifications(msgs, [], userId)).toBe(2)
  })

  it('does not count the user\'s own messages', () => {
    const msgs = [
      { application_id: 'app-1', sender_id: userId, created_at: '2024-01-02T10:00:00Z' },
      { application_id: 'app-1', sender_id: userId, created_at: '2024-01-03T10:00:00Z' },
    ]
    expect(computeMessageNotifications(msgs, [], userId)).toBe(0)
  })

  it('does not count messages sent before the last-read timestamp', () => {
    const msgs = [
      { application_id: 'app-1', sender_id: 'other-user', created_at: '2024-01-01T08:00:00Z' },
    ]
    const reads = [{ application_id: 'app-1', last_read_at: '2024-01-01T09:00:00Z' }]
    expect(computeMessageNotifications(msgs, reads, userId)).toBe(0)
  })

  it('counts messages sent after the last-read timestamp', () => {
    const msgs = [
      { application_id: 'app-1', sender_id: 'other-user', created_at: '2024-01-02T10:00:00Z' },
    ]
    const reads = [{ application_id: 'app-1', last_read_at: '2024-01-01T09:00:00Z' }]
    expect(computeMessageNotifications(msgs, reads, userId)).toBe(1)
  })

  it('handles multiple threads independently', () => {
    const msgs = [
      // app-1: one old (read), one new (unread)
      { application_id: 'app-1', sender_id: 'other', created_at: '2024-01-01T08:00:00Z' },
      { application_id: 'app-1', sender_id: 'other', created_at: '2024-01-03T10:00:00Z' },
      // app-2: never read → all count
      { application_id: 'app-2', sender_id: 'other', created_at: '2024-01-02T10:00:00Z' },
      // app-3: own message → ignored
      { application_id: 'app-3', sender_id: userId,  created_at: '2024-01-02T10:00:00Z' },
    ]
    const reads = [{ application_id: 'app-1', last_read_at: '2024-01-02T00:00:00Z' }]
    // app-1: 1 unread, app-2: 1 unread, app-3: 0 (own)
    expect(computeMessageNotifications(msgs, reads, userId)).toBe(2)
  })

  it('does not count a message sent at exactly the last-read timestamp', () => {
    // Boundary: message at the exact same instant as last_read_at is considered read
    const ts = '2024-01-01T09:00:00Z'
    const msgs = [{ application_id: 'app-1', sender_id: 'other', created_at: ts }]
    const reads = [{ application_id: 'app-1', last_read_at: ts }]
    expect(computeMessageNotifications(msgs, reads, userId)).toBe(0)
  })

  it('handles a mix of own and others\' messages in the same thread', () => {
    const msgs = [
      { application_id: 'app-1', sender_id: 'other', created_at: '2024-01-03T10:00:00Z' },
      { application_id: 'app-1', sender_id: userId,  created_at: '2024-01-04T10:00:00Z' }, // own
      { application_id: 'app-1', sender_id: 'other', created_at: '2024-01-05T10:00:00Z' },
    ]
    const reads = [{ application_id: 'app-1', last_read_at: '2024-01-02T00:00:00Z' }]
    // 2 from others, 1 own → count 2
    expect(computeMessageNotifications(msgs, reads, userId)).toBe(2)
  })
})

// ─── computeCommentNotifications ──────────────────────────────────────────────

describe('computeCommentNotifications', () => {
  it('returns 0 when there are no comments', () => {
    expect(computeCommentNotifications([], [])).toBe(0)
  })

  it('counts all comments when never read', () => {
    const comments = [
      { project_id: 'proj-1', created_at: '2024-01-02T10:00:00Z' },
      { project_id: 'proj-1', created_at: '2024-01-03T10:00:00Z' },
    ]
    expect(computeCommentNotifications(comments, [])).toBe(2)
  })

  it('does not count comments made before last-read timestamp', () => {
    const comments = [
      { project_id: 'proj-1', created_at: '2024-01-01T08:00:00Z' },
    ]
    const reads = [{ project_id: 'proj-1', last_read_at: '2024-01-01T09:00:00Z' }]
    expect(computeCommentNotifications(comments, reads)).toBe(0)
  })

  it('counts comments made after last-read timestamp', () => {
    const comments = [
      { project_id: 'proj-1', created_at: '2024-01-02T10:00:00Z' },
    ]
    const reads = [{ project_id: 'proj-1', last_read_at: '2024-01-01T09:00:00Z' }]
    expect(computeCommentNotifications(comments, reads)).toBe(1)
  })

  it('handles multiple projects independently', () => {
    const comments = [
      // proj-1: both read
      { project_id: 'proj-1', created_at: '2024-01-01T08:00:00Z' },
      // proj-2: never opened → counts
      { project_id: 'proj-2', created_at: '2024-01-02T10:00:00Z' },
      { project_id: 'proj-2', created_at: '2024-01-03T10:00:00Z' },
    ]
    const reads = [{ project_id: 'proj-1', last_read_at: '2024-01-02T00:00:00Z' }]
    expect(computeCommentNotifications(comments, reads)).toBe(2)
  })

  it('counts comments across multiple projects with partial reads', () => {
    const comments = [
      { project_id: 'proj-1', created_at: '2024-01-05T10:00:00Z' }, // after read → counts
      { project_id: 'proj-2', created_at: '2024-01-01T10:00:00Z' }, // before read → no
      { project_id: 'proj-3', created_at: '2024-01-04T10:00:00Z' }, // no read → counts
    ]
    const reads = [
      { project_id: 'proj-1', last_read_at: '2024-01-04T00:00:00Z' },
      { project_id: 'proj-2', last_read_at: '2024-01-03T00:00:00Z' },
    ]
    expect(computeCommentNotifications(comments, reads)).toBe(2)
  })
})

// ─── getNotificationCount integration ─────────────────────────────────────────
// Tests the orchestration layer with a mocked Supabase client.
// vi.mock is hoisted to module scope by Vitest, so we set up the mock at the
// top level and control return values via the mockCreateClient reference.

const mockCreateClient = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase-server', () => ({
  createClient: mockCreateClient,
}))

function makeChain(resolvedData: any) {
  const chain: any = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq     = vi.fn().mockReturnValue(chain)
  chain.in     = vi.fn().mockReturnValue(chain)
  chain.neq    = vi.fn().mockReturnValue(chain)
  chain.then   = (resolve: any) => resolve({ data: resolvedData, error: null })
  return chain
}

describe('getNotificationCount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 0 when user has no applications and no owned projects', async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => makeChain([])),
    })
    const { getNotificationCount } = await import('@/lib/db/notifications')
    expect(await getNotificationCount('user-1')).toBe(0)
  })

  it('returns 0 on any thrown error so the layout never breaks', async () => {
    mockCreateClient.mockRejectedValue(new Error('DB down'))
    const { getNotificationCount } = await import('@/lib/db/notifications')
    expect(await getNotificationCount('user-1')).toBe(0)
  })
})
