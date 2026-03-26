/**
 * Shared AI types — safe to import from both client and server code.
 *
 * Kept separate from lib/ai/server.ts so client components can import
 * ExtractionMeta without pulling in server-only modules.
 */

export interface ExtractionMeta {
  durationMs: number
  tokens: number
  /** Web URLs from grounding/search; empty array if provider has no search. */
  sources: string[]
}
