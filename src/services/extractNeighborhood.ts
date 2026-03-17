/**
 * Gemini extraction service for neighborhood data.
 *
 * Sends raw text to Gemini using the NEIGHBORHOOD_RESEARCH_CRITERIA prompt
 * and returns a validated NeighborhoodInsert ready for Supabase.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { NEIGHBORHOOD_RESEARCH_CRITERIA } from '../prompts/neighborhoodResearchCriteria'
import { neighborhoodInsertSchema } from '../types'
import type { NeighborhoodInsert } from '../types'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY as string)
const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' })

/**
 * Extracts and enriches a neighborhood from raw text using Gemini.
 *
 * @param rawText - Free-form text describing the neighborhood (copy-paste from any source)
 * @returns Validated NeighborhoodInsert ready to persist
 * @throws If Gemini fails or the response fails Zod validation
 */
export async function extractNeighborhood(rawText: string): Promise<NeighborhoodInsert> {
  const prompt = `${NEIGHBORHOOD_RESEARCH_CRITERIA}\n\n## Raw Text\n\n${rawText}`

  let responseText: string
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    })
    responseText = result.response.text()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Gemini request failed: ${message}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(responseText)
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

  return validation.data
}
