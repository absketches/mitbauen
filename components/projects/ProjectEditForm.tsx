'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateProject, deleteProject, type UpdateProjectInput } from '@/app/actions/projects'

type Props = {
  projectId: string
  initial: UpdateProjectInput
}

export default function ProjectEditForm({ projectId, initial }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    title: initial.title,
    description: initial.description,
    why_it_matters: initial.why_it_matters,
    commitment_hours_pw: String(initial.commitment_hours_pw ?? ''),
    commitment_role: initial.commitment_role,
    commitment_description: initial.commitment_description,
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function validate() {
    const errors: Record<string, string> = {}
    if (form.title.trim().length < 5) errors.title = 'Title must be at least 5 characters.'
    if (form.title.trim().length > 120) errors.title = 'Title must be 120 characters or fewer.'
    if (form.description.trim().length < 30) errors.description = 'Description must be at least 30 characters.'
    if (form.commitment_role.trim().length < 3) errors.commitment_role = 'Role must be at least 3 characters.'
    if (form.commitment_role.trim().length > 80) errors.commitment_role = 'Role must be 80 characters or fewer.'
    return errors
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const errors = validate()
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }
    setFieldErrors({})
    setSaving(true)

    const result = await updateProject(projectId, {
      ...form,
      commitment_hours_pw: parseInt(form.commitment_hours_pw, 10),
    })

    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    router.push(`/projects/${projectId}`)
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteProject(projectId)
    // deleteProject redirects server-side on success; only returns on error
    setError(result.error)
    setDeleting(false)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-[clamp(2.75rem,7vw,4.5rem)] sm:px-6">
      <Link
        href={`/projects/${projectId}`}
        className="mb-8 inline-flex items-center rounded-full border border-black/10 bg-white/85 px-4 py-2 text-sm text-black/58 shadow-[0_10px_28px_rgba(0,0,0,0.04)] hover:bg-white hover:text-black"
      >
        ← Back to project
      </Link>

      <div className="mb-8">
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">Edit</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-black">Edit your project</h1>
        <p className="mt-2 text-sm text-black/45">Roles cannot be edited after posting.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* The idea */}
        <section className="rounded-[2rem] border border-black/10 bg-white/92 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.05)] sm:p-8">
          <p className="mb-6 text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">The idea</p>
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black/72">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={e => updateField('title', e.target.value)}
                className={`w-full rounded-[1.2rem] border bg-white px-4 py-3 text-black placeholder:text-black/34 focus:outline-none focus:ring-2 focus:ring-black ${fieldErrors.title ? 'border-red-400' : 'border-black/12'}`}
              />
              {fieldErrors.title && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.title}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-black/72">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={6}
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                className={`w-full rounded-[1.2rem] border bg-white px-4 py-3 text-black placeholder:text-black/34 focus:outline-none focus:ring-2 focus:ring-black ${fieldErrors.description ? 'border-red-400' : 'border-black/12'}`}
              />
              {fieldErrors.description && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.description}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-black/72">Why does this matter?</label>
              <textarea
                rows={4}
                value={form.why_it_matters}
                onChange={e => updateField('why_it_matters', e.target.value)}
                className="w-full rounded-[1.2rem] border border-black/12 bg-white px-4 py-3 text-black placeholder:text-black/34 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
        </section>

        {/* Commitment */}
        <section className="rounded-[2rem] border border-black/10 bg-white/92 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.05)] sm:p-8">
          <p className="mb-6 text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">Your commitment</p>
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-[0.48fr_1fr]">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-black/72">
                  Hours per week <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={80}
                  value={form.commitment_hours_pw}
                  onChange={e => updateField('commitment_hours_pw', e.target.value)}
                  className="w-full rounded-[1.2rem] border border-black/12 bg-white px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-black/72">
                  Your role <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.commitment_role}
                  onChange={e => updateField('commitment_role', e.target.value)}
                  className={`w-full rounded-[1.2rem] border bg-white px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-black ${fieldErrors.commitment_role ? 'border-red-400' : 'border-black/12'}`}
                />
                {fieldErrors.commitment_role && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.commitment_role}</p>}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black/72">What you are bringing</label>
              <textarea
                rows={4}
                value={form.commitment_description}
                onChange={e => updateField('commitment_description', e.target.value)}
                className="w-full rounded-[1.2rem] border border-black/12 bg-white px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-black bg-black px-6 py-3 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-black/85 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center justify-center rounded-full border border-black/12 bg-white px-6 py-3 text-sm font-medium text-black/64 hover:bg-black/[0.03]"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* Delete zone */}
      <div className="mt-10 rounded-[2rem] border border-red-200/70 bg-red-50/40 p-6">
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-red-400">Danger zone</p>
        <p className="mt-2 text-sm text-black/58">
          Deleting this project is permanent. All roles, applications, messages, and comments will be removed.
        </p>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="mt-4 rounded-full border border-red-300 bg-white px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete project
          </button>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-red-600">Are you sure? This cannot be undone.</p>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-full border border-red-500 bg-red-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-full border border-black/12 bg-white px-5 py-2.5 text-sm font-medium text-black/60 hover:bg-black/[0.03]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
