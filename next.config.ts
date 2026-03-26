import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // LangChain and Google GenAI are server-only packages with Node.js native
  // dependencies. Marking them as external prevents Next.js from attempting
  // to bundle them for the edge runtime or the client bundle, which would fail.
  //
  // If bundling issues arise with specific Route Handlers in Phase 3, add
  // additional packages here (e.g., '@google/generative-ai').
  serverExternalPackages: ['langchain', '@langchain/google-genai', '@google/generative-ai'],
}

export default nextConfig
