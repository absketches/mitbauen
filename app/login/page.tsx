'use client'

import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const supabase = createClient()

  async function signInWithProvider(provider: 'github' | 'google') {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: provider === 'github'
          ? {
              // Force GitHub to show the login screen every time.
              // Without this, GitHub reuses its own browser session and silently
              // re-authorizes the last account — making it impossible to switch
              // between GitHub accounts.
              prompt: 'login',
            }
          : {
              // Google defaults to the last active session more aggressively,
              // so explicitly present the account chooser.
              prompt: 'select_account',
            },
      },
    })
  }

  return (
    <div className="flex min-h-[100dvh] flex-1 items-center px-4 py-[clamp(2rem,7vw,5rem)] sm:px-6">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-black/10 bg-white/85 shadow-[0_32px_120px_rgba(0,0,0,0.1)] md:grid-cols-[1.05fr_0.95fr]">
        <div className="bg-black px-6 py-10 text-white sm:px-8 sm:py-12 lg:px-10">
          <p className="text-[0.72rem] uppercase tracking-[0.34em] text-white/45">Welcome Back</p>
          <h1 className="mt-5 max-w-md text-[clamp(2.8rem,8vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.045em]">
            Find your crew. Build something real.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-white/68">
            Sign in with GitHub or Google to browse projects, apply for open roles, and manage
            conversations around the things you&apos;re actually willing to build.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            <div className="rounded-[1.4rem] border border-white/12 bg-white/5 px-4 py-4">
              <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/40">Signal</p>
              <p className="mt-2 text-sm text-white/78">Commitment is visible before hype.</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/12 bg-white/5 px-4 py-4">
              <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/40">Privacy</p>
              <p className="mt-2 text-sm text-white/78">Applications and threads stay contextual.</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/12 bg-white/5 px-4 py-4">
              <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/40">Focus</p>
              <p className="mt-2 text-sm text-white/78">Black and white, all signal, no noise.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center px-6 py-10 sm:px-8 sm:py-12 lg:px-10">
          <div className="w-full">
            <p className="text-[0.72rem] uppercase tracking-[0.34em] text-black/45">Authentication</p>
            <h2 className="mt-4 text-[clamp(2rem,5vw,2.5rem)] font-semibold tracking-[-0.04em] text-black">
              Continue with GitHub or Google
            </h2>
            <p className="mt-3 text-sm leading-6 text-black/58">
              Pick the provider you already use. Both routes land in the same Mitbauen account flow.
            </p>

            <div className="mt-8 space-y-3">
              <button
                onClick={() => signInWithProvider('github')}
                className="flex w-full items-center justify-center gap-3 rounded-full border border-black bg-black px-4 py-3.5 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-black/85"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Continue with GitHub
              </button>

              <button
                onClick={() => signInWithProvider('google')}
                className="flex w-full items-center justify-center gap-3 rounded-full border border-black/12 bg-white px-4 py-3.5 text-sm font-medium text-black hover:-translate-y-0.5 hover:bg-black/[0.03]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21.805 12.23c0-.79-.064-1.37-.202-1.97H12.2v3.675h5.52c-.111.913-.71 2.288-2.04 3.212l-.019.123 3.03 2.3.21.02c1.93-1.747 3.044-4.32 3.044-7.36Z" fill="currentColor" />
                  <path d="M12.2 21.9c2.704 0 4.975-.875 6.633-2.31l-3.162-2.443c-.847.577-1.985.98-3.47.98-2.648 0-4.892-1.748-5.695-4.168l-.118.01-3.15 2.39-.04.11C4.846 19.67 8.237 21.9 12.2 21.9Z" fill="currentColor" />
                  <path d="M6.506 13.96c-.212-.624-.333-1.29-.333-1.978 0-.688.121-1.354.323-1.978l-.006-.132-3.189-2.428-.104.048A9.8 9.8 0 0 0 2.1 11.98c0 1.584.388 3.08 1.098 4.488l3.308-2.508Z" fill="currentColor" />
                  <path d="M12.2 5.833c1.873 0 3.136.8 3.856 1.464l2.815-2.685C17.166 3.028 14.904 2.1 12.2 2.1c-3.963 0-7.354 2.23-9.002 5.47l3.299 2.54c.812-2.42 3.057-4.277 5.704-4.277Z" fill="currentColor" />
                </svg>
                Continue with Google
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
