'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createProject } from '@/app/actions/projects'

type Role = {
  title: string
  description: string
  skills_needed: string[]
}

export default function ProjectForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function validate() {
    const errors: Record<string, string> = {}

    if (form.title.trim().length < 5)
      errors.title = 'Title must be at least 5 characters.'
    if (form.title.trim().length > 120)
      errors.title = 'Title must be 120 characters or fewer.'

    if (form.description.trim().length < 30)
      errors.description = 'Description must be at least 30 characters.'

    if (form.commitment_role.trim().length < 3)
      errors.commitment_role = 'Role must be at least 3 characters.'
    if (form.commitment_role.trim().length > 80)
      errors.commitment_role = 'Role must be 80 characters or fewer.'

    roles.forEach((role, i) => {
      if (!role.title.trim()) {
        errors[`role_${i}_title`] = 'Role title is required.'
      } else if (role.title.trim().length < 3) {
        errors[`role_${i}_title`] = 'Role title must be at least 3 characters.'
      } else if (role.title.trim().length > 80) {
        errors[`role_${i}_title`] = 'Role title must be 80 characters or fewer.'
      }
    })

    return errors
  }

  const [form, setForm] = useState({
    title: '',
    description: '',
    why_it_matters: '',
    commitment_hours_pw: '',
    commitment_role: '',
    commitment_description: '',
  })

  const [roles, setRoles] = useState<Role[]>([
    { title: '', description: '', skills_needed: [] },
  ])

  function updateForm(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function updateRole(index: number, field: string, value: string) {
    setRoles(prev =>
      prev.map((role, i) =>
        i === index ? { ...role, [field]: value } : role
      )
    )
  }

  function updateRoleSkills(index: number, value: string) {
    const skills = value.split(',').map(s => s.trim()).filter(Boolean)
    setRoles(prev =>
      prev.map((role, i) =>
        i === index ? { ...role, skills_needed: skills } : role
      )
    )
  }

  function addRole() {
    setRoles(prev => [...prev, { title: '', description: '', skills_needed: [] }])
  }

  function removeRole(index: number) {
    setRoles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setLoading(true)

    const result = await createProject({
      ...form,
      commitment_hours_pw: parseInt(form.commitment_hours_pw, 10),
      roles,
    })

    if (result.error) {
      if (result.error === 'Not authenticated.') {
        router.push('/login')
      } else {
        setError(result.error)
      }
      setLoading(false)
      return
    }

    router.push(`/projects/${result.projectId}`)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-[clamp(2.75rem,7vw,4.5rem)] sm:px-6 lg:px-8">
      <div className="grid gap-[clamp(1.5rem,4vw,2.5rem)] lg:grid-cols-[minmax(17rem,0.78fr)_minmax(0,1.22fr)] lg:items-start">
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-[2rem] border border-black bg-black p-6 text-white shadow-[0_28px_90px_rgba(0,0,0,0.16)] sm:p-8">
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-white/48">
              New Project
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white">
              Post your idea
            </h1>
            <p className="mt-4 text-sm leading-7 text-white/68">
              Tell people what you&apos;re building and what you&apos;re putting in.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.4rem] border border-white/12 bg-white/6 p-4">
                <p className="text-[0.66rem] uppercase tracking-[0.28em] text-white/42">Signal</p>
                <p className="mt-2 text-lg font-medium text-white">Commitment matters most</p>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  People respond better when your time and role are concrete.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-white/12 bg-white/6 p-4">
                <p className="text-[0.66rem] uppercase tracking-[0.28em] text-white/42">Open roles</p>
                <p className="mt-2 text-lg font-medium text-white">{roles.length}</p>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  Add focused roles so people can immediately see where they fit.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/10 bg-white/92 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.05)]">
            <p className="text-[0.7rem] uppercase tracking-[0.32em] text-black/42">A strong post</p>
            <div className="mt-4 space-y-4 text-sm leading-7 text-black/58">
              <p>Be specific about the problem, the people it helps, and what already exists.</p>
              <p>Use the commitment section to show you are already investing real time.</p>
              <p>Describe roles in terms of work to be done, not just titles.</p>
            </div>
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="rounded-[2rem] border border-black/10 bg-white/92 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.05)] sm:p-8">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">
                  The idea
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">
                  Explain what you are building
                </h2>
              </div>
              <p className="text-sm text-black/45">
                Clear context makes good collaborators self-select.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-black/72">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A platform for local food producers to sell directly"
                  value={form.title}
                  onChange={e => updateForm('title', e.target.value)}
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
                  placeholder="What is this project? How does it work?"
                  value={form.description}
                  onChange={e => updateForm('description', e.target.value)}
                  className={`w-full rounded-[1.2rem] border bg-white px-4 py-3 text-black placeholder:text-black/34 focus:outline-none focus:ring-2 focus:ring-black ${fieldErrors.description ? 'border-red-400' : 'border-black/12'}`}
                />
                {fieldErrors.description && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.description}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-black/72">
                  Why does this matter?
                </label>
                <textarea
                  rows={4}
                  placeholder="What problem does this solve? Who benefits?"
                  value={form.why_it_matters}
                  onChange={e => updateForm('why_it_matters', e.target.value)}
                  className="w-full rounded-[1.2rem] border border-black/12 bg-white px-4 py-3 text-black placeholder:text-black/34 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-black/10 bg-white/92 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.05)] sm:p-8">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">
                  Your commitment
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">
                  Show people you are serious
                </h2>
              </div>
              <p className="text-sm text-black/45">
                This is the most important part.
              </p>
            </div>

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
                    placeholder="e.g. 10"
                    value={form.commitment_hours_pw}
                    onChange={e => updateForm('commitment_hours_pw', e.target.value)}
                    className="w-full rounded-[1.2rem] border border-black/12 bg-white px-4 py-3 text-black placeholder:text-black/34 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-black/72">
                    Your role in this project <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Backend developer, Product designer, Business lead"
                    value={form.commitment_role}
                    onChange={e => updateForm('commitment_role', e.target.value)}
                    className={`w-full rounded-[1.2rem] border bg-white px-4 py-3 text-black placeholder:text-black/34 focus:outline-none focus:ring-2 focus:ring-black ${fieldErrors.commitment_role ? 'border-red-400' : 'border-black/12'}`}
                  />
                  {fieldErrors.commitment_role && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.commitment_role}</p>}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-black/72">
                  What you are bringing
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g. I will handle all backend architecture, database design and API development"
                  value={form.commitment_description}
                  onChange={e => updateForm('commitment_description', e.target.value)}
                  className="w-full rounded-[1.2rem] border border-black/12 bg-white px-4 py-3 text-black placeholder:text-black/34 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-black/10 bg-white/92 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.05)] sm:p-8">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/42">
                  Roles needed
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">
                  Who do you need to build this?
                </h2>
              </div>
              <div className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2 text-sm text-black/48">
                {roles.length} {roles.length === 1 ? 'role' : 'roles'}
              </div>
            </div>

            <div className="space-y-4">
              {roles.map((role, index) => (
                <div key={index} className="rounded-[1.5rem] border border-black/8 bg-black/[0.025] p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium uppercase tracking-[0.22em] text-black/44">
                      Role {index + 1}
                    </span>
                    {roles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRole(index)}
                        className="text-sm text-black/42 hover:text-black"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <input
                        type="text"
                        placeholder="e.g. Frontend developer"
                        value={role.title}
                        onChange={e => updateRole(index, 'title', e.target.value)}
                        className={`w-full rounded-[1.1rem] border bg-white px-4 py-3 text-black placeholder:text-black/34 focus:outline-none focus:ring-2 focus:ring-black ${fieldErrors[`role_${index}_title`] ? 'border-red-400' : 'border-black/12'}`}
                      />
                      {fieldErrors[`role_${index}_title`] && <p className="mt-1.5 text-xs text-red-500">{fieldErrors[`role_${index}_title`]}</p>}
                    </div>

                    <input
                      type="text"
                      placeholder="Skills needed (comma separated): e.g. React, TypeScript, CSS"
                      onChange={e => updateRoleSkills(index, e.target.value)}
                      className="w-full rounded-[1.1rem] border border-black/12 bg-white px-4 py-3 text-black placeholder:text-black/34 focus:outline-none focus:ring-2 focus:ring-black"
                    />

                    <textarea
                      rows={2}
                      placeholder="What will this person work on?"
                      value={role.description}
                      onChange={e => updateRole(index, 'description', e.target.value)}
                      className="w-full rounded-[1.1rem] border border-black/12 bg-white px-4 py-3 text-black placeholder:text-black/34 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addRole}
                className="inline-flex items-center rounded-full border border-black/12 bg-white px-4 py-2.5 text-sm font-medium text-black/64 hover:bg-black/[0.03]"
              >
                + Add another role
              </button>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-black bg-black px-6 py-3 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-black/85 disabled:opacity-50"
            >
              {loading ? 'Posting...' : 'Post your idea'}
            </button>
            <Link
              href="/projects"
              className="inline-flex items-center justify-center rounded-full border border-black/12 bg-white px-6 py-3 text-center text-sm font-medium text-black/64 hover:bg-black/[0.03]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
