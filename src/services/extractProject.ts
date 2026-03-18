/**
 * Gemini extraction service for project data.
 *
 * Sends raw proposal text to Gemini using the EXTRACTION_RULES prompt
 * and returns a validated project payload plus an optional neighborhood.
 *
 * `neighborhood_id` is intentionally excluded from the Gemini response —
 * it cannot be known at extraction time. The caller assigns it after the
 * user selects or saves a neighborhood.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import { EXTRACTION_RULES } from '../prompts/extractionRules'
import { projectInsertSchema, neighborhoodInsertSchema } from '../types'
import type { NeighborhoodInsert } from '../types'
import type { ExtractionMeta } from './extractNeighborhood'

export type { ExtractionMeta }

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY as string)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

/**
 * Schema for the project portion of the Gemini response.
 * Omits neighborhood_id — the caller assigns it from the neighborhood selector.
 */
const extractedProjectSchema = projectInsertSchema.omit({ neighborhood_id: true })
export type ExtractedProject = z.infer<typeof extractedProjectSchema>

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

export interface ExtractProjectResult {
  /** Present only if neighbourhood data was found and passed validation. */
  neighborhood?: NeighborhoodInsert
  project: ExtractedProject
  meta: ExtractionMeta
}

/**
 * Extracts a project (and optionally a neighborhood) from raw proposal text.
 *
 * @param rawText - Free-form proposal text pasted by the user
 * @returns Validated project and optional neighborhood — ready for the form
 * @throws If Gemini fails, returns invalid JSON, or project Zod validation fails
 */
export async function extractProject(rawText: string): Promise<ExtractProjectResult> {
  const prompt = `${EXTRACTION_RULES}\n${RESPONSE_SHAPE_INSTRUCTIONS}\n## Raw Text\n\n${rawText}`

  const startMs = performance.now()

  let responseText: string
  let tokens = 0
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    })
    responseText = result.response.text()
    tokens = result.response.usageMetadata?.totalTokenCount ?? 0
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Gemini request failed: ${message}`)
  }

  const durationMs = performance.now() - startMs
  const meta: ExtractionMeta = { durationMs, tokens, sources: [] }

  let parsed: unknown
  try {
    parsed = JSON.parse(responseText)
  } catch {
    throw new Error('Gemini returned invalid JSON — could not parse response')
  }

  if (typeof parsed !== 'object' || parsed === null || !('project' in parsed)) {
    throw new Error('Gemini response missing required "project" field')
  }

  const raw = parsed as { neighborhood?: unknown; project: unknown }

  const projectValidation = extractedProjectSchema.safeParse(raw.project)
  if (!projectValidation.success) {
    const issues = projectValidation.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    throw new Error(`Project extraction validation failed: ${issues}`)
  }

  if (!raw.neighborhood) {
    return { project: projectValidation.data, meta }
  }

  const neighborhoodValidation = neighborhoodInsertSchema.safeParse(raw.neighborhood)

  return {
    project: projectValidation.data,
    meta,
    ...(neighborhoodValidation.success ? { neighborhood: neighborhoodValidation.data } : {}),
  }
}
