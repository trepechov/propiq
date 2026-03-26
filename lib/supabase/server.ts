/**
 * Server Supabase client — for Route Handlers, Server Components, and middleware.
 *
 * Reads the session from HTTP cookies so that:
 * - RLS policies see the authenticated user's JWT
 * - Session tokens are refreshed transparently via setAll()
 *
 * IMPORTANT: The setAll() catch block is intentional. When this client is used
 * in a Server Component (not a Route Handler or Server Action), Next.js does not
 * allow cookies to be set. The error is silently ignored because read-only
 * contexts only need getAll() — session refresh happens in the middleware instead.
 *
 * See: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — cookies are read-only here.
            // Session refresh is handled by middleware (Phase 2).
          }
        },
      },
    }
  )
}
