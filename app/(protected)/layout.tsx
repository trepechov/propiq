/**
 * Protected route group layout — server-side auth guard.
 *
 * Belt-and-suspenders double guard alongside middleware.ts:
 * - Middleware handles the 90% case (fast redirect at the edge)
 * - This layout catches edge cases where middleware cookies arrive stale
 *   or a direct Server Component render bypasses the middleware path
 *
 * This is a Server Component (no 'use client') — it can call cookies() and
 * await the Supabase server client directly without a client boundary.
 */

import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'

interface ProtectedLayoutProps {
  children: React.ReactNode
}

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <>{children}</>
}
