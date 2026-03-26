/**
 * Next.js middleware — session refresh and route protection.
 *
 * Runs on every matched request. Two responsibilities:
 * 1. Refresh the Supabase session token (via getUser()) before it reaches
 *    Route Handlers or Server Components. Skipping this causes silent auth
 *    failures once a token expires.
 * 2. Redirect unauthenticated users away from protected routes.
 *
 * Protected routes: /neighborhoods, /projects, /search
 * Public routes:    /login, /register, /api/*
 *
 * The response object is threaded through cookie callbacks so that any
 * refreshed session cookies are written back to the browser.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/neighborhoods', '/projects', '/search']

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Write refreshed cookies back to both the request and response.
          // Both must be updated so subsequent middleware/handlers see the new token.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() must be called on every request to refresh the session.
  // Do NOT replace with getSession() — getSession() does not refresh the token.
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (static assets)
     * - _next/image   (Next.js image optimisation)
     * - favicon.ico   (browser favicon request)
     * - public folder files (e.g. /icons/*, /images/*)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
