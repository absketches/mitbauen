// @vitest-environment node
/**
 * Notification tests.
 *
 * Split into two groups:
 *
 * 1. Pure helpers (computeMessageNotifications, computeCommentNotifications)
 *    — zero I/O, exhaustive edge-case coverage.
 *
 * 2. getNotifications — integration-style tests that mock both the Supabase
 *    client and getApplicationsById, then assert on the returned NotificationItem[].
 *    Each scenario controls exactly which data each Supabase table returns so
 *    we can test one notification type at a time.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  computeMessageNotifications,
  computeCommentNotifications,
} from '@/lib/db/notifications'

// ─── Shared mocks (hoisted so they're available inside vi.mock factories) ──────

const mockCreateClient      = vi.hoisted(() => vi.fn())
const mockGetApplicationsById = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase-server', () => ({ createClient: mockCreateClient }))
vi.mock('@/lib/db/applications',  () => ({ getApplicationsById: mockGetApplicationsById }))

// ─── Supabase chain builder ────────────────────────────────────────────────────

/**
 * Builds a chainable Supabase query mock that resolves with `data`.
 * Every method returns `this` so arbitrary chaining works.
 */
type MockRow = Record<string, unknown>
type QueryResult<T extends MockRow> = { data: T[]; error: null }
type MockChain<T extends MockRow> = {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  neq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  then: (resolve: (value: QueryResult<T>) => void) => void
}

function makeChain<T extends MockRow>(data: T[]): MockChain<T> {
  const chain = {} as MockChain<T>
  const self = () => chain
  chain.select = vi.fn(self)
  chain.eq     = vi.fn(self)
  chain.in     = vi.fn(self)
  chain.neq    = vi.fn(self)
  chain.order  = vi.fn(self)
  chain.then   = (resolve: (value: QueryResult<T>) => void) => resolve({ data, error: null })
  return chain
}

/**
 * Sets up mockCreateClient with a Supabase client whose `from()` returns data
 * based on call order per table. Pass a map of tableName → [response0, response1, ...].
 *
 * The last entry is repeated when the call count exceeds the array length,
 * so tables called only once just need a single-element array.
 */
function setupClient(tableSequences: Record<string, MockRow[][]>) {
  const callCounts: Record<string, number> = {}
  mockCreateClient.mockResolvedValue({
    from: vi.fn().mockImplementation((table: string) => {
      const seq = tableSequences[table] ?? [[]]
      const idx = callCounts[table] ?? 0
      callCounts[table] = idx + 1
      const data = seq[Math.min(idx, seq.length - 1)]
      return makeChain(data)
    }),
  })
}

// ─── Shared fixtures ───────────────────────────────────────────────────────────

const USER     = 'user-1'
const OTHER    = 'other-user'
const APP_ID   = 'app-1'
const PROJ_ID  = 'proj-1'
const ROLE_ID  = 'role-1'

/** A minimal ApplicationInboxRow returned by the mocked getApplicationsById */
const baseAppRow = {
  id: APP_ID,
  applicant_id: USER,
  role_id: ROLE_ID,
  role_title: 'Frontend Dev',
  project_id: PROJ_ID,
  project_title: 'My Project',
  project_owner_id: OTHER,
  applicant_name: 'Me',
  applicant_avatar: null,
  owner_name: 'Owner',
  owner_avatar: null,
}

// ─── 1. computeMessageNotifications ───────────────────────────────────────────

