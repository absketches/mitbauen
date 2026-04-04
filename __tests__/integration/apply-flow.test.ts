// @vitest-environment node
/**
 * Integration tests for the application flow.
 *
 * Unlike unit tests (which mock each DB call individually), these tests use the
 * in-memory TestDatabase so data actually persists across calls. This lets us
 * verify cross-action state:
 *   - apply → application is stored → duplicate check catches it
 *   - owner responds → status is updated in the same store
 *   - non-owner cannot respond
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TestDatabase, createTestClient, seedUser, seedProject, seedRole } from '../helpers/in-memory-db'

type UserRecord = { id: string; email: string; name?: string }
type ProjectRecord = { id: string; owner_id: string }
type RoleRecord = { id: string; project_id: string; title?: string; status: 'open' | 'filled' | 'closed' }
type ApplicationRecord = { id: string; status: 'pending' | 'accepted' | 'rejected' }
type ActionResult = { success?: boolean; error?: string }

// Side-effect mocks (not DB-related)
const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

// We'll swap this per test using the test client factory
let testClient: ReturnType<typeof createTestClient>

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(() => testClient),
}))

const { applyToRole, respondToApplication } = await import('@/app/actions/applications')

// ─── Shared state ─────────────────────────────────────────────────────────────

const db = new TestDatabase()
let owner: UserRecord
let applicant: UserRecord
let project: ProjectRecord
let role: RoleRecord

beforeEach(() => {
  db.reset()
  vi.clearAllMocks()

  owner     = seedUser(db, { id: 'owner-id',     email: 'owner@test.com',     name: 'Owner' })
  applicant = seedUser(db, { id: 'applicant-id', email: 'applicant@test.com', name: 'Applicant' })
  project   = seedProject(db, { id: 'project-id', owner_id: owner.id })
  role      = seedRole(db, { id: 'role-id', project_id: project.id })
})

// ─── applyToRole ──────────────────────────────────────────────────────────────

describe('applyToRole — integration', () => {
  it('saves the application to the database', async () => {
    testClient = createTestClient(db, applicant.id)

    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', 'I bring React skills')

    const result = await applyToRole(project.id, role.id, fd)
    expect(result?.success).toBe(true)

    // The application is actually in the store
    expect(db.tables.applications).toHaveLength(1)
    expect(db.tables.applications[0]).toMatchObject({
      role_id: role.id,
      applicant_id: applicant.id,
      message: 'I love this idea',
      what_i_bring: 'I bring React skills',
    })
  })

  it('prevents a second application to the same role', async () => {
    testClient = createTestClient(db, applicant.id)

    const fd = () => {
      const f = new FormData()
      f.set('message', 'I love this idea')
      f.set('what_i_bring', 'I bring React skills')
      return f
    }

    await applyToRole(project.id, role.id, fd())
    const second = await applyToRole(project.id, role.id, fd())

    expect((second as ActionResult)?.error).toContain('already applied')
    // Still only one application in the store
    expect(db.tables.applications).toHaveLength(1)
  })

  it('rejects applying to a role on another project', async () => {
    const otherProject = seedProject(db, { id: 'other-project-id', owner_id: owner.id })
    const otherRole = seedRole(db, { id: 'other-role-id', project_id: otherProject.id })
    testClient = createTestClient(db, applicant.id)

    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', 'I bring React skills')

    const result = await applyToRole(project.id, otherRole.id, fd)

    expect((result as ActionResult)?.error).toBe('Role not found for this project.')
    expect(db.tables.applications).toHaveLength(0)
  })

  it('rejects owners applying to their own project', async () => {
    testClient = createTestClient(db, owner.id)

    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', 'I bring React skills')

    const result = await applyToRole(project.id, role.id, fd)

    expect((result as ActionResult)?.error).toBe('You cannot apply to your own project.')
    expect(db.tables.applications).toHaveLength(0)
  })

  it('rejects applying to a closed role', async () => {
    role.status = 'closed'
    testClient = createTestClient(db, applicant.id)

    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', 'I bring React skills')

    const result = await applyToRole(project.id, role.id, fd)

    expect((result as ActionResult)?.error).toBe('This role is no longer open.')
    expect(db.tables.applications).toHaveLength(0)
  })

  it('allows the same user to apply to a different role on the same project', async () => {
    const role2 = seedRole(db, { id: 'role-2', project_id: project.id, title: 'Backend Developer' })
    testClient = createTestClient(db, applicant.id)

    const fd = (msg: string) => {
      const f = new FormData()
      f.set('message', msg)
      f.set('what_i_bring', 'I bring skills')
      return f
    }

    await applyToRole(project.id, role.id, fd('For role 1'))
    const r2 = await applyToRole(project.id, role2.id, fd('For role 2'))

    expect(r2?.success).toBe(true)
    expect(db.tables.applications).toHaveLength(2)
  })

  it('rejects unauthenticated apply attempt — no DB write', async () => {
    testClient = createTestClient(db, null) // not logged in

    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', 'I bring skills')

    const result = await applyToRole(project.id, role.id, fd)

    expect((result as ActionResult)?.error).toBe('Not authenticated.')
    expect(db.tables.applications).toHaveLength(0)
  })

  it('revalidates the project path after successful application', async () => {
    testClient = createTestClient(db, applicant.id)

    const fd = new FormData()
    fd.set('message', 'I love this idea')
    fd.set('what_i_bring', 'I bring skills')

    await applyToRole(project.id, role.id, fd)
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/projects/${project.id}`)
  })
})

// ─── respondToApplication ─────────────────────────────────────────────────────

describe('respondToApplication — integration', () => {
  let application: ApplicationRecord

  beforeEach(async () => {
    // Seed an existing application
    testClient = createTestClient(db, applicant.id)
    const fd = new FormData()
    fd.set('message', 'Want to join')
    fd.set('what_i_bring', 'I bring skills')
    await applyToRole(project.id, role.id, fd)
    application = db.tables.applications[0]
  })

  it('owner can accept an application — status is updated in DB', async () => {
    testClient = createTestClient(db, owner.id)

    const result = await respondToApplication(project.id, application.id, 'accepted')

    expect(result?.success).toBe(true)
    const updated = db.tables.applications.find(a => a.id === application.id)
    expect(updated?.status).toBe('accepted')
  })

  it('owner can reject an application — status is updated in DB', async () => {
    testClient = createTestClient(db, owner.id)

    const result = await respondToApplication(project.id, application.id, 'rejected')

    expect(result?.success).toBe(true)
    const updated = db.tables.applications.find(a => a.id === application.id)
    expect(updated?.status).toBe('rejected')
  })

  it('non-owner cannot change application status', async () => {
    const stranger = seedUser(db, { id: 'stranger-id', email: 'stranger@test.com' })
    testClient = createTestClient(db, stranger.id)

    const result = await respondToApplication(project.id, application.id, 'accepted')

    expect((result as ActionResult)?.error).toBe('Not authorised.')
    // Status must remain unchanged
    const unchanged = db.tables.applications.find(a => a.id === application.id)
    expect(unchanged?.status).toBe('pending')
  })

  it('applicant cannot respond to their own application', async () => {
    testClient = createTestClient(db, applicant.id)

    const result = await respondToApplication(project.id, application.id, 'accepted')

    expect((result as ActionResult)?.error).toBe('Not authorised.')
  })

  it('unauthenticated user cannot respond', async () => {
    testClient = createTestClient(db, null)

    const result = await respondToApplication(project.id, application.id, 'accepted')

    expect((result as ActionResult)?.error).toBe('Not authenticated.')
    const unchanged = db.tables.applications.find(a => a.id === application.id)
    expect(unchanged?.status).toBe('pending')
  })

  it('rejects responding when the application does not belong to the given project', async () => {
    const otherProject = seedProject(db, { id: 'other-project-id', owner_id: owner.id })
    testClient = createTestClient(db, owner.id)

    const result = await respondToApplication(otherProject.id, application.id, 'accepted')

    expect((result as ActionResult)?.error).toBe('Application not found for this project.')
    const unchanged = db.tables.applications.find(a => a.id === application.id)
    expect(unchanged?.status).toBe('pending')
  })

  it('revalidates project path after response', async () => {
    testClient = createTestClient(db, owner.id)
    vi.clearAllMocks()

    await respondToApplication(project.id, application.id, 'accepted')
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/projects/${project.id}`)
  })
})
