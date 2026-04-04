import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { NotificationItem } from '@/lib/db/notifications'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockMarkThreadRead  = vi.hoisted(() => vi.fn())
const mockMarkComments    = vi.hoisted(() => vi.fn())
const mockRouterPush      = vi.hoisted(() => vi.fn())
const mockRouterRefresh   = vi.hoisted(() => vi.fn())

vi.mock('@/app/actions/messages',  () => ({ markThreadRead:  mockMarkThreadRead }))
vi.mock('@/app/actions/comments',  () => ({ markCommentsRead: mockMarkComments }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, refresh: mockRouterRefresh }),
}))
// formatLocalTime and notificationLabel are real (pure) — no mock needed

const { default: NotificationBell } = await import('@/components/NotificationBell')

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeThread(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: 'thread-app-1',
    type: 'thread',
    projectId: 'proj-1',
    projectTitle: 'Cool Project',
    roleTitle: 'Frontend Dev',
    actorName: 'Alice',
    actorAvatar: null,
    latestBody: 'Hey, any updates?',
    latestAt: new Date().toISOString(),
    unreadCount: 1,
    link: '/projects/proj-1#thread-app-1',
    applicationId: 'app-1',
    ...overrides,
  }
}

function makeComment(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: 'comment-proj-2',
    type: 'comment',
    projectId: 'proj-2',
    projectTitle: 'Another Project',
    roleTitle: null,
    actorName: 'Bob',
    actorAvatar: null,
    latestBody: 'Looks great!',
    latestAt: new Date().toISOString(),
    unreadCount: 3,
    link: '/projects/proj-2',
    applicationId: null,
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NotificationBell', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders bell button with no badge when there are no notifications', () => {
    render(<NotificationBell notifications={[]} />)
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    expect(screen.queryByText(/\d/)).not.toBeInTheDocument()
  })

  it('shows badge with count when notifications exist', () => {
    render(<NotificationBell notifications={[makeThread(), makeComment()]} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('caps badge at 9+ when count exceeds 9', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      makeThread({ id: `thread-${i}`, applicationId: `app-${i}` })
    )
    render(<NotificationBell notifications={many} />)
    expect(screen.getByText('9+')).toBeInTheDocument()
  })

  it('opens dropdown on bell click', async () => {
    render(<NotificationBell notifications={[makeThread()]} />)
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }))
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('shows "All caught up" when dropdown opens with no notifications', async () => {
    render(<NotificationBell notifications={[]} />)
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }))
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
  })

  it('renders one item per notification with label and preview', async () => {
    render(<NotificationBell notifications={[makeThread()]} />)
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }))
    // Label from notificationLabel()
    expect(screen.getByText(/Alice messaged you in Cool Project/)).toBeInTheDocument()
    // Body preview
    expect(screen.getByText('Hey, any updates?')).toBeInTheDocument()
  })

  it('shows unread count badge only when unreadCount > 1', async () => {
    render(<NotificationBell notifications={[
      makeThread({ unreadCount: 1 }),
      makeComment({ unreadCount: 3 }),
    ]} />)
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }))
    // "3 unread" shown for the comment, nothing for the thread (count = 1)
    expect(screen.getByText('3 unread')).toBeInTheDocument()
    expect(screen.queryByText('1 unread')).not.toBeInTheDocument()
  })

  it('closes dropdown when clicking outside', async () => {
    render(
      <div>
        <NotificationBell notifications={[makeThread()]} />
        <button>Outside</button>
      </div>
    )
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }))
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('button', { name: /outside/i }))
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
  })

  it('calls markThreadRead + router.push + router.refresh on thread click', async () => {
    mockMarkThreadRead.mockResolvedValue(undefined)
    render(<NotificationBell notifications={[makeThread()]} />)
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }))
    await userEvent.click(screen.getByText(/Alice messaged you/))
    await waitFor(() => expect(mockMarkThreadRead).toHaveBeenCalledWith('app-1'))
    expect(mockRouterPush).toHaveBeenCalledWith('/projects/proj-1#thread-app-1')
    expect(mockRouterRefresh).toHaveBeenCalled()
  })

  it('calls markCommentsRead + router.push + router.refresh on comment click', async () => {
    mockMarkComments.mockResolvedValue(undefined)
    render(<NotificationBell notifications={[makeComment()]} />)
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }))
    await userEvent.click(screen.getByText(/Bob commented on/))
    await waitFor(() => expect(mockMarkComments).toHaveBeenCalledWith('proj-2'))
    expect(mockRouterPush).toHaveBeenCalledWith('/projects/proj-2')
    expect(mockRouterRefresh).toHaveBeenCalled()
  })

  it('closes dropdown after clicking a notification', async () => {
    mockMarkThreadRead.mockResolvedValue(undefined)
    render(<NotificationBell notifications={[makeThread()]} />)
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }))
    await userEvent.click(screen.getByText(/Alice messaged you/))
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
  })
})
