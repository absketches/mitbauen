import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: { id: 'new-project' }, error: null }),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'new-project' }, error: null }),
    })),
  })),
}))

const { default: ProjectForm } = await import('@/components/projects/ProjectForm')

describe('ProjectForm validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the form', () => {
    render(<ProjectForm />)
    expect(screen.getByRole('heading', { name: 'Post your idea' })).toBeInTheDocument()
  })

  it('shows error when title is too short', async () => {
    render(<ProjectForm />)
    const titleInput = screen.getByPlaceholderText(/A platform for local food/)
    await userEvent.type(titleInput, 'Hi')
    fireEvent.submit(screen.getByRole('button', { name: /Post your idea/ }))
    expect(await screen.findByText(/Title must be at least 5 characters/)).toBeInTheDocument()
  })

  it('shows error when title is too long', async () => {
    render(<ProjectForm />)
    const titleInput = screen.getByPlaceholderText(/A platform for local food/)
    await userEvent.type(titleInput, 'A'.repeat(121))
    fireEvent.submit(screen.getByRole('button', { name: /Post your idea/ }))
    expect(await screen.findByText(/Title must be 120 characters or fewer/)).toBeInTheDocument()
  })

  it('shows error when description is too short', async () => {
    render(<ProjectForm />)
    await userEvent.type(screen.getByPlaceholderText(/A platform for local food/), 'Valid title here')
    await userEvent.type(screen.getByPlaceholderText(/What is this project/), 'Too short')
    fireEvent.submit(screen.getByRole('button', { name: /Post your idea/ }))
    expect(await screen.findByText(/Description must be at least 30 characters/)).toBeInTheDocument()
  })

  it('shows error when commitment role is too short', async () => {
    render(<ProjectForm />)
    await userEvent.type(screen.getByPlaceholderText(/A platform for local food/), 'Valid title here')
    await userEvent.type(screen.getByPlaceholderText(/What is this project/), 'A'.repeat(30))
    await userEvent.type(screen.getByPlaceholderText(/Backend developer, Product designer/), 'AB')
    fireEvent.submit(screen.getByRole('button', { name: /Post your idea/ }))
    expect(await screen.findByText(/Role must be at least 3 characters/)).toBeInTheDocument()
  })

  it('shows error when role title is too short', async () => {
    render(<ProjectForm />)
    await userEvent.type(screen.getByPlaceholderText(/A platform for local food/), 'Valid title here')
    await userEvent.type(screen.getByPlaceholderText(/What is this project/), 'A'.repeat(30))
    await userEvent.type(screen.getByPlaceholderText(/Backend developer, Product designer/), 'Valid role')
    await userEvent.type(screen.getByPlaceholderText(/e.g. Frontend developer/), 'AB')
    fireEvent.submit(screen.getByRole('button', { name: /Post your idea/ }))
    expect(await screen.findByText(/Role title must be at least 3 characters/)).toBeInTheDocument()
  })

  it('does not submit if validation fails', async () => {
    const { createClient } = await import('@/lib/supabase')
    render(<ProjectForm />)
    await userEvent.type(screen.getByPlaceholderText(/A platform for local food/), 'Hi') // too short
    fireEvent.submit(screen.getByRole('button', { name: /Post your idea/ }))
    // createClient().from().insert should not be called
    expect(createClient().from).not.toHaveBeenCalled()
  })

  it('has a Cancel link pointing to /projects', () => {
    render(<ProjectForm />)
    const cancelLink = screen.getByRole('link', { name: /Cancel/ })
    expect(cancelLink).toHaveAttribute('href', '/projects')
  })
})
