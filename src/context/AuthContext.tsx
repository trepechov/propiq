/**
 * Auth context — provides the current user and loading state to the React tree.
 *
 * Subscribes to Supabase auth state changes on mount so all components
 * automatically reflect login / logout events without polling.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../services/supabase'

interface AuthUser {
  id: string
  username: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  // Start true to prevent a flash of the login page on reload
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            username: session.user.user_metadata?.display_name ?? '',
          })
        } else {
          setUser(null)
        }
        setLoading(false)
      },
    )

    return () => subscription.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return ctx
}
