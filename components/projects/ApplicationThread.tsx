'use client'

import { useState, useEffect, useRef } from 'react'
import { sendMessage, markThreadRead } from '@/app/actions/messages'

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
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-open and scroll into view when URL hash targets this thread
  useEffect(() => {
    if (window.location.hash === `#thread-${applicationId}`) {
      setOpen(true)
      // Small delay so the thread has time to render before scrolling
      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [applicationId])

  // Mark as read when thread is opened
  useEffect(() => {
    if (open && unreadCount > 0) {
      markThreadRead(applicationId)
    }
  }, [open, applicationId, unreadCount])

  // Scroll to bottom of messages when opened or new messages arrive
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [open, messages.length])

  return (
    <div ref={containerRef} id={`thread-${applicationId}`} className="mt-3 border-t border-gray-100 pt-3 scroll-mt-20">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800 transition-colors"
      >
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {open ? 'Hide thread' : 'Messages'}
        {!open && unreadCount > 0 && (
          <span className="bg-gray-900 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
            {unreadCount}
          </span>
        )}
        {!open && messages.length > 0 && unreadCount === 0 && (
          <span className="text-gray-400">({messages.length})</span>
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {messages.length === 0 ? (
            <p className="text-xs text-gray-400">No messages yet. Start the conversation.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {messages.map(msg => {
                const isMe = msg.sender_id === currentUserId
                const initials = msg.users?.name?.[0]?.toUpperCase() ?? '?'
                return (
                  <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0 overflow-hidden flex items-center justify-center text-xs font-medium text-gray-600">
                      {msg.users?.avatar_url
                        ? <img src={msg.users.avatar_url} alt="" className="w-full h-full object-cover" />
                        : initials
                      }
                    </div>
                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`px-3 py-2 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-gray-900 text-white rounded-tr-sm'
                          : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                      }`}>
                        {msg.body}
                      </div>
                      <span className="text-xs text-gray-400 mt-0.5 px-1">
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
            className="flex gap-2"
          >
            <input
              name="body"
              required
              placeholder="Write a message..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              type="submit"
              className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors shrink-0"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
