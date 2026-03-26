/**
 * Browser Supabase client — safe for use in Client Components.
 *
 * Uses NEXT_PUBLIC_ env vars so the browser can read them.
 * The anon key is designed for browser use — it is safe to expose.
 * Row-level security (RLS) policies enforce data access control server-side.
 *
 * Call createClient() inside components rather than at module level so
 * the client is not shared across server-rendered requests.
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
