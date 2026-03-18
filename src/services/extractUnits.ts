/**
 * Gemini extraction service for unit data.
 *
 * Sends raw tabular/CSV unit data to Gemini via the AIProvider abstraction
 * and returns an array of validated UnitInsert records plus extraction metadata.
 *
 * Uses structuredExtract (JSON mode) so the response is always parseable.
 * Each unit is validated individually with unitSchema — invalid units are
 * skipped and reported rather than causing the entire import to fail.
 */

import { getAIProvider } from './ai/provider'
import { EXTRACTION_RULES } from '../prompts/extractionRules'
import { unitSchema } from '../types/unit'
import type { UnitInsert } from '../types/unit'
import type { ExtractionMeta } from './ai/types'

export interface ExtractUnitsResult {
  units: UnitInsert[]
  meta: ExtractionMeta
}

/**
 * Field-by-field contract shown to Gemini.
 * Explicit field names prevent the model from inventing its own keys.
 */
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

/**
 * Extracts structured unit records from raw tabular or CSV text.
 *
 * @param rawText   - Raw text containing unit data (CSV, table, free text)
 * @param projectId - UUID of the parent project — injected into every unit
 * @returns Validated units ready for Supabase insert, plus extraction metadata
 * @throws If the AI call fails or returns unparseable JSON
 */
export async function extractUnits(
  rawText: string,
  projectId: string,
): Promise<ExtractUnitsResult> {
  const prompt = buildPrompt(rawText, projectId)
  const provider = getAIProvider()

  const response = await provider.structuredExtract({ prompt })

  const parsed = parseResponse(response.json)
  const units = validateUnits(parsed, projectId)

  return { units, meta: response.meta }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function buildPrompt(rawText: string, projectId: string): string {
  return [
    EXTRACTION_RULES,
    `Context: Parse the following unit data into structured records.`,
    `The project_id for ALL units is: "${projectId}"`,
    RESPONSE_SHAPE_INSTRUCTIONS,
    `## Raw Unit Data\n\n${rawText}`,
  ].join('\n')
}

function parseResponse(json: string): unknown {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('AI returned invalid JSON — could not parse unit extraction response')
  }

  if (typeof parsed !== 'object' || parsed === null || !('units' in parsed)) {
    throw new Error('AI response missing required "units" field')
  }

  const raw = parsed as { units: unknown }
  if (!Array.isArray(raw.units)) {
    throw new Error('AI response "units" field must be an array')
  }

  return raw
}

/**
 * Validates each raw unit against unitSchema.
 * Invalid units are skipped — callers receive only safe, typed records.
 * Logs validation failures to console so developers can diagnose prompt issues.
 */
function validateUnits(parsed: unknown, projectId: string): UnitInsert[] {
  const raw = parsed as { units: unknown[] }
  const valid: UnitInsert[] = []

  for (const [i, item] of raw.units.entries()) {
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
