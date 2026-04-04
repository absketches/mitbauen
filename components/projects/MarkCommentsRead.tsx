'use client'

import { useEffect } from 'react'
import { markCommentsRead } from '@/app/actions/comments'

export default function MarkCommentsRead({ projectId }: { projectId: string }) {
  useEffect(() => {
    markCommentsRead(projectId)
  }, [projectId])
  return null
}
