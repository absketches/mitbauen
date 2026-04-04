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
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto py-12 px-4 space-y-10">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Post your idea</h1>
        <p className="text-gray-500 mt-2">Tell people what you&apos;re building and what you&apos;re putting in.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* The idea */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2">
          The idea
        </h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. A platform for local food producers to sell directly"
            value={form.title}
            onChange={e => updateForm('title', e.target.value)}
            className={`w-full border rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 ${fieldErrors.title ? 'border-red-400' : 'border-gray-200'}`}
          />
          {fieldErrors.title && <p className="text-xs text-red-500 mt-1">{fieldErrors.title}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={6}
            placeholder="What is this project? How does it work?"
            value={form.description}
            onChange={e => updateForm('description', e.target.value)}
            className={`w-full border rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 ${fieldErrors.description ? 'border-red-400' : 'border-gray-200'}`}
          />
          {fieldErrors.description && <p className="text-xs text-red-500 mt-1">{fieldErrors.description}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Why does this matter?
          </label>
          <textarea
            rows={4}
            placeholder="What problem does this solve? Who benefits?"
            value={form.why_it_matters}
            onChange={e => updateForm('why_it_matters', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </section>

      {/* Commitment signal */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2">
            Your commitment
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            This is the most important part. Show people you are serious.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
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
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your role in this project <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Backend developer, Product designer, Business lead"
            value={form.commitment_role}
            onChange={e => updateForm('commitment_role', e.target.value)}
            className={`w-full border rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 ${fieldErrors.commitment_role ? 'border-red-400' : 'border-gray-200'}`}
          />
          {fieldErrors.commitment_role && <p className="text-xs text-red-500 mt-1">{fieldErrors.commitment_role}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What you are bringing
          </label>
          <textarea
            rows={4}
            placeholder="e.g. I will handle all backend architecture, database design and API development"
            value={form.commitment_description}
            onChange={e => updateForm('commitment_description', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </section>

      {/* Roles needed */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2">
            Roles needed
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Who do you need to build this?
          </p>
        </div>
        {roles.map((role, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Role {index + 1}</span>
              {roles.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRole(index)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. Frontend developer"
              value={role.title}
              onChange={e => updateRole(index, 'title', e.target.value)}
              className={`w-full border rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 ${fieldErrors[`role_${index}_title`] ? 'border-red-400' : 'border-gray-200'}`}
            />
            {fieldErrors[`role_${index}_title`] && <p className="text-xs text-red-500 mt-1">{fieldErrors[`role_${index}_title`]}</p>}
            <input
              type="text"
              placeholder="Skills needed (comma separated): e.g. React, TypeScript, CSS"
              onChange={e => updateRoleSkills(index, e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <textarea
              rows={2}
              placeholder="What will this person work on?"
              value={role.description}
              onChange={e => updateRole(index, 'description', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addRole}
          className="text-sm text-gray-600 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
        >
          + Add another role
        </button>
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Posting...' : 'Post your idea'}
        </button>
        <Link
          href="/projects"
          className="px-6 py-3 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-center"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
