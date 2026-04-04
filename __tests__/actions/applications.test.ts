// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockRevalidatePath = vi.fn()

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

// Mock the db layer that the actions delegate to
const mockGetApplicationsByUserForRoles = vi.fn()
const mockCreateApplication = vi.fn()
const mockGetProjectOwnerId = vi.fn()
const mockUpdateApplicationStatus = vi.fn()

vi.mock('@/lib/db/applications', () => ({
  getApplicationsByUserForRoles: mockGetApplicationsByUserForRoles,
  createApplication: mockCreateApplication,
  updateApplicationStatus: mockUpdateApplicationStatus,
}))
vi.mock('@/lib/db/projects', () => ({
  getProjectOwnerId: mockGetProjectOwnerId,
}))

const { applyToRole, respondToApplication } = await import('@/app/actions/applications')

describe('applyToRole action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error if message is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const fd = new FormData()
    fd.set('message', '')
    fd.set('what_i_bring', 'I bring skills')
    const result = await applyToRole('proj-1', 'role-1', fd)
    expect((result as any)?.error).toBeTruthy()
  })

  it('returns error if what_i_bring is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', '  ')
    const result = await applyToRole('proj-1', 'role-1', fd)
    expect((result as any)?.error).toBeTruthy()
  })

  it('returns error if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', 'I bring skills')
    const result = await applyToRole('proj-1', 'role-1', fd)
    expect((result as any)?.error).toBe('Not authenticated.')
  })

  it('returns error if user already applied', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetApplicationsByUserForRoles.mockResolvedValue([{ id: 'existing-app', role_id: 'role-1' }])
    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', 'I bring skills')
    const result = await applyToRole('proj-1', 'role-1', fd)
    expect((result as any)?.error).toContain('already applied')
  })

  it('inserts application and returns success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetApplicationsByUserForRoles.mockResolvedValue([])
    mockCreateApplication.mockResolvedValue({ success: true })
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
  })

  it('returns error if not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await respondToApplication('proj-1', 'app-1', 'accepted')
    expect((result as any)?.error).toBe('Not authenticated.')
  })

  it('returns error if user is not the project owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetProjectOwnerId.mockResolvedValue('other-user')
    const result = await respondToApplication('proj-1', 'app-1', 'accepted')
    expect((result as any)?.error).toBe('Not authorised.')
  })

  it('updates status to accepted for project owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } })
    mockGetProjectOwnerId.mockResolvedValue('owner-1')
    mockUpdateApplicationStatus.mockResolvedValue({ success: true })
    const result = await respondToApplication('proj-1', 'app-1', 'accepted')
    expect(result?.success).toBe(true)
    expect(mockUpdateApplicationStatus).toHaveBeenCalledWith('app-1', 'accepted')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects/proj-1')
  })

  it('updates status to rejected for project owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } })
    mockGetProjectOwnerId.mockResolvedValue('owner-1')
    mockUpdateApplicationStatus.mockResolvedValue({ success: true })
    const result = await respondToApplication('proj-1', 'app-1', 'rejected')
    expect(result?.success).toBe(true)
    expect(mockUpdateApplicationStatus).toHaveBeenCalledWith('app-1', 'rejected')
  })
})
