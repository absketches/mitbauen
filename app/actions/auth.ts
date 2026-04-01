'use server'

import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signOut() {
  const supabase = await createClient()

  // Tell Supabase to revoke the token server-side
  await supabase.auth.signOut()

  // applyServerStorage (which clears the cookies) is triggered inside
  // onAuthStateChange — an async callback that is NOT awaited by signOut().
  // By the time redirect() fires the response, the cookies haven't been
  // touched yet. Explicitly delete all sb-* cookies so the browser receives
  // them cleared in the same response as the redirect.
  const cookieStore = await cookies()
  cookieStore.getAll()
    .filter(c => c.name.startsWith('sb-'))
    .forEach(c => cookieStore.delete(c.name))

  redirect('/login')
}
