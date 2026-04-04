'use client'

import { useState } from 'react'
import { applyToRole } from '@/app/actions/applications'

type Role = {
  id: string
  title: string
  description: string | null
  skills_needed: string[] | null
}

type Props = {
  role: Role
  projectId: string
  alreadyApplied: boolean
}

export default function ApplyModal({ role, projectId, alreadyApplied }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(alreadyApplied)
  const skills = role.skills_needed ?? []

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await applyToRole(projectId, role.id, formData)

    if (result && 'error' in result && result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSubmitted(true)
      setOpen(false)
    }
  }

  if (submitted) {
    return (
      <span className="shrink-0 rounded-full border border-black bg-black px-3.5 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white">
        Applied
      </span>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-full border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-black/85"
      >
        Apply
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
            onClick={() => setOpen(false)}
          />

          {/* Modal — bottom sheet on mobile, centered on desktop */}
          <div className="fixed z-50 inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
            <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] border border-black/10 bg-[rgba(250,250,247,0.98)] shadow-[0_30px_100px_rgba(0,0,0,0.18)] sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-[2rem]">
              {/* Handle (mobile) */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-black/14" />
              </div>

              <div className="px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-8 sm:pb-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">
                      Application
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">
                      Apply for {role.title}
                    </h2>
                    {role.description && (
                      <p className="mt-3 text-sm leading-7 text-black/56">{role.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-0.5 ml-4 rounded-full border border-black/10 bg-white/80 p-2 text-black/42 hover:bg-white hover:text-black"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_0.78fr]">
                  <div className="rounded-[1.45rem] border border-black/8 bg-white/84 p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.26em] text-black/38">What to include</p>
                    <p className="mt-3 text-sm leading-6 text-black/58">
                      Explain why this project matters to you and what you can contribute from day one.
                    </p>
                  </div>
                  <div className="rounded-[1.45rem] border border-black/8 bg-black/[0.025] p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.26em] text-black/38">Skills needed</p>
                    {skills.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {skills.map(skill => (
                          <span key={skill} className="rounded-full border border-black/10 bg-white/88 px-3 py-1 text-xs font-medium text-black/58">
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-black/48">Open to different backgrounds.</p>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-black/72">
                      Why do you want to join? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={4}
                      placeholder="What draws you to this project?"
                      className="w-full rounded-[1.2rem] border border-black/12 bg-white px-4 py-3 text-sm text-black placeholder:text-black/34 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-black/72">
                      What do you bring? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="what_i_bring"
                      required
                      rows={4}
                      placeholder="Your relevant skills, experience, or what you'll contribute"
                      className="w-full rounded-[1.2rem] border border-black/12 bg-white px-4 py-3 text-sm text-black placeholder:text-black/34 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  {error && (
                    <p className="rounded-[1.1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </p>
                  )}

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 rounded-full border border-black bg-black py-3 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-black/85 disabled:opacity-50"
                    >
                      {loading ? 'Submitting...' : 'Submit application'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-full border border-black/12 bg-white px-5 py-3 text-sm font-medium text-black/62 hover:bg-black/[0.03]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
