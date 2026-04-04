import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockSignOut = vi.hoisted(() => vi.fn())

vi.mock('@/app/actions/auth', () => ({ signOut: mockSignOut }))
vi.mock('next/navigation',    () => ({ useRouter: () => ({}) }))

const { default: UserMenu } = await import('@/components/UserMenu')

const baseProps = { name: 'Alice Smith', email: 'alice@example.com', avatarUrl: null }

describe('UserMenu', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders avatar button with initials when no avatarUrl', () => {
    render(<UserMenu {...baseProps} />)
    // Initials derived from first letters of each word in name
    expect(screen.getByText('AS')).toBeInTheDocument()
  })

  it('renders avatar image when avatarUrl is provided', () => {
    render(<UserMenu {...baseProps} avatarUrl="https://example.com/avatar.png" />)
    expect(screen.getByRole('img', { name: /alice smith/i })).toBeInTheDocument()
  })

  it('opens dropdown on avatar click', async () => {
    render(<UserMenu {...baseProps} />)
    await userEvent.click(screen.getByRole('button', { name: /user menu/i }))
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('shows Profile, Messages, and Sign out links in dropdown', async () => {
    render(<UserMenu {...baseProps} />)
    await userEvent.click(screen.getByRole('button', { name: /user menu/i }))
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /messages/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('Messages link points to /messages', async () => {
    render(<UserMenu {...baseProps} />)
    await userEvent.click(screen.getByRole('button', { name: /user menu/i }))
    expect(screen.getByRole('link', { name: /messages/i })).toHaveAttribute('href', '/messages')
  })

  it('closes dropdown when clicking outside', async () => {
    render(
      <div>
        <UserMenu {...baseProps} />
        <button>Outside</button>
      </div>
    )
    await userEvent.click(screen.getByRole('button', { name: /user menu/i }))
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('button', { name: /outside/i }))
    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument()
  })

  it('uses "?" as initial when name and email are null', () => {
    render(<UserMenu name={null} email={null} avatarUrl={null} />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })
})
