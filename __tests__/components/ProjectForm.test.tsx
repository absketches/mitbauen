import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockCreateProject = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockRouterPush })),
}))

vi.mock('@/app/actions/projects', () => ({
  createProject: mockCreateProject,
}))

const { default: ProjectForm } = await import('@/components/projects/ProjectForm')

describe('ProjectForm validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateProject.mockResolvedValue({ success: true, projectId: 'new-project' })
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
    render(<ProjectForm />)
    await userEvent.type(screen.getByPlaceholderText(/A platform for local food/), 'Hi') // too short
    fireEvent.submit(screen.getByRole('button', { name: /Post your idea/ }))
    expect(mockCreateProject).not.toHaveBeenCalled()
  })

  it('has a Cancel link pointing to /projects', () => {
    render(<ProjectForm />)
    const cancelLink = screen.getByRole('link', { name: /Cancel/ })
    expect(cancelLink).toHaveAttribute('href', '/projects')
  })
})
