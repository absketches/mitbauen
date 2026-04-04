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

type DbRecord = Record<string, unknown>

export type UserRow = {
  id: string
  email: string
  name: string
  avatar_url: string | null
}

export type ProjectRow = {
  id: string
  owner_id: string
  title: string
  description: string
  status: string
  commitment_hours_pw: number
  commitment_role: string
  commitment_description: string | null
  why_it_matters: string | null
  created_at: string
}

export type RoleRow = {
  id: string
  project_id: string
  title: string
  description: string
  skills_needed: string[]
  status: 'open' | 'filled' | 'closed'
}

export type ApplicationRow = {
  id: string
  role_id: string
  applicant_id: string
  message: string
  what_i_bring: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

export type VoteRow = {
  id: string
  project_id: string
  user_id: string
  created_at: string
}

export type CommentRow = {
  id: string
  project_id: string
  user_id: string
  body: string
  created_at: string
}

type Tables = {
  users: UserRow[]
  projects: ProjectRow[]
  roles: RoleRow[]
  applications: ApplicationRow[]
  votes: VoteRow[]
  comments: CommentRow[]
}

type TableName = keyof Tables

type TableRowMap = {
  users: UserRow
  projects: ProjectRow
  roles: RoleRow
  applications: ApplicationRow
  votes: VoteRow
  comments: CommentRow
}

type Relation = { fkCol: string; refTable: TableName }

// FK relationships: for each table, relation name → { foreign key col in this table, target table }
const RELATIONS: Record<string, Record<string, Relation>> = {
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

type Filter = {
  col: string
  op: 'eq' | 'in'
  val: unknown
}

class QueryBuilder<T extends TableName> {
  private db: TestDatabase
  private tableName: T
  private filters: Filter[] = []
  private selectStr = ''

  constructor(db: TestDatabase, tableName: T) {
    this.db = db
    this.tableName = tableName
  }

  select(cols: string) {
    this.selectStr = cols
    return this
  }

  eq(col: string, val: unknown) {
    this.filters.push({ col, op: 'eq', val })
    return this
  }

  in(col: string, vals: unknown[]) {
    this.filters.push({ col, op: 'in', val: vals })
    return this
  }

  order() {
    // ordering not needed for correctness in tests
    return this
  }

  private getRows(): TableRowMap[T][] {
    return this.db.tables[this.tableName]
  }

  private applyFilters(rows: TableRowMap[T][]): TableRowMap[T][] {
    return rows.filter(row => {
      const record = row as unknown as DbRecord
      return this.filters.every(filter => {
        if (filter.op === 'eq') return record[filter.col] === filter.val
        if (filter.op === 'in') return Array.isArray(filter.val) && filter.val.includes(record[filter.col])
        return true
      })
    })
  }

  async single(): Promise<{ data: DbRecord | null; error: null }> {
    const rows = this.applyFilters(this.getRows())
    if (rows.length === 0) return { data: null, error: null }
    const row = this.selectStr
      ? this.db.resolveRelations({ ...rows[0] }, this.tableName, this.selectStr)
      : ({ ...rows[0] } as DbRecord)
    return { data: row, error: null }
  }

  async then(resolve: (value: { data: TableRowMap[T][]; error: null }) => void) {
    const rows = this.applyFilters(this.getRows())
    resolve({ data: rows, error: null })
  }

  insert(data: Partial<TableRowMap[T]> | Array<Partial<TableRowMap[T]>>) {
    const table = this.getRows()
    const rows = Array.isArray(data) ? data : [data]
    const inserted = rows.map(row => {
      const baseRow: DbRecord = {
        id: randomUUID(),
        created_at: new Date().toISOString(),
        ...(this.tableName === 'applications' ? { status: 'pending' } : {}),
        ...row,
      }
      return baseRow as TableRowMap[T]
    })

    table.push(...inserted)

    const result = {
      data: Array.isArray(data) ? inserted : inserted[0],
      error: null,
    }

    return {
      ...result,
      select: () => ({ single: async () => result }),
    }
  }

  update(data: Partial<TableRowMap[T]>) {
    return {
      eq: async (col: string, val: unknown) => {
        const table = this.getRows()
        table.forEach((row, index) => {
          const record = row as unknown as DbRecord
          if (record[col] === val) {
            table[index] = { ...row, ...data }
          }
        })
        return { error: null }
      },
    }
  }
}

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
    this.tables = {
      users: [],
      projects: [],
      roles: [],
      applications: [],
      votes: [],
      comments: [],
    }
  }

  /**
   * Resolves nested Supabase relation syntax, e.g.:
   *   "id, roles (project_id, projects (owner_id))"
   * by following FK relationships and embedding the related rows.
   */
  resolveRelations(row: DbRecord, tableName: TableName, selectStr: string): DbRecord {
    const result: DbRecord = { ...row }
    // Match "relationName (fields, possibly (nested))"
    const relationRegex = /(\w+)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g
    let match: RegExpExecArray | null
    while ((match = relationRegex.exec(selectStr)) !== null) {
      const [, relName, innerSelect] = match
      const rel = RELATIONS[tableName]?.[relName]
      if (!rel) continue

      const refRows = this.tables[rel.refTable] as unknown as DbRecord[]
      const related = refRows.find(candidate => candidate.id === row[rel.fkCol])
      result[relName] = related
        ? (innerSelect.trim()
            ? this.resolveRelations({ ...related }, rel.refTable, innerSelect)
            : { ...related })
        : null
    }
    return result
  }

  from<T extends TableName>(tableName: T) {
    return new QueryBuilder(this, tableName)
  }
}

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
    from: <T extends TableName>(table: T) => db.from(table),
  }
}

export function seedUser(db: TestDatabase, overrides: Partial<UserRow> = {}) {
  const user: UserRow = {
    id: randomUUID(),
    email: 'test@example.com',
    name: 'Test User',
    avatar_url: null,
    ...overrides,
  }
  db.tables.users.push(user)
  return user
}

export function seedProject(db: TestDatabase, overrides: Partial<ProjectRow> = {}) {
  const project: ProjectRow = {
    id: randomUUID(),
    owner_id: 'owner-id',
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

export function seedRole(db: TestDatabase, overrides: Partial<RoleRow> = {}) {
  const role: RoleRow = {
    id: randomUUID(),
    project_id: 'project-id',
    title: 'Frontend Developer',
    description: 'Build the UI',
    skills_needed: ['React'],
    status: 'open',
    ...overrides,
  }
  db.tables.roles.push(role)
  return role
}
