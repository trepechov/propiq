/**
 * POST /api/extract/units
 *
 * Stub — returns 501 until Phase 3 implements LangChain.js extraction.
 * Auth guard is already in place: Phase 3 fills in the logic without
 * touching the guard pattern.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(
    { error: 'AI features coming in Phase 3' },
    { status: 501 },
  )
}
