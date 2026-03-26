/**
 * POST /api/extract/project
 *
 * Extracts a project (and optionally a neighborhood) from raw proposal text.
 * Uses structuredExtract (JSON mode) to get reliable parseable output.
 *
 * neighborhood_id is intentionally excluded — the caller assigns it after
 * the user selects or saves a neighborhood in the form.
 *
 * Returns:
 *   200 { neighborhood?: NeighborhoodInsert; project: ExtractedProject; meta: ExtractionMeta }
 *   400 { error: string }   — missing rawText
 *   401 { error: string }   — unauthenticated
 *   422 { error: string }   — project Zod validation failed
 *   500 { error: string }   — unexpected error
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { structuredExtract } from '@/lib/ai/server'
import { EXTRACTION_RULES } from '@/prompts/extractionRules'
import { projectInsertSchema } from '@/types/project'
import { neighborhoodInsertSchema } from '@/types/neighborhood'
import type { NeighborhoodInsert } from '@/types/neighborhood'
import type { ExtractionMeta } from '@/lib/ai/types'

const extractedProjectSchema = projectInsertSchema.omit({ neighborhood_id: true })
type ExtractedProject = z.infer<typeof extractedProjectSchema>

const RESPONSE_SHAPE_INSTRUCTIONS = `
### Response Format
Return a single JSON object with exactly this shape:
{
  "neighborhood": <neighborhood object or null>,
  "project": <project object>
}

The "neighborhood" object fields (all required unless noted):
  name (string), city (string), target_buyers (string[]),
  transport_links (string or null), nearby_amenities (string or null),
  neighbourhood_notes (string or null).
Set "neighborhood" to null if there is no neighbourhood information in the text.

The "project" object must use EXACTLY these field names:
  title (string — project name),
  developer (string or null),
  source (string or null),
  commission (string or null),
  total_apartments (number or null),
  total_floors (number or null),
  current_stage (string — MUST be one of exactly: "act16", "act15", "act14", "building_started", "preparation", "planning"),
  completion_date (string ISO 8601 or null),
  building_notes (string or null),
  currency (string or null),
  price_sqm (number or null),
  price_date (string ISO 8601 or null),
  payment_schedule (array of {percentage, trigger} or null),
  notes (string or null),
  ai_summary (string or null).
`

export interface ExtractProjectResponse {
  neighborhood?: NeighborhoodInsert
  project: ExtractedProject
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
    const prompt = `${EXTRACTION_RULES}\n${RESPONSE_SHAPE_INSTRUCTIONS}\n## Raw Text\n\n${rawText}`
    const { json, meta } = await structuredExtract(prompt)

    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      return NextResponse.json(
        { error: 'AI returned invalid JSON — could not parse response' },
        { status: 422 },
      )
    }

    if (typeof parsed !== 'object' || parsed === null || !('project' in parsed)) {
      return NextResponse.json(
        { error: 'AI response missing required "project" field' },
        { status: 422 },
      )
    }

    const raw = parsed as { neighborhood?: unknown; project: unknown }

    const projectResult = extractedProjectSchema.safeParse(raw.project)
    if (!projectResult.success) {
      const issues = projectResult.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
      return NextResponse.json(
        { error: `Project extraction validation failed: ${issues}` },
        { status: 422 },
      )
    }

    const response: ExtractProjectResponse = { project: projectResult.data, meta }

    if (raw.neighborhood) {
      const neighborhoodResult = neighborhoodInsertSchema.safeParse(raw.neighborhood)
      if (neighborhoodResult.success) {
        response.neighborhood = neighborhoodResult.data
      }
      // neighborhood validation failure is non-fatal — omit from response
    }

    return NextResponse.json(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
