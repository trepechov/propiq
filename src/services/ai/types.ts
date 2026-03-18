export interface ExtractionMeta {
  durationMs: number
  tokens: number
  /** Web URLs from grounding/search; empty array if provider has no search. */
  sources: string[]
}

export interface StructuredExtractRequest {
  prompt: string
}

export interface StructuredExtractResponse {
  /** Raw JSON string — caller is responsible for parsing and Zod validation. */
  json: string
  meta: ExtractionMeta
}

export interface ResearchExtractRequest {
  prompt: string
}

export interface ResearchExtractResponse {
  /** Raw text response — may contain a JSON block that the caller extracts. */
  text: string
  meta: ExtractionMeta
}

export interface AIProvider {
  readonly name: string
  structuredExtract(req: StructuredExtractRequest): Promise<StructuredExtractResponse>
  researchExtract(req: ResearchExtractRequest): Promise<ResearchExtractResponse>
}
