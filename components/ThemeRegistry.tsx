'use client'

/**
 * ThemeRegistry — MUI v7 SSR setup for Next.js App Router.
 *
 * MUI v7 approach differs from v5/v6:
 * - v5/v6: required manually creating an Emotion cache, calling useServerInsertedHTML,
 *   and injecting style tags on the server. Pattern was verbose and error-prone.
 * - v7: provides `AppRouterCacheProvider` from `@mui/material-nextjs/v15-appRouter`
 *   which handles Emotion SSR internally. No manual useServerInsertedHTML needed.
 *
 * AppRouterCacheProvider collects CSS generated on the server and streams it to
 * the client before hydration, preventing flash of unstyled content (FOUC).
 *
 * ThemeProvider + CssBaseline are Client Components as they rely on React context.
 * AppRouterCacheProvider must wrap them so the Emotion cache is available.
 */

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import type { ReactNode } from 'react'

// PropIQ theme — no custom overrides yet; inheriting MUI v7 defaults.
// Extracted here so it can be extended without touching the registry wrapper.
const theme = createTheme()

interface ThemeRegistryProps {
  children: ReactNode
}

export default function ThemeRegistry({ children }: ThemeRegistryProps) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  )
}
