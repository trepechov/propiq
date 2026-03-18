import type { AIProvider } from './types'
import { createGeminiProvider } from './gemini'

let activeProvider: AIProvider | null = null

export function getAIProvider(): AIProvider {
  if (!activeProvider) {
    activeProvider = createGeminiProvider()
  }
  return activeProvider
}

export function setAIProvider(provider: AIProvider | null): void {
  activeProvider = provider
}
