/**
 * Notification count for the navbar bell icon.
 *
 * Three signals are combined into one number:
 *   1. Unread messages in application threads (both roles)
 *   2. Pending applications on roles the user owns
 *   3. Unread comments on projects the user owns
 *
 * A single Supabase client is used throughout to avoid Next.js request-context
 * conflicts. The whole function is wrapped in try/catch and returns 0 on error
 * so a DB hiccup never breaks the layout render.
 *
 * The two compute* helpers below are pure functions — they contain no I/O and
 * are exported so they can be unit-tested independently of Supabase.
 */
import { createClient } from '@/lib/supabase-server'

// ─── Pure computation helpers (exported for testing) ──────────────────────────

type MsgRow = { application_id: string; sender_id: string; created_at: string }
type MsgRead = { application_id: string; last_read_at: string }

/**
 * Count thread messages that the user hasn't seen yet.
 * Own messages are never counted — only messages from other senders.
 */
export function computeMessageNotifications(
  msgs: MsgRow[],
  reads: MsgRead[],
  userId: string
): number {
  const readMap = new Map(reads.map(r => [r.application_id, r.last_read_at]))
  let count = 0
  for (const msg of msgs) {
    if (msg.sender_id === userId) continue                          // skip own messages
    const lastRead = readMap.get(msg.application_id)
    if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) count++
  }
  return count
}

type CommentRow = { project_id: string; created_at: string }
type CommentRead = { project_id: string; last_read_at: string }

/**
 * Count comments the user hasn't seen yet (already filtered to exclude own
 * comments before calling this — the caller's query uses `.neq('user_id', userId)`).
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

// ─── Main count function ───────────────────────────────────────────────────────

export async function getNotificationCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient()

    // ── Find all application IDs the user participates in ──────────────────
    const { data: myApps } = await supabase
      .from('applications')
      .select('id')
      .eq('applicant_id', userId)
    const applicantAppIds = (myApps ?? []).map((a: any) => a.id as string)

    const { data: ownedProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', userId)
    const ownedProjectIds = (ownedProjects ?? []).map((p: any) => p.id as string)

    // Owner path: projects → roles → applications (three flat queries, no nesting)
    let ownerAppIds: string[] = []
    if (ownedProjectIds.length > 0) {
      const { data: roles } = await supabase
        .from('roles')
        .select('id')
        .in('project_id', ownedProjectIds)
      const roleIds = (roles ?? []).map((r: any) => r.id as string)

      if (roleIds.length > 0) {
        const { data: apps } = await supabase
          .from('applications')
          .select('id')
          .in('role_id', roleIds)
        ownerAppIds = (apps ?? []).map((a: any) => a.id as string)
      }
    }

    const allAppIds = [...new Set([...applicantAppIds, ...ownerAppIds])]

    // ── 1. Unread application thread messages ──────────────────────────────
    let unreadMessages = 0
    if (allAppIds.length > 0) {
      const [{ data: msgs }, { data: reads }] = await Promise.all([
        supabase
          .from('application_messages')
          .select('application_id, created_at, sender_id')
          .in('application_id', allAppIds),
        supabase
          .from('application_message_reads')
          .select('application_id, last_read_at')
          .eq('user_id', userId)
          .in('application_id', allAppIds),
      ])
      unreadMessages = computeMessageNotifications(msgs ?? [], reads ?? [], userId)
    }

    // ── 2. Pending applications on owner's roles ───────────────────────────
    let pendingApplications = 0
    if (ownerAppIds.length > 0) {
      const { data: pending } = await supabase
        .from('applications')
        .select('id')
        .eq('status', 'pending')
        .in('id', ownerAppIds)
      pendingApplications = (pending ?? []).length
    }

    // ── 3. Unread comments on owner's projects from others ─────────────────
    let unreadComments = 0
    if (ownedProjectIds.length > 0) {
      const [{ data: comments }, { data: commentReads }] = await Promise.all([
        supabase
          .from('comments')
          .select('project_id, created_at, user_id')
          .in('project_id', ownedProjectIds)
          .neq('user_id', userId),                                   // exclude own comments
        supabase
          .from('project_comment_reads')
          .select('project_id, last_read_at')
          .eq('user_id', userId)
          .in('project_id', ownedProjectIds),
      ])
      unreadComments = computeCommentNotifications(comments ?? [], commentReads ?? [])
    }

    return unreadMessages + pendingApplications + unreadComments
  } catch {
    return 0
  }
}

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
