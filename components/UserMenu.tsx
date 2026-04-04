'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import AvatarImage from './AvatarImage'

type Props = {
  name: string | null
  email: string | null
  avatarUrl: string | null
}

export default function UserMenu({ name, email, avatarUrl }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : email?.[0]?.toUpperCase() ?? '?'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white/78 hover:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
        aria-label="User menu"
      >
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={name ?? 'User'} size={44} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs font-medium text-black/68">{initials}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-[min(16rem,calc(100vw-1rem))] overflow-hidden rounded-[1.5rem] border border-black/10 bg-[rgba(250,250,247,0.98)] py-1.5 shadow-[0_24px_70px_rgba(0,0,0,0.12)]">
          <div className="border-b border-black/8 px-4 py-4">
            <p className="text-[0.66rem] font-medium uppercase tracking-[0.28em] text-black/36">
              Account
            </p>
            {name && <p className="mt-2 truncate text-sm font-semibold text-black">{name}</p>}
            {email && <p className="mt-1 truncate text-xs text-black/48">{email}</p>}
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-black/68 hover:bg-black/[0.03]"
          >
            Profile
          </Link>
          <Link
            href="/messages"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-black/68 hover:bg-black/[0.03]"
          >
            Messages
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full px-4 py-2.5 text-left text-sm text-black/68 hover:bg-black/[0.03]"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
