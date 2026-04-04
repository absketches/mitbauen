// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase-server', () => ({ createClient: mockCreateClient }))

const { getUserProfile, getProjectsByOwner } = await import('@/lib/db/users')

function makeChain(data: unknown, error: unknown = null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data, error })),
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data, error })),
          })),
          order: vi.fn(() => Promise.resolve({ data, error })),
        })),
      })),
    })),
  }
}

describe('getUserProfile', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns null when user not found', async () => {
    mockCreateClient.mockResolvedValue(makeChain(null))
    const result = await getUserProfile('missing-id')
    expect(result).toBeNull()
  })

  it('returns profile when user exists', async () => {
    const profile = { id: 'user-1', name: 'Alice', avatar_url: null, bio: 'Builder', skills: ['React'] }
    mockCreateClient.mockResolvedValue(makeChain(profile))
    const result = await getUserProfile('user-1')
    expect(result).toEqual(profile)
  })
})

describe('getProjectsByOwner', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns empty array when user has no projects', async () => {
    mockCreateClient.mockResolvedValue(makeChain([]))
    const result = await getProjectsByOwner('user-1')
    expect(result).toEqual([])
  })

  it('returns projects sorted by the query', async () => {
    const projects = [
      { id: 'p-2', title: 'Second', created_at: '2026-04-02T00:00:00Z' },
      { id: 'p-1', title: 'First', created_at: '2026-04-01T00:00:00Z' },
    ]
    mockCreateClient.mockResolvedValue(makeChain(projects))
    const result = await getProjectsByOwner('user-1')
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Second')
  })
})
