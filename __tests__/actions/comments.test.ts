// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsert              = vi.hoisted(() => vi.fn())
const mockGetUser             = vi.hoisted(() => vi.fn())
const mockRevalidatePath      = vi.hoisted(() => vi.fn())
const mockMarkProjectComments = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({ insert: mockInsert })),
  })),
}))
vi.mock('next/cache',            () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@/lib/db/notifications', () => ({ markProjectCommentsRead: mockMarkProjectComments }))

const { addComment, markCommentsRead } = await import('@/app/actions/comments')

describe('addComment action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
  })

  it('does nothing if body is empty', async () => {
    const formData = new FormData()
    formData.set('body', '   ')
    await addComment('project-1', formData)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('does nothing if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const formData = new FormData()
    formData.set('body', 'Great idea!')
    await addComment('project-1', formData)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('inserts the comment for authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const formData = new FormData()
    formData.set('body', 'Great idea!')
    await addComment('project-1', formData)
    expect(mockInsert).toHaveBeenCalledWith({
      project_id: 'project-1',
      user_id: 'user-1',
      body: 'Great idea!',
    })
  })

  it('revalidates the project path after insert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const formData = new FormData()
    formData.set('body', 'Nice project')
    await addComment('project-1', formData)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects/project-1')
  })

  it('trims whitespace from body before inserting', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const formData = new FormData()
    formData.set('body', '  trimmed  ')
    await addComment('project-1', formData)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'trimmed' })
    )
  })
})

// ─── markCommentsRead ─────────────────────────────────────────────────────────

describe('markCommentsRead action', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does nothing when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    await markCommentsRead('project-1')
    expect(mockMarkProjectComments).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('marks comments read and revalidates layout when authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockMarkProjectComments.mockResolvedValue(undefined)
    await markCommentsRead('project-1')
    expect(mockMarkProjectComments).toHaveBeenCalledWith('project-1', 'user-1')
    // Must bust layout cache so navbar badge re-renders
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
  })
})
