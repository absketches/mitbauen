// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.hoisted(() => vi.fn())
const mockFrom = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

const { toggleVote } = await import('@/app/actions/votes')

function makeChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'insert', 'delete', 'eq', 'single']
  methods.forEach(m => { chain[m] = vi.fn(() => chain) })
  chain['single'] = vi.fn(() => Promise.resolve({ data, error }))
  chain['delete'] = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))
  chain['insert'] = vi.fn(() => Promise.resolve({ error: null }))
  return chain
}

describe('toggleVote', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await toggleVote('project-1')
    expect(result).toEqual({ error: 'Not authenticated.' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('deletes existing vote when user has already voted', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const deleteEq = vi.fn(() => Promise.resolve({ error: null }))
    const deleteChain = { eq: deleteEq }
    const selectSingle = vi.fn(() => Promise.resolve({ data: { id: 'vote-1' }, error: null }))
    const selectChain = { eq: vi.fn(() => ({ eq: vi.fn(() => ({ single: selectSingle })) })) }
    const deleteFromChain = { delete: vi.fn(() => deleteChain) }

    mockFrom
      .mockReturnValueOnce({ select: vi.fn(() => selectChain) })
      .mockReturnValueOnce(deleteFromChain)

    const result = await toggleVote('project-1')
    expect(deleteFromChain.delete).toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects/project-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects')
    expect(result).toEqual({ success: true })
  })

  it('inserts a new vote when user has not voted', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const selectSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
    const selectChain = { eq: vi.fn(() => ({ eq: vi.fn(() => ({ single: selectSingle })) })) }
    const insertChain = { insert: vi.fn(() => Promise.resolve({ error: null })) }

    mockFrom
      .mockReturnValueOnce({ select: vi.fn(() => selectChain) })
      .mockReturnValueOnce(insertChain)

    const result = await toggleVote('project-1')
    expect(insertChain.insert).toHaveBeenCalledWith({ project_id: 'project-1', user_id: 'user-1' })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects/project-1')
    expect(result).toEqual({ success: true })
  })
})
