'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleVote } from '@/app/actions/votes'

type Props = {
  projectId: string
  initialCount: number
  initialHasVoted: boolean
  isAuthenticated: boolean
}

export default function VoteButton({ projectId, initialCount, initialHasVoted, isAuthenticated }: Props) {
  const router = useRouter()
  const [hasVoted, setHasVoted] = useState(initialHasVoted)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!isAuthenticated || loading) return
    setLoading(true)
    // Optimistic update
    setHasVoted(prev => !prev)
    setCount(prev => hasVoted ? prev - 1 : prev + 1)
    await toggleVote(projectId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={!isAuthenticated || loading}
      title={!isAuthenticated ? 'Sign in to vote' : hasVoted ? 'Remove vote' : 'Upvote'}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors disabled:cursor-default ${
        hasVoted
          ? 'border-black bg-black text-white'
          : 'border-black/10 bg-white/85 text-black/52 hover:border-black/20 hover:text-black'
      } ${!isAuthenticated ? 'opacity-60' : ''}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
      {count}
    </button>
  )
}
