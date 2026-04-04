import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockSignInWithOAuth = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    auth: { signInWithOAuth: mockSignInWithOAuth },
  })),
}))

const { default: LoginPage } = await import('@/app/login/page')

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignInWithOAuth.mockResolvedValue({})
  })

  it('renders both provider buttons', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('starts GitHub OAuth with forced login prompt', async () => {
    render(<LoginPage />)

    await userEvent.click(screen.getByRole('button', { name: /continue with github/i }))

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'login',
        },
      },
    })
  })

  it('starts Google OAuth with account chooser prompt', async () => {
    render(<LoginPage />)

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })
  })
})
