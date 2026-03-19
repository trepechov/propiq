/**
 * Auth service — username + password authentication via Supabase Auth.
 *
 * NOTE: Supabase Auth requires an email address.
 * We store usernames as {username}@example.com internally.
 * Callers never see fake emails — this file handles the conversion.
 * example.com is IANA-reserved for testing — it has valid DNS so Supabase
 * accepts it, but no real email server exists so no mail is ever sent.
 *
 * Email confirmation must be disabled in the Supabase dashboard:
 * Authentication → Email → toggle "Confirm email" OFF.
 */

import { supabase } from './supabase'

const EMAIL_DOMAIN = 'example.com'

function toInternalEmail(username: string): string {
  return `${username}@${EMAIL_DOMAIN}`
}

export async function register(username: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email: toInternalEmail(username),
    password,
    options: { data: { display_name: username } },
  })

  if (error) throw new Error(`Registration failed: ${error.message}`)
}

export async function login(username: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: toInternalEmail(username),
    password,
  })

  if (error) throw new Error(`Login failed: ${error.message}`)
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(`Logout failed: ${error.message}`)
}

export async function getCurrentUser(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.user_metadata?.display_name ?? null
}
