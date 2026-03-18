/**
 * Gemini extraction service for neighborhood data.
 *
 * Sends raw text to Gemini using the NEIGHBORHOOD_RESEARCH_CRITERIA prompt
 * and returns a validated NeighborhoodInsert ready for Supabase, along with
 * extraction metadata (duration, token count, grounding sources).
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { NEIGHBORHOOD_RESEARCH_CRITERIA } from '../prompts/neighborhoodResearchCriteria'
import { neighborhoodInsertSchema } from '../types'
import type { NeighborhoodInsert } from '../types'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY as string)

// googleSearch grounding enables real-time web lookup for area data.
// Note: googleSearch is incompatible with responseMimeType: 'application/json' —
// Gemini returns free text, so we extract the JSON block from the response manually.
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  // SDK v0.24 types only expose googleSearchRetrieval but gemini-2.5-flash
  // requires the newer google_search tool — cast to bypass stale typings.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: [{ googleSearch: {} } as any],
})

export interface ExtractionMeta {
  durationMs: number
  tokens: number
  /** Web URLs from grounding chunks; empty array if none. */
  sources: string[]
}

export interface NeighborhoodExtractionResult {
  data: NeighborhoodInsert
  meta: ExtractionMeta
}

/**
 * Extracts and enriches a neighborhood from raw text using Gemini + Google Search.
 * Gemini will search the web to enrich transport links, amenities, and area character
 * beyond what is explicitly stated in the raw text.
 *
 * @param rawText - Free-form text describing the neighborhood (copy-paste from any source)
 * @returns Validated NeighborhoodInsert and extraction metadata
 * @throws If Gemini fails or the response fails Zod validation
 */
export async function extractNeighborhood(rawText: string): Promise<NeighborhoodExtractionResult> {
  const prompt = `${NEIGHBORHOOD_RESEARCH_CRITERIA}\n\n## Raw Text\n\n${rawText}`

  const startMs = performance.now()

  let responseText: string
  let tokens = 0
  let sources: string[] = []

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })

    responseText = result.response.text()
    tokens = result.response.usageMetadata?.totalTokenCount ?? 0
    sources =
      result.response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((c) => c.web?.uri ?? '')
        .filter(Boolean) ?? []
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Gemini request failed: ${message}`)
  }

  const durationMs = performance.now() - startMs

  // Extract JSON block from free-text response (search grounding disables JSON mode)
  const jsonMatch =
    responseText.match(/```json\s*([\s\S]*?)```/) ?? responseText.match(/\{[\s\S]*\}/)
  const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : responseText

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr.trim())
  } catch {
    throw new Error('Gemini returned invalid JSON — could not parse response')
  }

  const validation = neighborhoodInsertSchema.safeParse(parsed)
  if (!validation.success) {
    const issues = validation.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    throw new Error(`Extraction validation failed: ${issues}`)
  }

  return {
    data: validation.data,
    meta: { durationMs, tokens, sources },
  }
}
