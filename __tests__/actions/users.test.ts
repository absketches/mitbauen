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

const { updateProfile } = await import('@/app/actions/users')

function makeUpdateChain(error: unknown = null) {
  const eqFn = vi.fn(() => Promise.resolve({ error }))
  const updateFn = vi.fn(() => ({ eq: eqFn }))
  return { update: updateFn, _eqFn: eqFn }
}

describe('updateProfile', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const fd = new FormData()
    fd.set('bio', 'Hello')
    fd.set('skills', 'React')
    const result = await updateProfile(fd)
    expect(result).toEqual({ error: 'Not authenticated.' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns error on DB failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const chain = makeUpdateChain({ message: 'DB error' })
    mockFrom.mockReturnValue(chain)
    const fd = new FormData()
    fd.set('bio', 'Bio text')
    fd.set('skills', 'React, TypeScript')
    const result = await updateProfile(fd)
    expect(result).toEqual({ error: 'DB error' })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('trims bio, splits comma-separated skills, updates and revalidates', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const chain = makeUpdateChain(null)
    mockFrom.mockReturnValue(chain)
    const fd = new FormData()
    fd.set('bio', '  Builder  ')
    fd.set('skills', ' React , TypeScript , Node.js ')
    const result = await updateProfile(fd)
    expect(chain.update).toHaveBeenCalledWith({
      bio: 'Builder',
      skills: ['React', 'TypeScript', 'Node.js'],
    })
    expect(chain._eqFn).toHaveBeenCalledWith('id', 'user-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/profile')
    expect(result).toEqual({ success: true })
  })

  it('stores empty array when skills field is blank', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const chain = makeUpdateChain(null)
    mockFrom.mockReturnValue(chain)
    const fd = new FormData()
    fd.set('bio', 'Just a bio')
    fd.set('skills', '   ')
    await updateProfile(fd)
    expect(chain.update).toHaveBeenCalledWith({ bio: 'Just a bio', skills: [] })
  })
})
