// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

type ActionResult = { success?: boolean; error?: string }

const mockGetUser = vi.fn()
const mockRevalidatePath = vi.fn()

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

// Mock the db layer that the actions delegate to
const mockGetApplicationsByUserForRoles = vi.fn()
const mockCreateApplication = vi.fn()
const mockGetRoleApplicationContext = vi.fn()
const mockGetApplicationOwnershipContext = vi.fn()
const mockUpdateApplicationStatus = vi.fn()

vi.mock('@/lib/db/applications', () => ({
  getApplicationsByUserForRoles: mockGetApplicationsByUserForRoles,
  createApplication: mockCreateApplication,
  getApplicationOwnershipContext: mockGetApplicationOwnershipContext,
  getRoleApplicationContext: mockGetRoleApplicationContext,
  updateApplicationStatus: mockUpdateApplicationStatus,
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
    expect((result as ActionResult)?.error).toBeTruthy()
  })

  it('returns error if what_i_bring is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', '  ')
    const result = await applyToRole('proj-1', 'role-1', fd)
    expect((result as ActionResult)?.error).toBeTruthy()
  })

  it('returns error if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', 'I bring skills')
    const result = await applyToRole('proj-1', 'role-1', fd)
    expect((result as ActionResult)?.error).toBe('Not authenticated.')
  })

  it('returns error if user already applied', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetRoleApplicationContext.mockResolvedValue({
      roleId: 'role-1',
      projectId: 'proj-1',
      ownerId: 'owner-1',
      status: 'open',
    })
    mockGetApplicationsByUserForRoles.mockResolvedValue([{ id: 'existing-app', role_id: 'role-1' }])
    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', 'I bring skills')
    const result = await applyToRole('proj-1', 'role-1', fd)
    expect((result as ActionResult)?.error).toContain('already applied')
  })

  it('returns error if role does not belong to the project', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetRoleApplicationContext.mockResolvedValue({
      roleId: 'role-1',
      projectId: 'other-project',
      ownerId: 'owner-1',
      status: 'open',
    })
    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', 'I bring skills')
    const result = await applyToRole('proj-1', 'role-1', fd)
    expect((result as ActionResult)?.error).toBe('Role not found for this project.')
  })

  it('returns error if user tries to apply to their own project', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } })
    mockGetRoleApplicationContext.mockResolvedValue({
      roleId: 'role-1',
      projectId: 'proj-1',
      ownerId: 'owner-1',
      status: 'open',
    })
    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', 'I bring skills')
    const result = await applyToRole('proj-1', 'role-1', fd)
    expect((result as ActionResult)?.error).toBe('You cannot apply to your own project.')
  })

  it('returns error if role is closed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetRoleApplicationContext.mockResolvedValue({
      roleId: 'role-1',
      projectId: 'proj-1',
      ownerId: 'owner-1',
      status: 'closed',
    })
    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', 'I bring skills')
    const result = await applyToRole('proj-1', 'role-1', fd)
    expect((result as ActionResult)?.error).toBe('This role is no longer open.')
  })

  it('inserts application and returns success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetRoleApplicationContext.mockResolvedValue({
      roleId: 'role-1',
      projectId: 'proj-1',
      ownerId: 'owner-1',
      status: 'open',
    })
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
    expect((result as ActionResult)?.error).toBe('Not authenticated.')
  })

  it('returns error if user is not the project owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetApplicationOwnershipContext.mockResolvedValue({
      applicationId: 'app-1',
      projectId: 'proj-1',
      ownerId: 'other-user',
    })
    const result = await respondToApplication('proj-1', 'app-1', 'accepted')
    expect((result as ActionResult)?.error).toBe('Not authorised.')
  })

  it('returns error if application does not belong to the project', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } })
    mockGetApplicationOwnershipContext.mockResolvedValue({
      applicationId: 'app-1',
      projectId: 'other-project',
      ownerId: 'owner-1',
    })
    const result = await respondToApplication('proj-1', 'app-1', 'accepted')
    expect((result as ActionResult)?.error).toBe('Application not found for this project.')
  })

  it('updates status to accepted for project owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } })
    mockGetApplicationOwnershipContext.mockResolvedValue({
      applicationId: 'app-1',
      projectId: 'proj-1',
      ownerId: 'owner-1',
    })
    mockUpdateApplicationStatus.mockResolvedValue({ success: true })
    const result = await respondToApplication('proj-1', 'app-1', 'accepted')
    expect(result?.success).toBe(true)
    expect(mockUpdateApplicationStatus).toHaveBeenCalledWith('app-1', 'accepted')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects/proj-1')
  })

  it('updates status to rejected for project owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } })
    mockGetApplicationOwnershipContext.mockResolvedValue({
      applicationId: 'app-1',
      projectId: 'proj-1',
      ownerId: 'owner-1',
    })
    mockUpdateApplicationStatus.mockResolvedValue({ success: true })
    const result = await respondToApplication('proj-1', 'app-1', 'rejected')
    expect(result?.success).toBe(true)
    expect(mockUpdateApplicationStatus).toHaveBeenCalledWith('app-1', 'rejected')
  })
})
