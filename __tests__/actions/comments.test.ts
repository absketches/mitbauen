import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsert = vi.fn()
const mockGetUser = vi.fn()
const mockRevalidatePath = vi.fn()

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({ insert: mockInsert })),
  })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

const { addComment } = await import('@/app/actions/comments')

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
