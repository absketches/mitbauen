/**
 * Notification data layer.
 *
 * getNotifications() is the single source of truth for what shows in the
 * bell dropdown. It returns ONE item per thread / per project-comment-section
 * (not one per message), showing the most recent unread activity.
 *
 * Notification scope:
 *   - Thread messages you haven't read, from the other party, on threads where:
 *       • you are the applicant  (owner's replies)
 *       • you are the project owner  (all applicants' messages)
 *   - New (pending) applications on your own project's roles
 *   - Unread comments from others on:
 *       • projects you own
 *       • projects you applied to
 *       • projects you previously commented on
 *
 *   Your OWN messages/comments NEVER generate a notification for yourself.
 *
 * getNotificationCount() simply returns getNotifications().length so the badge
 * count and the dropdown list are always in sync.
 *
 * The two pure compute* helpers are exported for unit testing.
 */

import { createClient } from '@/lib/supabase-server'
import { getApplicationsById } from '@/lib/db/applications'
import type { ApplicationInboxRow } from '@/lib/db/applications'

// ─── Public types ─────────────────────────────────────────────────────────────

export type NotificationItem = {
  /** Stable React key */
  id: string
  type: 'thread' | 'new_application' | 'comment'
  projectId: string
  projectTitle: string
  /** Role context — set for thread / application types */
  roleTitle: string | null
  /** Person who triggered the notification */
  actorName: string | null
  actorAvatar: string | null
  /** Preview of the latest unread message / comment body */
  latestBody: string
  /** UTC ISO string — the client component converts to local timezone */
  latestAt: string
  /** Total unread count for this thread / project */
  unreadCount: number
  /** Where to navigate on click */
  link: string
  /** Present on thread / new_application — used to mark thread read on click */
  applicationId: string | null
}

// ─── Pure helpers (exported for unit tests) ───────────────────────────────────

type MsgRow    = { application_id: string; sender_id: string; created_at: string }
type MsgRead   = { application_id: string; last_read_at: string }
type CommentRow = { project_id: string; created_at: string }
type CommentRead = { project_id: string; last_read_at: string }
type IdRow = { id: string }
type PendingApplicationRow = { id: string; created_at: string; message: string | null }
type JoinedUser =
  | { name: string | null; avatar_url: string | null }
  | Array<{ name: string | null; avatar_url: string | null }>
  | null
type ThreadMessageRow = {
  id: string
  application_id: string
  body: string
  created_at: string
  sender_id: string
  users: JoinedUser
}
type OwnCommentProjectRow = { project_id: string }
type ProjectTitleRow = { id: string; title: string }
type CommentNotificationRow = {
  id: string
  project_id: string
  body: string
  created_at: string
  user_id: string
  users: JoinedUser
}

function extractJoinedUser(user: JoinedUser) {
  if (Array.isArray(user)) return user[0] ?? null
  return user
}

/**
 * Count unread thread messages from others (own messages are excluded).
 */
export function computeMessageNotifications(
  msgs: MsgRow[],
  reads: MsgRead[],
  userId: string
): number {
  const readMap = new Map(reads.map(r => [r.application_id, r.last_read_at]))
  let count = 0
  for (const msg of msgs) {
    if (msg.sender_id === userId) continue
    const lastRead = readMap.get(msg.application_id)
    if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) count++
  }
  return count
}

/**
 * Count unread comments from others. Caller is responsible for filtering out
 * the user's own comments before passing the array (via `.neq('user_id', userId)`).
 */
