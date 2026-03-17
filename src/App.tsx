// IMPORTANT: The Gemini API key must be named VITE_GEMINI_API_KEY in .env
// so Vite exposes it to the browser via import.meta.env. Plain GEMINI_API_KEY
// is NOT accessible in client code.
import { useState } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import './App.css'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY as string)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

export default function App() {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    const trimmed = prompt.trim()
    if (!trimmed) return

    setLoading(true)
    setError('')
    setResponse('')

    try {
      const result = await model.generateContent(trimmed)
      setResponse(result.response.text())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(`Gemini request failed: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>PropIQ</h1>

      <label htmlFor="prompt-input" className="field-label">
        Ask Gemini anything
      </label>
      <textarea
        id="prompt-input"
        rows={6}
        value={prompt}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
        className="prompt-input"
      />

      <button
        onClick={handleSubmit}
        disabled={loading || !prompt.trim()}
        className="submit-btn"
      >
        {loading ? 'Thinking…' : 'Submit'}
      </button>

      {error && <p className="error-msg">{error}</p>}

      {response && <pre className="response-box">{response}</pre>}
    </div>
  )
}