describe('computeMessageNotifications', () => {
  it('returns 0 with no messages', () => {
    expect(computeMessageNotifications([], [], USER)).toBe(0)
  })

  it('counts unread messages from others when never read', () => {
    const msgs = [
      { application_id: APP_ID, sender_id: OTHER, created_at: '2024-01-02T10:00:00Z' },
      { application_id: APP_ID, sender_id: OTHER, created_at: '2024-01-03T10:00:00Z' },
    ]
    expect(computeMessageNotifications(msgs, [], USER)).toBe(2)
  })

  it('never counts own messages', () => {
    const msgs = [
      { application_id: APP_ID, sender_id: USER, created_at: '2024-01-02T10:00:00Z' },
    ]
    expect(computeMessageNotifications(msgs, [], USER)).toBe(0)
  })

  it('does not count messages before or at the last-read timestamp', () => {
    const msgs = [
      { application_id: APP_ID, sender_id: OTHER, created_at: '2024-01-01T08:00:00Z' },
      { application_id: APP_ID, sender_id: OTHER, created_at: '2024-01-01T09:00:00Z' }, // exactly at
    ]
    const reads = [{ application_id: APP_ID, last_read_at: '2024-01-01T09:00:00Z' }]
    expect(computeMessageNotifications(msgs, reads, USER)).toBe(0)
  })

  it('counts messages strictly after the last-read timestamp', () => {
    const msgs = [
      { application_id: APP_ID, sender_id: OTHER, created_at: '2024-01-02T10:00:00Z' },
    ]
    const reads = [{ application_id: APP_ID, last_read_at: '2024-01-01T09:00:00Z' }]
    expect(computeMessageNotifications(msgs, reads, USER)).toBe(1)
  })

  it('handles multiple threads with different read states', () => {
    const msgs = [
      { application_id: 'app-1', sender_id: OTHER, created_at: '2024-01-01T08:00:00Z' }, // read
      { application_id: 'app-1', sender_id: OTHER, created_at: '2024-01-03T10:00:00Z' }, // unread
      { application_id: 'app-2', sender_id: OTHER, created_at: '2024-01-02T10:00:00Z' }, // no read entry → unread
      { application_id: 'app-3', sender_id: USER,  created_at: '2024-01-04T10:00:00Z' }, // own → excluded
    ]
    const reads = [{ application_id: 'app-1', last_read_at: '2024-01-02T00:00:00Z' }]
    expect(computeMessageNotifications(msgs, reads, USER)).toBe(2)
  })

  it('handles a mix of own and others\' messages in the same thread', () => {
    const msgs = [
      { application_id: APP_ID, sender_id: OTHER, created_at: '2024-01-03T10:00:00Z' },
      { application_id: APP_ID, sender_id: USER,  created_at: '2024-01-04T10:00:00Z' }, // own
      { application_id: APP_ID, sender_id: OTHER, created_at: '2024-01-05T10:00:00Z' },
    ]
    const reads = [{ application_id: APP_ID, last_read_at: '2024-01-02T00:00:00Z' }]
    expect(computeMessageNotifications(msgs, reads, USER)).toBe(2)
  })
})

// ─── 2. computeCommentNotifications ───────────────────────────────────────────

describe('computeCommentNotifications', () => {
  it('returns 0 with no comments', () => {
    expect(computeCommentNotifications([], [])).toBe(0)
  })

  it('counts all comments when never read', () => {
    const comments = [
      { project_id: PROJ_ID, created_at: '2024-01-02T10:00:00Z' },
      { project_id: PROJ_ID, created_at: '2024-01-03T10:00:00Z' },
    ]
    expect(computeCommentNotifications(comments, [])).toBe(2)
  })

  it('does not count comments at or before last-read timestamp', () => {
    const comments = [{ project_id: PROJ_ID, created_at: '2024-01-01T09:00:00Z' }]
    const reads    = [{ project_id: PROJ_ID, last_read_at: '2024-01-01T09:00:00Z' }]
    expect(computeCommentNotifications(comments, reads)).toBe(0)
  })

  it('counts comments after last-read timestamp', () => {
    const comments = [{ project_id: PROJ_ID, created_at: '2024-01-02T10:00:00Z' }]
    const reads    = [{ project_id: PROJ_ID, last_read_at: '2024-01-01T09:00:00Z' }]
    expect(computeCommentNotifications(comments, reads)).toBe(1)
  })

  it('handles multiple projects with partial reads', () => {
    const comments = [
      { project_id: 'proj-1', created_at: '2024-01-05T10:00:00Z' }, // after read
      { project_id: 'proj-2', created_at: '2024-01-01T10:00:00Z' }, // before read
      { project_id: 'proj-3', created_at: '2024-01-04T10:00:00Z' }, // no read → counts
    ]
    const reads = [
      { project_id: 'proj-1', last_read_at: '2024-01-04T00:00:00Z' },
      { project_id: 'proj-2', last_read_at: '2024-01-03T00:00:00Z' },
    ]
    expect(computeCommentNotifications(comments, reads)).toBe(2)
  })
})

// ─── 3. getNotifications ──────────────────────────────────────────────────────

