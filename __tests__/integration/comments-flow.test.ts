// @vitest-environment node
/**
 * Integration tests for the comment flow.
 * Verifies comments are actually persisted and that auth/empty-body guards hold.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TestDatabase, createTestClient, seedUser, seedProject } from '../helpers/in-memory-db'

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

let testClient: ReturnType<typeof createTestClient>
vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(() => testClient),
}))

const { addComment } = await import('@/app/actions/comments')

const db = new TestDatabase()
let user: any
let project: any

beforeEach(() => {
  db.reset()
  vi.clearAllMocks()
  user    = seedUser(db, { id: 'user-id' })
  project = seedProject(db, { id: 'project-id', owner_id: user.id })
})

describe('addComment — integration', () => {
  it('persists a comment to the database', async () => {
    testClient = createTestClient(db, user.id)

    const fd = new FormData()
    fd.set('body', 'Great project!')
    await addComment(project.id, fd)

    expect(db.tables.comments).toHaveLength(1)
    expect(db.tables.comments[0]).toMatchObject({
      project_id: project.id,
      user_id: user.id,
      body: 'Great project!',
    })
  })

  it('persists multiple comments in order', async () => {
    testClient = createTestClient(db, user.id)

    for (const body of ['First comment', 'Second comment', 'Third comment']) {
      const fd = new FormData()
      fd.set('body', body)
      await addComment(project.id, fd)
    }

    expect(db.tables.comments).toHaveLength(3)
    expect(db.tables.comments.map((c: any) => c.body)).toEqual([
      'First comment', 'Second comment', 'Third comment',
    ])
  })

  it('stores the trimmed body', async () => {
    testClient = createTestClient(db, user.id)

    const fd = new FormData()
    fd.set('body', '   padded body   ')
    await addComment(project.id, fd)

    expect(db.tables.comments[0].body).toBe('padded body')
  })

  it('does not persist comment for unauthenticated user', async () => {
    testClient = createTestClient(db, null)

    const fd = new FormData()
    fd.set('body', 'Sneaky comment')
    await addComment(project.id, fd)

    expect(db.tables.comments).toHaveLength(0)
  })

  it('does not persist comment when body is empty', async () => {
    testClient = createTestClient(db, user.id)

    const fd = new FormData()
    fd.set('body', '   ')
    await addComment(project.id, fd)

    expect(db.tables.comments).toHaveLength(0)
  })

  it('revalidates the correct project path', async () => {
    testClient = createTestClient(db, user.id)

    const fd = new FormData()
    fd.set('body', 'Nice!')
    await addComment(project.id, fd)

    expect(mockRevalidatePath).toHaveBeenCalledWith(`/projects/${project.id}`)
  })

  it('multiple users can comment on the same project', async () => {
    const user2 = seedUser(db, { id: 'user-2' })

    testClient = createTestClient(db, user.id)
    const fd1 = new FormData()
    fd1.set('body', 'User 1 comment')
    await addComment(project.id, fd1)

    testClient = createTestClient(db, user2.id)
    const fd2 = new FormData()
    fd2.set('body', 'User 2 comment')
    await addComment(project.id, fd2)

    expect(db.tables.comments).toHaveLength(2)
    expect(db.tables.comments[0].user_id).toBe(user.id)
    expect(db.tables.comments[1].user_id).toBe(user2.id)
  })
})
