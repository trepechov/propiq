# Phase 1 — Gemini Setup & Core Features Spec

**Created**: 2026-03-17
**Status**: In Progress

## Overview

Complete Phase 1 of PropIQ using Google Gemini (`gemini-2.0-flash`) instead of Anthropic Claude. The Vite proxy routes `/api` to `generativelanguage.googleapis.com`. Two remaining blockers before UI work: Vite proxy config and Supabase migration.

## Requirements

- Gemini API key from Google AI Studio (free tier)
- Vite proxy hides `VITE_GEMINI_API_KEY` from the browser
- `proposals` table created in Supabase via SQL migration
- `extractProposal` service uses Gemini JSON mode with Zod validation
- `queryProposals` service sends proposals as context to Gemini
- Full UI: input → review → save → table → NL query

## Technical Approach

- SDK: `@google/generative-ai` (official Google AI JS SDK)
- Model: `gemini-2.0-flash` — best free-tier option (fast, capable)
- JSON mode: `responseMimeType: 'application/json'` in generation config
- Vite proxy: rewrite `/api` → `https://generativelanguage.googleapis.com`

## Implementation Phases

### Phase A: Infrastructure (unblocks everything)

**Goal**: API key secured, DB ready, SDK installed.

Tasks:

- [x] A.1 Install `@google/generative-ai`: `npm install @google/generative-ai`
- [x] A.2 Add `VITE_VITE_GEMINI_API_KEY` to `.env` and `.env.example`
- [ ] A.3 Configure Vite proxy in `vite.config.ts`: `/api` → `https://generativelanguage.googleapis.com`
- [ ] A.4 Create `supabase/migrations/001_proposals.sql` and run it in Supabase dashboard SQL editor
- [ ] A.5 Add CRUD helpers to `src/services/supabase.ts` (`getProposals`, `saveProposal`, `deleteProposal`)

### Phase B: AI Services

**Goal**: Both Gemini service functions working and validated.

Tasks:

- [ ] B.1 Create `src/types/proposal.ts` — `Proposal` type + Zod schema
- [ ] B.2 Create `src/services/extractProposal.ts` — Gemini call with JSON mode, Zod parse, returns `Proposal`
- [ ] B.3 Create `src/services/queryProposals.ts` — Gemini call with proposals as context, returns markdown string
- [ ] B.4 Test both services manually with `tools/tmp/` scripts before wiring to UI

### Phase C: UI Components

**Goal**: Full working UI flow.

Tasks:

- [ ] C.1 Build `src/components/ProposalInput.tsx` — textarea + "Extract" button, calls `extractProposal`, passes result to review
- [ ] C.2 Build `src/components/ProposalReview.tsx` — editable form pre-filled with extracted fields, "Save" button calls `saveProposal`
- [ ] C.3 Build `src/components/ProposalTable.tsx` — MUI Table, sortable columns, loads from Supabase on mount
- [ ] C.4 Build `src/components/NLQueryBar.tsx` — input + submit, calls `queryProposals`, renders markdown answer
- [ ] C.5 Wire routing in `App.tsx`: `/` = input + table + query bar, `/proposals/:id` = detail view
- [ ] C.6 Clean up Vite boilerplate (remove default App.css content, placeholder components)

## Risks & Considerations

- **Vite proxy path**: Gemini SDK uses full URLs internally — the proxy only applies when using `fetch` directly or configuring the SDK base URL. May need to pass `VITE_GEMINI_API_KEY` via env and let the SDK call out directly, or use a server-side function. Validate this in Phase A.3 before building services.
- **Gemini free tier rate limits**: 15 requests/min on AI Studio free tier. Add basic error handling for 429 responses.
- **JSON mode hallucination**: Even with JSON mode, Gemini may return extra wrapper text. Defensively strip and re-parse if Zod validation fails.

## Progress Tracking

- [ ] Phase A complete (infrastructure)
- [ ] Phase B complete (AI services)
- [ ] Phase C complete (UI)

## Notes

- Gemini API key: https://aistudio.google.com/app/apikey
- `gemini-2.0-flash` model ID: `gemini-2.0-flash`
- Gemini JS SDK docs: https://ai.google.dev/gemini-api/docs/quickstart?lang=node