export function computeCommentNotifications(
  comments: CommentRow[],
  reads: CommentRead[]
): number {
  const readMap = new Map(reads.map(r => [r.project_id, r.last_read_at]))
  let count = 0
  for (const comment of comments) {
    const lastRead = readMap.get(comment.project_id)
    if (!lastRead || new Date(comment.created_at) > new Date(lastRead)) count++
  }
  return count
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

/**
 * Returns a sorted list of notification items (most recent first).
 * One item per thread, one item per project's comment section.
 */
export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  const supabase = await createClient()
  const items: NotificationItem[] = []

  // ── Step 1: Collect application IDs from both sides of the relationship ────

  const [{ data: myApps }, { data: ownedProjects }] = await Promise.all([
    supabase.from('applications').select('id').eq('applicant_id', userId),
    supabase.from('projects').select('id').eq('owner_id', userId),
  ])

  const applicantAppIds = ((myApps ?? []) as IdRow[]).map(application => application.id)
  const ownedProjectIds = ((ownedProjects ?? []) as IdRow[]).map(project => project.id)

  // Owner path: projects → roles → applications (three flat queries)
  let ownerAppIds: string[] = []
  if (ownedProjectIds.length > 0) {
    const { data: roles } = await supabase
      .from('roles').select('id').in('project_id', ownedProjectIds)
    const roleIds = ((roles ?? []) as IdRow[]).map(role => role.id)
    if (roleIds.length > 0) {
      const { data: apps } = await supabase
        .from('applications').select('id').in('role_id', roleIds)
      ownerAppIds = ((apps ?? []) as IdRow[]).map(application => application.id)
    }
  }

  const allAppIds = [...new Set([...applicantAppIds, ...ownerAppIds])]

  // ── Step 2: Resolve full context (project title, role title, actor info) ───

  const appRows: ApplicationInboxRow[] =
    allAppIds.length > 0 ? await getApplicationsById(allAppIds) : []
  const appMap = new Map<string, ApplicationInboxRow>(appRows.map(a => [a.id, a]))

  // ── Step 3: Thread message notifications ───────────────────────────────────

  if (allAppIds.length > 0) {
    const [{ data: msgs }, { data: reads }] = await Promise.all([
      supabase
        .from('application_messages')
        .select('id, application_id, body, created_at, sender_id, users!sender_id (name, avatar_url)')
        .in('application_id', allAppIds)
        .order('created_at', { ascending: true }),
      supabase
        .from('application_message_reads')
        .select('application_id, last_read_at')
        .eq('user_id', userId)
        .in('application_id', allAppIds),
    ])

    const readMap = new Map(
      ((reads ?? []) as MsgRead[]).map(read => [read.application_id, read.last_read_at] as const)
    )

    // Collapse all unread messages per thread into one item (latest message shown)
    const threadLatest = new Map<string, { msg: ThreadMessageRow; count: number }>()
    for (const msg of (msgs ?? []) as ThreadMessageRow[]) {
      if (msg.sender_id === userId) continue   // never notify on own messages
      const lastRead = readMap.get(msg.application_id)
      if (lastRead && new Date(msg.created_at) <= new Date(lastRead)) continue

      const existing = threadLatest.get(msg.application_id)
      threadLatest.set(msg.application_id, {
        // Keep the most recent unread message as the preview
        msg: !existing || new Date(msg.created_at) > new Date(existing.msg.created_at)
          ? msg
          : existing.msg,
        count: (existing?.count ?? 0) + 1,
      })
    }

    for (const [appId, { msg, count }] of threadLatest) {
      const app = appMap.get(appId)
      if (!app) continue
      const isOwner = app.project_owner_id === userId
      items.push({
        id: `thread-${appId}`,
        type: 'thread',
        projectId: app.project_id,
        projectTitle: app.project_title,
        roleTitle: app.role_title,
        // Show the other party: if I'm the owner → show applicant, and vice versa
        actorName:   isOwner ? app.applicant_name   : app.owner_name,
        actorAvatar: isOwner ? app.applicant_avatar  : app.owner_avatar,
        latestBody: msg.body,
        latestAt: msg.created_at,
        unreadCount: count,
        link: `/projects/${app.project_id}#thread-${appId}`,
        applicationId: appId,
      })
    }
  }

  // ── Step 4: Pending application notifications (project owner only) ─────────

  if (ownerAppIds.length > 0) {
    const { data: pending } = await supabase
      .from('applications')
      .select('id, created_at, message')
      .eq('status', 'pending')
      .in('id', ownerAppIds)

    for (const app of (pending ?? []) as PendingApplicationRow[]) {
      const appRow = appMap.get(app.id)
      if (!appRow) continue
      items.push({
        id: `application-${app.id}`,
        type: 'new_application',
        projectId: appRow.project_id,
        projectTitle: appRow.project_title,
        roleTitle: appRow.role_title,
        actorName:   appRow.applicant_name,
        actorAvatar: appRow.applicant_avatar,
        latestBody: app.message ?? '',
        latestAt: app.created_at,
        unreadCount: 1,
        link: `/projects/${appRow.project_id}`,
        applicationId: app.id,
      })
    }
  }

  // ── Step 5: Comment notifications ──────────────────────────────────────────
  // Watch projects I: own, applied to, or previously commented on.

  const appliedProjectIds = appRows
    .filter(a => a.applicant_id === userId)
    .map(a => a.project_id)

  const { data: myComments } = await supabase
    .from('comments').select('project_id').eq('user_id', userId)
  const commentedProjectIds = ((myComments ?? []) as OwnCommentProjectRow[]).map(
    comment => comment.project_id
  )

  const watchedProjectIds = [...new Set([
    ...ownedProjectIds,
    ...appliedProjectIds,
    ...commentedProjectIds,
  ])]

  if (watchedProjectIds.length > 0) {
    const [{ data: comments }, { data: commentReads }, { data: projectRows }] = await Promise.all([
      supabase
        .from('comments')
        .select('id, project_id, body, created_at, user_id, users!user_id (name, avatar_url)')
        .in('project_id', watchedProjectIds)
        .neq('user_id', userId)              // exclude own comments
        .order('created_at', { ascending: true }),
      supabase
        .from('project_comment_reads')
        .select('project_id, last_read_at')
        .eq('user_id', userId)
        .in('project_id', watchedProjectIds),
      supabase
        .from('projects')
        .select('id, title')
        .in('id', watchedProjectIds),
    ])

    const commentReadMap = new Map(
      ((commentReads ?? []) as CommentRead[]).map(read => [read.project_id, read.last_read_at] as const)
    )
    const projectTitleMap = new Map(
      ((projectRows ?? []) as ProjectTitleRow[]).map(project => [project.id, project.title] as const)
    )

    // Collapse all unread comments per project into one item (latest shown)
    const projectLatest = new Map<string, { comment: CommentNotificationRow; count: number }>()
    for (const comment of (comments ?? []) as CommentNotificationRow[]) {
      const lastRead = commentReadMap.get(comment.project_id)
      if (lastRead && new Date(comment.created_at) <= new Date(lastRead)) continue

      const existing = projectLatest.get(comment.project_id)
      projectLatest.set(comment.project_id, {
        comment: !existing || new Date(comment.created_at) > new Date(existing.comment.created_at)
          ? comment
          : existing.comment,
        count: (existing?.count ?? 0) + 1,
      })
    }

    for (const [projectId, { comment, count }] of projectLatest) {
      items.push({
        id: `comment-${projectId}`,
        type: 'comment',
        projectId,
        projectTitle: projectTitleMap.get(projectId) ?? 'Unknown project',
        roleTitle: null,
        actorName: extractJoinedUser(comment.users)?.name ?? null,
        actorAvatar: extractJoinedUser(comment.users)?.avatar_url ?? null,
        latestBody: comment.body,
        latestAt: comment.created_at,
        unreadCount: count,
        link: `/projects/${projectId}`,
        applicationId: null,
      })
    }
  }

  // Most recent activity first
  return items.sort(
    (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
  )
}

// ─── Derived count (badge) ────────────────────────────────────────────────────

/**
 * Badge count = number of distinct notification items.
 * Calling getNotifications ensures badge and dropdown are always in sync.
 */
export async function getNotificationCount(userId: string): Promise<number> {
  try {
    return (await getNotifications(userId)).length
  } catch {
    return 0
  }
}

// ─── Mark-read helpers ────────────────────────────────────────────────────────

export async function markProjectCommentsRead(projectId: string, userId: string) {
  try {
    const supabase = await createClient()
    await supabase.from('project_comment_reads').upsert(
      { project_id: projectId, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: 'project_id,user_id' }
    )
  } catch {
    // Non-critical — ignore failures
  }
}
