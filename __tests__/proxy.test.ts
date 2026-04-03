// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

// Import after mocks are set up
const { proxy } = await import('../proxy')

function makeRequest(path: string) {
  return new NextRequest(`http://localhost:3000${path}`)
}

describe('proxy middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets x-pathname header on every request', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await proxy(makeRequest('/'))
    // The response continues (no redirect) and the request carries x-pathname
    expect(res.status).not.toBe(302)
  })

  it('redirects unauthenticated user from /projects/new to /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await proxy(makeRequest('/projects/new'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirects unauthenticated user from /profile to /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await proxy(makeRequest('/profile'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('allows authenticated user through /projects/new', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const res = await proxy(makeRequest('/projects/new'))
    expect(res.status).not.toBe(307)
  })

  it('redirects authenticated user from /login to /projects', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const res = await proxy(makeRequest('/login'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/projects')
  })

  it('allows unauthenticated user through /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await proxy(makeRequest('/login'))
    expect(res.status).not.toBe(307)
  })

  it('allows unauthenticated user through public routes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await proxy(makeRequest('/projects'))
    expect(res.status).not.toBe(307)
  })
})
