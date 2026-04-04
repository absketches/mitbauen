'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { sendMessage, markThreadRead } from '@/app/actions/messages'
import AvatarImage from '@/components/AvatarImage'

type Message = {
  id: string
  body: string
  created_at: string
  sender_id: string
  users: { name: string | null; avatar_url: string | null } | null
}

type Props = {
  applicationId: string
  projectId: string
  currentUserId: string
  messages: Message[]
  unreadCount: number
}

export default function ApplicationThread({
  applicationId,
  projectId,
  currentUserId,
  messages,
  unreadCount,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(
    () => typeof window !== 'undefined' && window.location.hash === `#thread-${applicationId}`
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll into view when URL hash targets this thread
  useEffect(() => {
    if (open && window.location.hash === `#thread-${applicationId}`) {
      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [applicationId, open])

  // Mark as read when thread is opened, then refresh so the navbar badge drops
  useEffect(() => {
    if (open && unreadCount > 0) {
      markThreadRead(applicationId).then(() => router.refresh())
    }
  }, [open, applicationId, unreadCount, router])

  // Scroll to bottom of messages when opened or new messages arrive
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [open, messages.length])

  return (
    <div
      ref={containerRef}
      id={`thread-${applicationId}`}
      className="mt-5 scroll-mt-24 rounded-[1.5rem] border border-black/8 bg-black/[0.025] p-4 sm:p-5"
    >
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/85 text-black/52">
            <svg className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
          <div>
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.24em] text-black/38">
              Conversation
            </p>
            <p className="text-sm font-medium text-black">
              {open ? 'Hide thread' : 'Messages'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!open && messages.length > 0 && unreadCount === 0 && (
            <span className="rounded-full border border-black/10 bg-white/90 px-3 py-1 text-xs text-black/44">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </span>
          )}
          {!open && unreadCount > 0 && (
            <span className="rounded-full bg-black px-2.5 py-1 text-xs font-medium leading-none text-white">
              {unreadCount} new
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {messages.length === 0 ? (
            <div className="rounded-[1.2rem] border border-dashed border-black/12 bg-white/70 px-4 py-6 text-sm text-black/42">
              No messages yet. Start the conversation.
            </div>
          ) : (
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {messages.map(msg => {
                const isMe = msg.sender_id === currentUserId
                const initials = msg.users?.name?.[0]?.toUpperCase() ?? '?'
                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/[0.08] text-xs font-medium text-black/56">
                      {msg.users?.avatar_url
                        ? <AvatarImage src={msg.users.avatar_url} alt="" size={28} className="h-full w-full object-cover" />
                        : initials
                      }
                    </div>
                    <div className={`flex max-w-[80%] flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`rounded-[1.35rem] px-4 py-3 text-sm leading-6 ${
                        isMe
                          ? 'rounded-tr-sm bg-black text-white'
                          : 'rounded-tl-sm border border-black/8 bg-white text-black/72'
                      }`}>
                        {msg.body}
                      </div>
                      <span className="mt-1 px-1 text-xs text-black/35">
                        {new Date(msg.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          )}

          <form
            action={sendMessage.bind(null, applicationId, projectId) as (formData: FormData) => void}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              name="body"
              required
              placeholder="Write a message..."
              className="min-h-11 flex-1 rounded-full border border-black/12 bg-white px-4 py-2.5 text-sm text-black placeholder:text-black/34 focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full border border-black bg-black px-5 py-2.5 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-black/85"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
