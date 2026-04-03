import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSignOut = vi.fn()
const mockGetAll = vi.fn()
const mockDelete = vi.fn()
const mockRedirect = vi.fn()

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(() => ({
    auth: { signOut: mockSignOut },
  })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: mockGetAll,
    delete: mockDelete,
  })),
}))

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

const { signOut } = await import('@/app/actions/auth')

describe('signOut action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignOut.mockResolvedValue({})
  })

  it('calls supabase signOut', async () => {
    mockGetAll.mockReturnValue([])
    await signOut()
    expect(mockSignOut).toHaveBeenCalledOnce()
  })

  it('deletes all sb-* cookies', async () => {
    mockGetAll.mockReturnValue([
      { name: 'sb-access-token', value: 'abc' },
      { name: 'sb-refresh-token', value: 'xyz' },
      { name: 'unrelated-cookie', value: '123' },
    ])
    await signOut()
    expect(mockDelete).toHaveBeenCalledWith('sb-access-token')
    expect(mockDelete).toHaveBeenCalledWith('sb-refresh-token')
    expect(mockDelete).not.toHaveBeenCalledWith('unrelated-cookie')
  })

  it('redirects to /login', async () => {
    mockGetAll.mockReturnValue([])
    await signOut()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })
})
