/**
 * In-memory database that mimics enough of the Supabase client API to support
 * full integration tests of server actions without a real database.
 *
 * Data actually flows through the store — inserts persist, subsequent selects
 * see them, updates mutate them. This is the key difference from unit tests,
 * which mock each call individually.
 *
 * Foreign-key join resolution supports the nested relation syntax Supabase
 * uses in .select() strings, e.g. "roles (project_id, projects (owner_id))".
 */

import { randomUUID } from 'crypto'

// ─── Schema ──────────────────────────────────────────────────────────────────

type Tables = {
  users: any[]
  projects: any[]
  roles: any[]
  applications: any[]
  votes: any[]
  comments: any[]
}

// FK relationships: for each table, relation name → { foreign key col in this table, target table }
const RELATIONS: Record<string, Record<string, { fkCol: string; refTable: keyof Tables }>> = {
  applications: {
    roles: { fkCol: 'role_id', refTable: 'roles' },
    users: { fkCol: 'applicant_id', refTable: 'users' },
  },
  roles: {
    projects: { fkCol: 'project_id', refTable: 'projects' },
  },
  comments: {
    users: { fkCol: 'user_id', refTable: 'users' },
  },
  projects: {
    users: { fkCol: 'owner_id', refTable: 'users' },
  },
}

// ─── Query builder ────────────────────────────────────────────────────────────

class QueryBuilder {
  private db: TestDatabase
  private tableName: string
  private filters: Array<{ col: string; op: 'eq' | 'in'; val: any }> = []
  private selectStr = ''

  constructor(db: TestDatabase, tableName: string) {
    this.db = db
    this.tableName = tableName
  }

  select(cols: string) {
    this.selectStr = cols
    return this
  }

  eq(col: string, val: any) {
    this.filters.push({ col, op: 'eq', val })
    return this
  }

  in(col: string, vals: any[]) {
    this.filters.push({ col, op: 'in', val: vals })
    return this
  }

  order(_col: string, _opts?: any) {
    // ordering not needed for correctness in tests
    return this
  }

  private applyFilters(rows: any[]): any[] {
    return rows.filter(row =>
      this.filters.every(f => {
        if (f.op === 'eq') return row[f.col] === f.val
        if (f.op === 'in') return f.val.includes(row[f.col])
        return true
      })
    )
  }

  async single() {
    const rows = this.applyFilters(
      (this.db.tables as any)[this.tableName] ?? []
    )
    if (rows.length === 0) return { data: null, error: null }
    const row = this.selectStr
      ? this.db.resolveRelations({ ...rows[0] }, this.tableName, this.selectStr)
      : { ...rows[0] }
    return { data: row, error: null }
  }

  async then(resolve: (v: any) => void) {
    // Allows awaiting the builder directly (e.g. for select without .single())
    const rows = this.applyFilters(
      (this.db.tables as any)[this.tableName] ?? []
    )
    resolve({ data: rows, error: null })
  }

  insert(data: any) {
    const table = (this.db.tables as any)[this.tableName]
    if (!table) return { data: null, error: { message: `Table ${this.tableName} not found` } }
    const rows = Array.isArray(data) ? data : [data]
    const inserted = rows.map(r => ({
      id: randomUUID(),
      created_at: new Date().toISOString(),
      status: 'pending', // sensible default for applications
      ...r,
    }))
    table.push(...inserted)
    // Return a then-able so callers can either await directly or chain .select().single()
    const result = { data: Array.isArray(data) ? inserted : inserted[0], error: null }
    return {
      ...result,
      select: () => ({ single: async () => result }),
    }
  }

  update(data: any) {
    const self = this
    return {
      eq: async (col: string, val: any) => {
        const table = (self.db.tables as any)[self.tableName]
        if (!table) return { error: { message: `Table ${self.tableName} not found` } }
        table.forEach((row: any, i: number) => {
          if (row[col] === val) table[i] = { ...row, ...data }
        })
        return { error: null }
      },
    }
  }
}

// ─── Database ─────────────────────────────────────────────────────────────────

export class TestDatabase {
  tables: Tables = {
    users: [],
    projects: [],
    roles: [],
    applications: [],
    votes: [],
    comments: [],
  }

  reset() {
    Object.keys(this.tables).forEach(k => {
      ;(this.tables as any)[k] = []
    })
  }

  /**
   * Resolves nested Supabase relation syntax, e.g.:
   *   "id, roles (project_id, projects (owner_id))"
   * by following FK relationships and embedding the related rows.
   */
  resolveRelations(row: any, tableName: string, selectStr: string): any {
    const result = { ...row }
    // Match "relationName (fields, possibly (nested))"
    const relationRegex = /(\w+)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g
    let match
    while ((match = relationRegex.exec(selectStr)) !== null) {
      const [, relName, innerSelect] = match
      const rel = RELATIONS[tableName]?.[relName]
      if (!rel) continue
      const refRows = (this.tables as any)[rel.refTable] ?? []
      const related = refRows.find((r: any) => r.id === row[rel.fkCol])
      result[relName] = related
        ? (innerSelect.trim()
            ? this.resolveRelations({ ...related }, rel.refTable, innerSelect)
            : { ...related })
        : null
    }
    return result
  }

  from(tableName: keyof Tables) {
    return new QueryBuilder(this, tableName as string)
  }
}

// ─── Client factory ───────────────────────────────────────────────────────────

/**
 * Returns a Supabase-shaped client backed by the in-memory TestDatabase.
 * Pass userId to simulate an authenticated user.
 */
export function createTestClient(db: TestDatabase, userId: string | null = null) {
  return {
    auth: {
      getUser: async () => ({
        data: {
          user: userId
            ? { id: userId, email: `${userId}@test.com` }
            : null,
        },
      }),
      signOut: async () => ({}),
    },
    from: (table: string) => db.from(table as keyof Tables),
  }
}

// ─── Seed helpers ─────────────────────────────────────────────────────────────

export function seedUser(db: TestDatabase, overrides: any = {}) {
  const user = {
    id: randomUUID(),
    email: 'test@example.com',
    name: 'Test User',
    avatar_url: null,
    ...overrides,
  }
  db.tables.users.push(user)
  return user
}

export function seedProject(db: TestDatabase, overrides: any = {}) {
  const project = {
    id: randomUUID(),
    title: 'Test Project',
    description: 'A test project',
    status: 'active',
    commitment_hours_pw: 10,
    commitment_role: 'Developer',
    commitment_description: null,
    why_it_matters: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
  db.tables.projects.push(project)
  return project
}

export function seedRole(db: TestDatabase, overrides: any = {}) {
  const role = {
    id: randomUUID(),
    title: 'Frontend Developer',
    description: 'Build the UI',
    skills_needed: ['React'],
    status: 'open',
    ...overrides,
  }
  db.tables.roles.push(role)
  return role
}
