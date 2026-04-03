import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockRevalidatePath = vi.fn()

// Chainable query builder
function makeQueryBuilder(result: any) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    insert: mockInsert,
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue(result) })),
  }
  return builder
}

let fromMock: ReturnType<typeof vi.fn>

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: fromMock,
  })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

const { applyToRole, respondToApplication } = await import('@/app/actions/applications')

describe('applyToRole action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    fromMock = vi.fn()
  })

  it('returns error if message is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromMock.mockReturnValue(makeQueryBuilder({ data: null }))
    const fd = new FormData()
    fd.set('message', '')
    fd.set('what_i_bring', 'I bring skills')
    const result = await applyToRole('proj-1', 'role-1', fd)
    expect(result?.error).toBeTruthy()
  })

  it('returns error if what_i_bring is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromMock.mockReturnValue(makeQueryBuilder({ data: null }))
    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', '  ')
    const result = await applyToRole('proj-1', 'role-1', fd)
    expect(result?.error).toBeTruthy()
  })

  it('returns error if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', 'I bring skills')
    const result = await applyToRole('proj-1', 'role-1', fd)
    expect(result?.error).toBe('Not authenticated.')
  })

  it('returns error if user already applied', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    // single() returns an existing application
    fromMock.mockReturnValue(makeQueryBuilder({ data: { id: 'existing-app' } }))
    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', 'I bring skills')
    const result = await applyToRole('proj-1', 'role-1', fd)
    expect(result?.error).toContain('already applied')
  })

  it('inserts application and returns success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    // First call (duplicate check) returns null, second is the insert
    fromMock
      .mockReturnValueOnce(makeQueryBuilder({ data: null }))   // no existing app
      .mockReturnValueOnce({ insert: mockInsert })              // insert call
    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', 'I bring skills')
    const result = await applyToRole('proj-1', 'role-1', fd)
    expect(result?.success).toBe(true)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects/proj-1')
  })
})

describe('respondToApplication action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fromMock = vi.fn()
  })

  it('returns error if not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await respondToApplication('proj-1', 'app-1', 'accepted')
    expect(result?.error).toBe('Not authenticated.')
  })

  it('returns error if user is not the project owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromMock.mockReturnValue(
      makeQueryBuilder({
        data: {
          id: 'app-1',
          roles: { projects: { owner_id: 'other-user' } },
        },
      })
    )
    const result = await respondToApplication('proj-1', 'app-1', 'accepted')
    expect(result?.error).toBe('Not authorised.')
  })

  it('updates status to accepted for project owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } })
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdateFn = vi.fn(() => ({ eq: mockUpdateEq }))

    fromMock
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: {
            id: 'app-1',
            roles: { projects: { owner_id: 'owner-1' } },
          },
        })
      )
      .mockReturnValueOnce({ update: mockUpdateFn })

    const result = await respondToApplication('proj-1', 'app-1', 'accepted')
    expect(result?.success).toBe(true)
    expect(mockUpdateFn).toHaveBeenCalledWith({ status: 'accepted' })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects/proj-1')
  })

  it('updates status to rejected for project owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } })
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdateFn = vi.fn(() => ({ eq: mockUpdateEq }))

    fromMock
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: {
            id: 'app-1',
            roles: { projects: { owner_id: 'owner-1' } },
          },
        })
      )
      .mockReturnValueOnce({ update: mockUpdateFn })

    const result = await respondToApplication('proj-1', 'app-1', 'rejected')
    expect(result?.success).toBe(true)
    expect(mockUpdateFn).toHaveBeenCalledWith({ status: 'rejected' })
  })
})
