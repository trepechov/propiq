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
         * TODO Phase 2: Wrap children with <AuthProvider> once auth context is
         * created in context/AuthContext.tsx. AuthProvider is a Client Component
         * and must live inside ThemeRegistry (client boundary already established).
         *
         * Example (Phase 2):
         *   <ThemeRegistry>
         *     <AuthProvider>
         *       {children}
         *     </AuthProvider>
         *   </ThemeRegistry>
         */}
        <ThemeRegistry>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  )
}
