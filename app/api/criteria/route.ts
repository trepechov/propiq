/**
 * /api/criteria
 *
 * Manages per-user AI criteria overrides stored in user_criteria table.
 * Falls back to hardcoded TS constants when no user row exists.
 *
 * GET    — returns all 4 criteria with isDefault flag
 * PUT    — upserts one criterion { key, content }
 * DELETE — removes one criterion row (reverts to default); key via query param
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { CRITERIA_KEYS, type CriteriaKey, type UserCriteriaMap } from '@/types/userCriteria'
import { EVALUATION_CRITERIA } from '@/prompts/evaluationCriteria'
import { QUERY_CONTEXT } from '@/prompts/queryContext'
import { EXTRACTION_RULES } from '@/prompts/extractionRules'
import { NEIGHBORHOOD_RESEARCH_CRITERIA } from '@/prompts/neighborhoodResearchCriteria'

const DEFAULTS: Record<CriteriaKey, string> = {
  evaluation_criteria: EVALUATION_CRITERIA,
  query_context: QUERY_CONTEXT,
  extraction_rules: EXTRACTION_RULES,
  neighborhood_research: NEIGHBORHOOD_RESEARCH_CRITERIA,
}

const keySchema = z.enum(CRITERIA_KEYS as unknown as [string, ...string[]])

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: rows, error } = await supabase
    .from('user_criteria')
    .select('key, content')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Build a lookup of overrides keyed by criteria key
  const overrides = new Map<string, string>(
    (rows ?? []).map((r: { key: string; content: string }) => [r.key, r.content]),
  )

  // Merge with defaults, setting isDefault flag
  const criteria = Object.fromEntries(
    CRITERIA_KEYS.map((key) => {
      const hasOverride = overrides.has(key)
      return [key, {
        key,
        content: hasOverride ? overrides.get(key)! : DEFAULTS[key],
        isDefault: !hasOverride,
      }]
    }),
  ) as UserCriteriaMap

  return NextResponse.json({ criteria })
}

// ── PUT ───────────────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let key: string
  let content: string
  try {
    const body = await request.json()
    key = body?.key
    content = body?.content
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const keyValidation = keySchema.safeParse(key)
  if (!keyValidation.success) {
    return NextResponse.json(
      { error: `Invalid key. Must be one of: ${CRITERIA_KEYS.join(', ')}` },
      { status: 400 },
    )
  }

  if (typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_criteria')
    .upsert(
      { user_id: user.id, key: keyValidation.data, content },
      { onConflict: 'user_id,key' },
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const key = request.nextUrl.searchParams.get('key')

  const keyValidation = keySchema.safeParse(key)
  if (!keyValidation.success) {
    return NextResponse.json(
      { error: `Invalid key. Must be one of: ${CRITERIA_KEYS.join(', ')}` },
      { status: 400 },
    )
  }

  const { error } = await supabase
    .from('user_criteria')
    .delete()
    .eq('user_id', user.id)
    .eq('key', keyValidation.data)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
