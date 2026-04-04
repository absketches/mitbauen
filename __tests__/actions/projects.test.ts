// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.hoisted(() => vi.fn())
const mockRpc = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  })),
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

const { createProject } = await import('@/app/actions/projects')

describe('createProject action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns validation error for invalid title', async () => {
    const result = await createProject({
      title: 'bad',
      description: 'A'.repeat(40),
      why_it_matters: '',
      commitment_hours_pw: 10,
      commitment_role: 'Builder',
      commitment_description: '',
      roles: [],
    })

    expect(result).toEqual({ error: 'Title must be between 5 and 120 characters.' })
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns auth error when user is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await createProject({
      title: 'Valid title',
      description: 'A'.repeat(40),
      why_it_matters: '',
      commitment_hours_pw: 10,
      commitment_role: 'Builder',
      commitment_description: '',
      roles: [],
    })

    expect(result).toEqual({ error: 'Not authenticated.' })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('calls rpc with trimmed values and returns project id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRpc.mockResolvedValue({ data: 'project-1', error: null })

    const result = await createProject({
      title: '  Valid title  ',
      description: 'A'.repeat(40),
      why_it_matters: '  Important mission  ',
      commitment_hours_pw: 10,
      commitment_role: '  Builder  ',
      commitment_description: '  Shipping work  ',
      roles: [
        { title: '  Frontend  ', description: '  Build UI  ', skills_needed: [' React ', ' TypeScript '] },
        { title: '   ', description: '', skills_needed: [] },
      ],
    })

    expect(mockRpc).toHaveBeenCalledWith('create_project_with_roles', {
      p_title: 'Valid title',
      p_description: 'A'.repeat(40),
      p_why_it_matters: 'Important mission',
      p_commitment_hours_pw: 10,
      p_commitment_role: 'Builder',
      p_commitment_description: 'Shipping work',
      p_roles: [
        {
          title: 'Frontend',
          description: 'Build UI',
          skills_needed: ['React', 'TypeScript'],
        },
      ],
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects')
    expect(result).toEqual({ success: true, projectId: 'project-1' })
  })
})
