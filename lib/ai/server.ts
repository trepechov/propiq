/**
 * Server-side AI helpers — wraps @google/generative-ai for use in Route Handlers.
 *
 * NEVER import this file from client components.
 * Uses process.env.GEMINI_API_KEY (server-only env var, no NEXT_PUBLIC_ prefix).
 *
 * Two functions:
 * - structuredExtract: JSON mode — for project, units, search extraction
 * - researchExtract:   Google Search grounding — for neighborhood research
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ExtractionMeta } from './types'

const MODEL = 'gemini-2.5-flash'

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is not set')
  return new GoogleGenerativeAI(apiKey)
}

/**
 * Calls Gemini with JSON mode enabled.
 * Returns the raw JSON string — callers parse and validate with Zod.
 */
export async function structuredExtract(
  prompt: string,
): Promise<{ json: string; meta: ExtractionMeta }> {
  const genAI = getClient()
  const model = genAI.getGenerativeModel({ model: MODEL })

  const startMs = performance.now()

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    })
    const durationMs = performance.now() - startMs

    return {
      json: result.response.text(),
      meta: {
        durationMs,
        tokens: result.response.usageMetadata?.totalTokenCount ?? 0,
        sources: [],
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Gemini request failed: ${message}`)
  }
}

/**
 * Calls Gemini with Google Search grounding.
 * Returns free text — callers extract the JSON block themselves.
 * Note: JSON mode is incompatible with googleSearch tool.
 */
export async function researchExtract(
  prompt: string,
): Promise<{ text: string; meta: ExtractionMeta }> {
  const genAI = getClient()
  // SDK v0.24 types only expose googleSearchRetrieval but gemini-2.5-flash
  // requires the newer google_search tool — cast to bypass stale typings.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = genAI.getGenerativeModel({ model: MODEL, tools: [{ googleSearch: {} } as any] })

  const startMs = performance.now()

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })
    const durationMs = performance.now() - startMs
    const sources =
      result.response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((c) => c.web?.uri ?? '')
        .filter(Boolean) ?? []

    return {
      text: result.response.text(),
      meta: {
        durationMs,
        tokens: result.response.usageMetadata?.totalTokenCount ?? 0,
        sources,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Gemini request failed: ${message}`)
  }
}
