/**
 * Root layout — Next.js App Router entry point.
 *
 * This is a Server Component. It wraps all pages with:
 * - ThemeRegistry: MUI v7 SSR setup (Emotion + ThemeProvider + CssBaseline)
 * - AuthProvider: auth context for client components (TODO Phase 2)
 *
 * Only global, unconditional setup belongs here.
 * Route-group layouts ((auth) and (protected)) handle their own concerns.
 */

import type { Metadata } from 'next'
import ThemeRegistry from '../components/ThemeRegistry'
import { AuthProvider } from '../context/AuthContext'
import NavBar from '../components/NavBar'

export const metadata: Metadata = {
  title: 'PropIQ',
  description: 'AI-powered real estate proposal analyser',
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        {/*
         * ThemeRegistry must be the outermost client boundary.
         * AuthProvider lives inside so it can use Emotion context (MUI components).
         * NavBar renders the app bar on every route — auth pages include it too,
         * but NavBar hides its nav links when user is null (logged out).
         */}
        <ThemeRegistry>
          <AuthProvider>
            <NavBar />
            {children}
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  )
}
