/**
 * POST /api/extract/neighborhood
 *
 * Extracts and enriches a neighborhood from raw text using Gemini + Google Search.
 * Uses researchExtract (grounding mode) instead of structuredExtract because
 * JSON mode is incompatible with the googleSearch tool.
 *
 * The JSON block is extracted from the free-text response manually via regex.
 *
 * Returns:
 *   200 { data: NeighborhoodInsert; meta: ExtractionMeta }
 *   400 { error: string }   — missing rawText
 *   401 { error: string }   — unauthenticated
 *   422 { error: string }   — Zod validation failed or unparseable JSON
 *   500 { error: string }   — unexpected error
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { researchExtract } from '@/lib/ai/server'
import { NEIGHBORHOOD_RESEARCH_CRITERIA } from '@/prompts/neighborhoodResearchCriteria'
import { neighborhoodInsertSchema } from '@/types/neighborhood'
import type { NeighborhoodInsert } from '@/types/neighborhood'
import type { ExtractionMeta } from '@/lib/ai/types'

export interface NeighborhoodExtractionResponse {
  data: NeighborhoodInsert
  meta: ExtractionMeta
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth guard
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body
  let rawText: string
  try {
    const body = await request.json()
    rawText = body?.rawText
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!rawText || typeof rawText !== 'string') {
    return NextResponse.json({ error: 'rawText is required' }, { status: 400 })
  }

  try {
    const prompt = `${NEIGHBORHOOD_RESEARCH_CRITERIA}\n\n## Raw Text\n\n${rawText}`
    const { text, meta } = await researchExtract(prompt)

    // Extract JSON block from free-text response.
    // googleSearch grounding disables JSON mode — the model returns prose with
    // an embedded JSON block. Try fenced code block first, then bare object.
    const jsonMatch =
      text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonStr.trim())
    } catch {
      return NextResponse.json(
        { error: 'AI returned invalid JSON — could not parse response' },
        { status: 422 },
      )
    }

    const validation = neighborhoodInsertSchema.safeParse(parsed)
    if (!validation.success) {
      const issues = validation.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
      return NextResponse.json(
        { error: `Neighborhood extraction validation failed: ${issues}` },
        { status: 422 },
      )
    }

    return NextResponse.json(
      { data: validation.data, meta } satisfies NeighborhoodExtractionResponse,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
