# PropIQ

AI-powered real estate investment analyser. Built on Next.js 15 App Router + Supabase + Gemini.

## Setup

```bash
npm install --legacy-peer-deps
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, GEMINI_API_KEY
npm run dev
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (browser-safe) |
| `GEMINI_API_KEY` | Google AI Studio key — server-only, never sent to the browser |
