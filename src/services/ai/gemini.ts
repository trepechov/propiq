/**
 * Gemini implementation of the AIProvider interface.
 *
 * Two model instances are created:
 * - jsonModel: plain generateContent with JSON mode — used for structured extraction
 * - searchModel: googleSearch tool enabled — used for research/grounding queries
 *
 * Note: googleSearch grounding is incompatible with responseMimeType: 'application/json'.
 * The searchModel returns free text; callers must extract the JSON block themselves.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type {
  AIProvider,
  StructuredExtractRequest,
  StructuredExtractResponse,
  ResearchExtractRequest,
  ResearchExtractResponse,
} from './types'

const MODEL = 'gemini-2.5-flash'

/**
 * Creates and returns a Gemini-backed AIProvider.
 * Uses a single GoogleGenerativeAI client shared between both model instances.
 */
export function createGeminiProvider(): AIProvider {
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY as string)

  const jsonModel = genAI.getGenerativeModel({ model: MODEL })

  // SDK v0.24 types only expose googleSearchRetrieval but gemini-2.5-flash
  // requires the newer googleSearch tool — cast to bypass stale typings.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchModel = genAI.getGenerativeModel({ model: MODEL, tools: [{ googleSearch: {} } as any] })

  async function structuredExtract(req: StructuredExtractRequest): Promise<StructuredExtractResponse> {
    const startMs = performance.now()

    try {
      const result = await jsonModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
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

  async function researchExtract(req: ResearchExtractRequest): Promise<ResearchExtractResponse> {
    const startMs = performance.now()

    try {
      const result = await searchModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
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

  return {
    name: 'gemini',
    structuredExtract,
    researchExtract,
  }
}
