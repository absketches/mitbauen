import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockApplyToRole = vi.fn()

vi.mock('@/app/actions/applications', () => ({
  applyToRole: mockApplyToRole,
}))

const { default: ApplyModal } = await import('@/components/projects/ApplyModal')

const baseRole = {
  id: 'role-1',
  title: 'Frontend Developer',
  description: 'Build the UI',
  skills_needed: ['React', 'TypeScript'],
}

describe('ApplyModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Apply button when not already applied', () => {
    render(<ApplyModal role={baseRole} projectId="proj-1" alreadyApplied={false} />)
    expect(screen.getByRole('button', { name: /Apply/ })).toBeInTheDocument()
  })

  it('renders Applied badge when already applied', () => {
    render(<ApplyModal role={baseRole} projectId="proj-1" alreadyApplied={true} />)
    expect(screen.getByText('Applied')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Apply$/ })).not.toBeInTheDocument()
  })

  it('opens modal on Apply button click', async () => {
    render(<ApplyModal role={baseRole} projectId="proj-1" alreadyApplied={false} />)
    await userEvent.click(screen.getByRole('button', { name: /Apply/ }))
    expect(screen.getByText(/Apply for Frontend Developer/)).toBeInTheDocument()
  })

  it('closes modal on Cancel click', async () => {
    render(<ApplyModal role={baseRole} projectId="proj-1" alreadyApplied={false} />)
    await userEvent.click(screen.getByRole('button', { name: /Apply/ }))
    await userEvent.click(screen.getByRole('button', { name: /Cancel/ }))
    expect(screen.queryByText(/Apply for Frontend Developer/)).not.toBeInTheDocument()
  })

  it('closes modal on backdrop click', async () => {
    render(<ApplyModal role={baseRole} projectId="proj-1" alreadyApplied={false} />)
    await userEvent.click(screen.getByRole('button', { name: /Apply/ }))
    // Click the backdrop (the fixed overlay div)
    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/40')
    expect(backdrop).toBeTruthy()
    fireEvent.click(backdrop!)
    expect(screen.queryByText(/Apply for Frontend Developer/)).not.toBeInTheDocument()
  })

  it('shows error message on failed submission', async () => {
    mockApplyToRole.mockResolvedValue({ error: 'You have already applied for this role.' })
    render(<ApplyModal role={baseRole} projectId="proj-1" alreadyApplied={false} />)
    await userEvent.click(screen.getByRole('button', { name: /Apply/ }))
    await userEvent.type(screen.getByPlaceholderText(/What draws you/), 'I love this project')
    await userEvent.type(screen.getByPlaceholderText(/Your relevant skills/), 'I bring React skills')
    await userEvent.click(screen.getByRole('button', { name: /Submit application/ }))
    expect(await screen.findByText(/already applied/)).toBeInTheDocument()
  })

  it('shows Applied badge after successful submission', async () => {
    mockApplyToRole.mockResolvedValue({ success: true })
    render(<ApplyModal role={baseRole} projectId="proj-1" alreadyApplied={false} />)
    await userEvent.click(screen.getByRole('button', { name: /Apply/ }))
    await userEvent.type(screen.getByPlaceholderText(/What draws you/), 'I love this project')
    await userEvent.type(screen.getByPlaceholderText(/Your relevant skills/), 'I bring React skills')
    await userEvent.click(screen.getByRole('button', { name: /Submit application/ }))
    expect(await screen.findByText('Applied')).toBeInTheDocument()
    // Modal should be closed
    expect(screen.queryByText(/Apply for Frontend Developer/)).not.toBeInTheDocument()
  })
})
