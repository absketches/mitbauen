// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

type ActionResult = { success?: boolean; error?: string }

const mockGetUser        = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())
const mockDbSendMessage  = vi.hoisted(() => vi.fn())
const mockUpsertRead     = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}))
vi.mock('next/cache',         () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@/lib/db/messages',  () => ({
  sendMessage:       mockDbSendMessage,
  upsertReadReceipt: mockUpsertRead,
}))

const { sendMessage, markThreadRead } = await import('@/app/actions/messages')

// ─── sendMessage ──────────────────────────────────────────────────────────────

describe('sendMessage action', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error when body is empty', async () => {
    const fd = new FormData()
    fd.set('body', '   ')
    const result = await sendMessage('app-1', 'proj-1', fd)
    expect((result as ActionResult).error).toBe('Message cannot be empty.')
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const fd = new FormData()
    fd.set('body', 'Hello!')
    const result = await sendMessage('app-1', 'proj-1', fd)
    expect((result as ActionResult).error).toBe('Not authenticated.')
    expect(mockDbSendMessage).not.toHaveBeenCalled()
  })

  it('returns error when db insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockDbSendMessage.mockResolvedValue({ error: 'DB error' })
    const fd = new FormData()
    fd.set('body', 'Hello!')
    const result = await sendMessage('app-1', 'proj-1', fd)
    expect((result as ActionResult).error).toBe('DB error')
    expect(mockUpsertRead).not.toHaveBeenCalled()
  })

  it('sends message, upserts read receipt, and revalidates on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockDbSendMessage.mockResolvedValue({ success: true })
    mockUpsertRead.mockResolvedValue(undefined)
    const fd = new FormData()
    fd.set('body', '  Hello!  ')
    const result = await sendMessage('app-1', 'proj-1', fd)

    // Trims whitespace before insert
    expect(mockDbSendMessage).toHaveBeenCalledWith('app-1', 'user-1', 'Hello!')
    // Marks own message as read immediately (sender's receipt)
    expect(mockUpsertRead).toHaveBeenCalledWith('app-1', 'user-1')
    // Revalidates both project page and messages inbox
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects/proj-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/messages')
    expect((result as ActionResult).success).toBe(true)
  })
})

// ─── markThreadRead ───────────────────────────────────────────────────────────

describe('markThreadRead action', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does nothing when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    await markThreadRead('app-1')
    expect(mockUpsertRead).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('upserts read receipt and revalidates layout when authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockUpsertRead.mockResolvedValue(undefined)
    await markThreadRead('app-1')
    expect(mockUpsertRead).toHaveBeenCalledWith('app-1', 'user-1')
    // Must bust the layout cache so the navbar badge re-renders
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
  })
})
