'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/app/actions/users'

type Props = {
  bio: string | null
  skills: string[] | null
}

export default function ProfileEditForm({ bio, skills }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setSaving(true)
    setError(null)
    const result = await updateProfile(formData)
    setSaving(false)
    if ('error' in result) {
      setError(result.error)
    } else {
      setEditing(false)
      router.refresh()
    }
  }

  if (!editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">
            About
          </h2>
          <button
            onClick={() => setEditing(true)}
            className="rounded-full border border-black/12 bg-white px-4 py-1.5 text-xs font-medium text-black/60 hover:bg-black/[0.03] hover:text-black"
          >
            Edit profile
          </button>
        </div>

        <div>
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.26em] text-black/38">Bio</p>
          <p className="mt-2 text-sm leading-7 text-black/65">
            {bio?.trim() || <span className="text-black/32 italic">No bio added yet.</span>}
          </p>
        </div>

        <div>
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.26em] text-black/38">Skills</p>
          {skills?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.map(skill => (
                <span key={skill} className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs font-medium text-black/62">
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm italic text-black/32">No skills listed yet.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">
          Edit Profile
        </h2>
      </div>

      <div>
        <label htmlFor="bio" className="text-[0.68rem] font-medium uppercase tracking-[0.26em] text-black/38">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          defaultValue={bio ?? ''}
          placeholder="Tell others who you are and what you're working toward..."
          className="mt-2 w-full rounded-[1.2rem] border border-black/12 bg-white px-4 py-3 text-sm text-black placeholder:text-black/32 focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      <div>
        <label htmlFor="skills" className="text-[0.68rem] font-medium uppercase tracking-[0.26em] text-black/38">
          Skills
        </label>
        <input
          id="skills"
          name="skills"
          type="text"
          defaultValue={skills?.join(', ') ?? ''}
          placeholder="e.g. React, TypeScript, Product Design"
          className="mt-2 w-full rounded-full border border-black/12 bg-white px-4 py-2.5 text-sm text-black placeholder:text-black/32 focus:outline-none focus:ring-2 focus:ring-black"
        />
        <p className="mt-1.5 px-1 text-xs text-black/38">Comma-separated list</p>
      </div>

      {error && (
        <p className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full border border-black bg-black px-5 py-2.5 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-black/85 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setError(null) }}
          className="rounded-full border border-black/12 bg-white px-5 py-2.5 text-sm font-medium text-black/60 hover:bg-black/[0.03]"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