describe('getNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApplicationsById.mockResolvedValue([])
  })

  it('returns empty array when user has no activity', async () => {
    setupClient({
      applications: [[]],       // no applicant apps
      projects:     [[]],       // no owned projects
      comments:     [[]], // no own comments
    })

    const { getNotifications } = await import('@/lib/db/notifications')
    const result = await getNotifications(USER)
    expect(result).toEqual([])
  })

  it('returns 0 on thrown errors (getNotificationCount safety)', async () => {
    mockCreateClient.mockRejectedValue(new Error('DB down'))
    const { getNotificationCount } = await import('@/lib/db/notifications')
    expect(await getNotificationCount(USER)).toBe(0)
  })

  // ── Thread notifications ────────────────────────────────────────────────────

  it('creates one thread notification for an unread message from others', async () => {
    const message = {
      id: 'msg-1', application_id: APP_ID, body: 'Hello!',
      created_at: '2024-06-01T10:00:00Z', sender_id: OTHER,
      users: { name: 'Owner', avatar_url: null },
    }

    setupClient({
      applications:             [[{ id: APP_ID }], []],  // applicant apps, then owner apps (empty)
      projects:                 [[]],                    // no owned projects
      application_messages:     [[message]],
      application_message_reads: [[]],                   // never read
      comments:                 [[]],                    // user's own comments on watched projects
    })
    mockGetApplicationsById.mockResolvedValue([baseAppRow])

    const { getNotifications } = await import('@/lib/db/notifications')
    const result = await getNotifications(USER)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id:          `thread-${APP_ID}`,
      type:        'thread',
      projectId:   PROJ_ID,
      roleTitle:   'Frontend Dev',
      latestBody:  'Hello!',
      unreadCount: 1,
      link:        `/projects/${PROJ_ID}#thread-${APP_ID}`,
      applicationId: APP_ID,
    })
  })

  it('shows the LATEST unread message as the preview (not the first)', async () => {
    const older = {
      id: 'msg-1', application_id: APP_ID, body: 'First message',
      created_at: '2024-06-01T08:00:00Z', sender_id: OTHER,
      users: { name: 'Owner', avatar_url: null },
    }
    const newer = {
      id: 'msg-2', application_id: APP_ID, body: 'Latest message',
      created_at: '2024-06-01T12:00:00Z', sender_id: OTHER,
      users: { name: 'Owner', avatar_url: null },
    }

    setupClient({
      applications:             [[{ id: APP_ID }], []],
      projects:                 [[]],
      application_messages:     [[older, newer]],
      application_message_reads: [[]],
      comments:                 [[]],
    })
    mockGetApplicationsById.mockResolvedValue([baseAppRow])

    const { getNotifications } = await import('@/lib/db/notifications')
    const result = await getNotifications(USER)

    expect(result).toHaveLength(1)
    expect(result[0].latestBody).toBe('Latest message')
    expect(result[0].unreadCount).toBe(2)
  })

  it('collapses multiple unread messages in the same thread into ONE notification', async () => {
    const msgs = [
      { id: 'msg-1', application_id: APP_ID, body: 'A', created_at: '2024-06-01T08:00:00Z', sender_id: OTHER, users: null },
      { id: 'msg-2', application_id: APP_ID, body: 'B', created_at: '2024-06-01T09:00:00Z', sender_id: OTHER, users: null },
      { id: 'msg-3', application_id: APP_ID, body: 'C', created_at: '2024-06-01T10:00:00Z', sender_id: OTHER, users: null },
    ]

    setupClient({
      applications:             [[{ id: APP_ID }], []],
      projects:                 [[]],
      application_messages:     [msgs],
      application_message_reads: [[]],
      comments:                 [[]],
    })
    mockGetApplicationsById.mockResolvedValue([baseAppRow])

    const { getNotifications } = await import('@/lib/db/notifications')
    const result = await getNotifications(USER)

    expect(result).toHaveLength(1)
    expect(result[0].unreadCount).toBe(3)
    expect(result[0].latestBody).toBe('C')
  })

  it('does NOT create a thread notification for own messages', async () => {
    const ownMessage = {
      id: 'msg-1', application_id: APP_ID, body: 'My own message',
      created_at: '2024-06-01T10:00:00Z', sender_id: USER, // own message
      users: { name: 'Me', avatar_url: null },
    }

    setupClient({
      applications:             [[{ id: APP_ID }], []],
      projects:                 [[]],
      application_messages:     [[ownMessage]],
      application_message_reads: [[]],
      comments:                 [[]],
    })
    mockGetApplicationsById.mockResolvedValue([baseAppRow])

    const { getNotifications } = await import('@/lib/db/notifications')
    const result = await getNotifications(USER)

    expect(result).toHaveLength(0)
  })

  it('does NOT create a thread notification for messages already read', async () => {
    const readMessage = {
      id: 'msg-1', application_id: APP_ID, body: 'Old message',
      created_at: '2024-06-01T08:00:00Z', sender_id: OTHER,
      users: null,
    }
    const reads = [{ application_id: APP_ID, last_read_at: '2024-06-01T10:00:00Z' }]

    setupClient({
      applications:             [[{ id: APP_ID }], []],
      projects:                 [[]],
      application_messages:     [[readMessage]],
      application_message_reads: [reads],
      comments:                 [[]],
    })
    mockGetApplicationsById.mockResolvedValue([baseAppRow])

    const { getNotifications } = await import('@/lib/db/notifications')
    const result = await getNotifications(USER)

    expect(result).toHaveLength(0)
  })

  // ── Pending application notifications ─────────────────────────────────────

  it('creates a new_application notification for each pending application on owned roles', async () => {
    // User is the owner: ownedProjectIds has PROJ_ID, which has ROLE_ID, which has APP_ID
    const ownerAppRow = {
      ...baseAppRow,
      project_owner_id: USER, // user is owner
      applicant_id: OTHER,
    }
    const pendingApp = {
      id: APP_ID,
      created_at: '2024-06-01T09:00:00Z',
      message: 'I want to join!',
      status: 'pending',
    }

    setupClient({
      applications: [
        [],                    // applicant apps (none)
        [{ id: APP_ID }],     // owner apps (via role lookup)
        [pendingApp],          // pending status query
      ],
      projects:  [[{ id: PROJ_ID }]], // owned projects
      roles:     [[{ id: ROLE_ID }]], // roles for that project
      application_messages:     [[]],
      application_message_reads: [[]],
      comments:  [[]],
    })
    mockGetApplicationsById.mockResolvedValue([ownerAppRow])

    const { getNotifications } = await import('@/lib/db/notifications')
    const result = await getNotifications(USER)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type:        'new_application',
      projectId:   PROJ_ID,
      roleTitle:   'Frontend Dev',
      latestBody:  'I want to join!',
      unreadCount: 1,
      link:        `/projects/${PROJ_ID}`,
    })
  })

  it('does NOT create new_application notifications for accepted/rejected applications', async () => {
    setupClient({
      applications: [
        [],                // applicant apps
        [{ id: APP_ID }], // owner apps
        [],               // pending query → empty (application is accepted)
      ],
      projects:  [[{ id: PROJ_ID }]],
      roles:     [[{ id: ROLE_ID }]],
      application_messages:     [[]],
      application_message_reads: [[]],
      comments:  [[]],
    })
    mockGetApplicationsById.mockResolvedValue([{ ...baseAppRow, project_owner_id: USER }])

    const { getNotifications } = await import('@/lib/db/notifications')
    const result = await getNotifications(USER)

    expect(result.filter(i => i.type === 'new_application')).toHaveLength(0)
  })

  // ── Comment notifications ──────────────────────────────────────────────────

  it('creates ONE comment notification per project (not per comment)', async () => {
    const c1 = { id: 'c1', project_id: PROJ_ID, body: 'First', created_at: '2024-06-01T08:00:00Z', user_id: OTHER, users: { name: 'Alice', avatar_url: null } }
    const c2 = { id: 'c2', project_id: PROJ_ID, body: 'Second', created_at: '2024-06-01T12:00:00Z', user_id: OTHER, users: { name: 'Bob',   avatar_url: null } }

    setupClient({
      applications: [[], []],
      projects:     [[{ id: PROJ_ID }], [{ id: PROJ_ID, title: 'My Project' }]], // owned, then title lookup
      roles:        [[]],
      application_messages:     [[]],
      application_message_reads: [[]],
      comments:     [
        [],          // user's own comments (for "commented-on" scope)
        [c1, c2],   // others' comments on watched projects
      ],
      project_comment_reads: [[]],
    })
    mockGetApplicationsById.mockResolvedValue([])

    const { getNotifications } = await import('@/lib/db/notifications')
    const result = await getNotifications(USER)

    const commentNotifs = result.filter(i => i.type === 'comment')
    expect(commentNotifs).toHaveLength(1)
    expect(commentNotifs[0].unreadCount).toBe(2)
    expect(commentNotifs[0].latestBody).toBe('Second')   // latest shown as preview
  })

  it('does not create comment notification for comments already read', async () => {
    const comment = {
      id: 'c1', project_id: PROJ_ID, body: 'Old comment',
      created_at: '2024-06-01T08:00:00Z', user_id: OTHER,
      users: { name: 'Alice', avatar_url: null },
    }
    const reads = [{ project_id: PROJ_ID, last_read_at: '2024-06-01T10:00:00Z' }]

    setupClient({
      applications: [[], []],
      projects:     [[{ id: PROJ_ID }], [{ id: PROJ_ID, title: 'My Project' }]],
      roles:        [[]],
      application_messages:     [[]],
      application_message_reads: [[]],
      comments:     [[], [comment]],
      project_comment_reads: [reads],
    })
    mockGetApplicationsById.mockResolvedValue([])

    const { getNotifications } = await import('@/lib/db/notifications')
    const result = await getNotifications(USER)

    expect(result.filter(i => i.type === 'comment')).toHaveLength(0)
  })

  it('notifies on comments for projects the user applied to (not just owned)', async () => {
    // User applied to PROJ_ID but doesn't own it
    const applicantRow = {
      ...baseAppRow,
      applicant_id: USER,
      project_owner_id: OTHER,
    }
    const newComment = {
      id: 'c1', project_id: PROJ_ID, body: 'Looks great!',
      created_at: '2024-06-02T10:00:00Z', user_id: OTHER,
      users: { name: 'Owner', avatar_url: null },
    }

    setupClient({
      applications: [[{ id: APP_ID }], []],  // applicant apps only
      projects:     [[], [{ id: PROJ_ID, title: 'My Project' }]], // not owner; title lookup
      application_messages:     [[]],
      application_message_reads: [[]],
      comments:     [[], [newComment]],          // own comments = none; others' = one
      project_comment_reads: [[]],
    })
    mockGetApplicationsById.mockResolvedValue([applicantRow])

    const { getNotifications } = await import('@/lib/db/notifications')
    const result = await getNotifications(USER)

    const commentNotifs = result.filter(i => i.type === 'comment')
    expect(commentNotifs).toHaveLength(1)
    expect(commentNotifs[0].projectId).toBe(PROJ_ID)
  })

  it('notifies on comments for projects the user previously commented on', async () => {
    // User commented on PROJ_ID in the past
    const userPastComment = { project_id: PROJ_ID }  // from own-comments query
    const newComment = {
      id: 'c1', project_id: PROJ_ID, body: 'Reply to you',
      created_at: '2024-06-02T10:00:00Z', user_id: OTHER,
      users: { name: 'Alice', avatar_url: null },
    }

    setupClient({
      applications: [[], []],
      projects:     [[], [{ id: PROJ_ID, title: 'My Project' }]],
      application_messages:     [[]],
      application_message_reads: [[]],
      comments:     [[userPastComment], [newComment]], // own past comment, then others'
      project_comment_reads: [[]],
    })
    mockGetApplicationsById.mockResolvedValue([])

    const { getNotifications } = await import('@/lib/db/notifications')
    const result = await getNotifications(USER)

    const commentNotifs = result.filter(i => i.type === 'comment')
    expect(commentNotifs).toHaveLength(1)
  })

  // ── Ordering ───────────────────────────────────────────────────────────────

  it('returns notifications sorted by latestAt descending (most recent first)', async () => {
    const olderApp = {
      ...baseAppRow,
      id: 'app-older',
      role_title: 'Backend Dev',
    }
    const olderMsg = {
      id: 'msg-old', application_id: 'app-older', body: 'Old message',
      created_at: '2024-05-01T10:00:00Z', sender_id: OTHER, users: null,
    }
    const newerMsg = {
      id: 'msg-new', application_id: APP_ID, body: 'New message',
      created_at: '2024-06-15T10:00:00Z', sender_id: OTHER, users: null,
    }

    setupClient({
      applications: [[{ id: APP_ID }, { id: 'app-older' }], []],
      projects:     [[]],
      application_messages:     [[olderMsg, newerMsg]],
      application_message_reads: [[]],
      comments:     [[]],
    })
    mockGetApplicationsById.mockResolvedValue([baseAppRow, olderApp])

    const { getNotifications } = await import('@/lib/db/notifications')
    const result = await getNotifications(USER)

    expect(result).toHaveLength(2)
    // Most recent first
    expect(new Date(result[0].latestAt) > new Date(result[1].latestAt)).toBe(true)
    expect(result[0].latestBody).toBe('New message')
  })

  // ── getNotificationCount ───────────────────────────────────────────────────

  it('getNotificationCount equals notifications.length', async () => {
    setupClient({
      applications: [[{ id: APP_ID }], []],
      projects:     [[]],
      application_messages: [[
        { id: 'msg-1', application_id: APP_ID, body: 'Hi', created_at: '2024-06-01T10:00:00Z', sender_id: OTHER, users: null },
      ]],
      application_message_reads: [[]],
      comments: [[]],
    })
    mockGetApplicationsById.mockResolvedValue([baseAppRow])

    const { getNotificationCount } = await import('@/lib/db/notifications')
    expect(await getNotificationCount(USER)).toBe(1)
  })
})
