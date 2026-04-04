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
      <span className="shrink-0 text-xs text-green-600 border border-green-200 bg-green-50 px-3 py-1.5 rounded-lg">
        Applied
      </span>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
      >
        Apply
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Modal — bottom sheet on mobile, centered on desktop */}
          <div className="fixed z-50 inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl">
              {/* Handle (mobile) */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>

              <div className="px-6 pt-4 pb-6">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Apply for {role.title}</h2>
                    {role.description && (
                      <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="text-gray-400 hover:text-gray-600 ml-4 mt-0.5"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Why do you want to join? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={3}
                      placeholder="What draws you to this project?"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      What do you bring? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="what_i_bring"
                      required
                      rows={3}
                      placeholder="Your relevant skills, experience, or what you'll contribute"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                      {error}
                    </p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Submitting...' : 'Submit application'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
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
