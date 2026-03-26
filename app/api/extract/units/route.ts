/**
 * POST /api/extract/units
 *
 * Extracts structured unit records from raw tabular or CSV text.
 * Uses structuredExtract (JSON mode) for reliable parseable output.
 *
 * Each unit is validated individually — invalid units are skipped rather
 * than failing the entire import. project_id is injected into every valid unit.
 *
 * Returns:
 *   200 { units: UnitInsert[]; meta: ExtractionMeta }
 *   400 { error: string }   — missing rawText or projectId
 *   401 { error: string }   — unauthenticated
 *   422 { error: string }   — no valid units extracted
 *   500 { error: string }   — unexpected error
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { structuredExtract } from '@/lib/ai/server'
import { EXTRACTION_RULES } from '@/prompts/extractionRules'
import { unitSchema } from '@/types/unit'
import type { UnitInsert } from '@/types/unit'
import type { ExtractionMeta } from '@/lib/ai/types'

const RESPONSE_SHAPE_INSTRUCTIONS = `
### Response Format
Return a single JSON object with exactly this shape:
{
  "units": [ <unit object>, ... ]
}

Each unit object must use EXACTLY these field names (snake_case):
  project_id        (string — UUID, use the project_id provided in the prompt)
  unit_type         (string — MUST be one of exactly: "apartment", "studio", "garage", "parking", "storage")
  apartment_number  (string or null — e.g. "A101", "42")
  identifier        (string or null — internal reference code if present)
  floor             (number or null — integer floor number)
  net_area          (number or null — net usable area in square metres)
  common_area       (number or null — shared/common area in square metres)
  total_area        (number or null — net_area + common_area in square metres)
  price_sqm_vat     (number or null — price per square metre, VAT inclusive)
  total_price_vat   (number or null — total unit price, VAT inclusive)
  direction         (string or null — MUST be one of exactly: "south", "north", "east", "west",
                     "south_east", "south_west", "north_east", "north_west" — or null if unknown)
  status            (string — MUST be one of exactly: "available", "booked", "sold")
  notes             (string or null — any additional notes)
  ai_summary        (string or null — 1-2 sentence factual summary of this unit)

Rules:
- All numeric fields must be numbers (not strings) or null.
- Do NOT invent values — use null if the data is missing.
- Do NOT return empty arrays. If no units can be parsed, return {"units":[]}.
`

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth guard
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body
  let rawText: string
  let projectId: string
  try {
    const body = await request.json()
    rawText = body?.rawText
    projectId = body?.projectId
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!rawText || typeof rawText !== 'string') {
    return NextResponse.json({ error: 'rawText is required' }, { status: 400 })
  }
  if (!projectId || typeof projectId !== 'string') {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  try {
    const prompt = buildPrompt(rawText, projectId)
    const { json, meta } = await structuredExtract(prompt)

    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      return NextResponse.json(
        { error: 'AI returned invalid JSON — could not parse unit extraction response' },
        { status: 422 },
      )
    }

    if (typeof parsed !== 'object' || parsed === null || !('units' in parsed)) {
      return NextResponse.json(
        { error: 'AI response missing required "units" field' },
        { status: 422 },
      )
    }

    const raw = parsed as { units: unknown }
    if (!Array.isArray(raw.units)) {
      return NextResponse.json(
        { error: 'AI response "units" field must be an array' },
        { status: 422 },
      )
    }

    const units = validateAndFilterUnits(raw.units, projectId)

    if (units.length === 0) {
      return NextResponse.json(
        { error: 'No valid units could be extracted from the provided text' },
        { status: 422 },
      )
    }

    return NextResponse.json({ units, meta } satisfies { units: UnitInsert[]; meta: ExtractionMeta })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function buildPrompt(rawText: string, projectId: string): string {
  return [
    EXTRACTION_RULES,
    `Context: Parse the following unit data into structured records.`,
    `The project_id for ALL units is: "${projectId}"`,
    RESPONSE_SHAPE_INSTRUCTIONS,
    `## Raw Unit Data\n\n${rawText}`,
  ].join('\n')
}

/**
 * Validates each raw unit against unitSchema.
 * Invalid units are skipped — callers receive only safe, typed records.
 * Logs validation failures to console so developers can diagnose prompt issues.
 */
function validateAndFilterUnits(rawUnits: unknown[], projectId: string): UnitInsert[] {
  const valid: UnitInsert[] = []

  for (const [i, item] of rawUnits.entries()) {
    // Inject project_id if Gemini omitted it (defensive fallback)
    const candidate = typeof item === 'object' && item !== null
      ? { project_id: projectId, ...item }
      : item

    const result = unitSchema.safeParse(candidate)
    if (result.success) {
      valid.push(result.data as UnitInsert)
    } else {
      const issues = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')
      console.warn(`Unit extraction: unit[${i}] failed validation — ${issues}`)
    }
  }

  return valid
}
