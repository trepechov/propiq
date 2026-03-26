import { redirect } from 'next/navigation'

/**
 * Root page — immediately redirects to the main app entry point.
 *
 * Unauthenticated users will be redirected to /login by the middleware
 * (implemented in Phase 2) before /neighborhoods renders.
 */
export default function RootPage() {
  redirect('/neighborhoods')
}
