'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { markCommentsRead } from '@/app/actions/comments'

/**
 * Invisible client component that fires once on mount to mark the project's
 * comments as read, then calls router.refresh() so the navbar badge drops
 * without requiring a full page reload.
 *
 * router.refresh() re-renders server components in-place — client component
 * state is preserved, so there is no remount loop.
 */
export default function MarkCommentsRead({ projectId }: { projectId: string }) {
  const router = useRouter()

  useEffect(() => {
    markCommentsRead(projectId).then(() => router.refresh())
    // projectId is stable for the lifetime of this page; router is a stable ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  return null
}
