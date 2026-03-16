# PropIQ Implementation Spec

**Created**: 2026-03-16
**Status**: Planning

## Overview

PropIQ is an AI-powered real estate proposal analyser. Users paste raw proposal text (from PDFs, emails, etc.) and Claude extracts structured fields — location, developer, price/sqm, yield, completion date, payment plan. Proposals are persisted in Supabase, displayed in a sortable comparison table, and users can query proposals with natural language ("which has the best yield for a 5-year hold").

The app is built in three phases matching the 30-day learning plan: React+Vite (Phase 1), Next.js migration (Phase 2), Python FastAPI backend (Phase 3).

## Requirements

- Paste raw text → Claude extracts structured proposal fields
- Proposals saved to Supabase (full CRUD)
- Sortable comparison table (multi-column, multi-proposal)
- Natural language Q&A over saved proposals ("which has the best yield?")
- Phase 1: React+Vite SPA, direct Supabase client, Claude API calls from frontend
- Phase 2: Next.js with API routes, server-side rendering, better auth
- Phase 3: Python FastAPI microservice handling AI extraction + NL queries

## Technical Approach

**Phase 1 — React+Vite SPA**
- Vite + React + TypeScript + MUI (familiar stack)
- Supabase JS client (direct from browser)
- Claude API called via a thin Vite proxy (`/api` → `api.anthropic.com`) to avoid CORS/key exposure
- Two Claude calls: (1) structured extraction (JSON mode), (2) NL query with proposals as context

**Phase 2 — Next.js**
- Migrate to Next.js App Router
- Move Claude + Supabase calls into Server Actions / Route Handlers (no more proxy needed)
- Add auth with Supabase Auth

**Phase 3 — Python FastAPI**
- FastAPI service for AI extraction and NL query endpoints
- Next.js calls FastAPI; FastAPI calls Claude + Supabase
- Enables heavier NLP, LangChain chains, local Llama experimentation

## Data Model

```sql
-- proposals table
id           uuid primary key default gen_random_uuid()
created_at   timestamptz default now()
raw_text     text                  -- original paste
title        text                  -- auto-generated or user-set label
location     text
developer    text
price_sqm    numeric
gross_yield  numeric               -- percent
completion_date date
payment_plan text
currency     text default 'USD'
notes        text                  -- user freeform notes
```

## Extraction Prompt Contract

Claude returns a JSON object matching the schema above (minus id/created_at/raw_text). Unknown fields return `null`. Use ISO 8601 for `completion_date`. This contract must stay stable across phases — only the call site moves. Validate with Zod before saving.

---

## Implementation Phases

### Phase 1: React+Vite Foundation

**Goal**: Working app — paste text, extract, save, compare, ask questions.

Tasks:

- [ ] 1.1 Scaffold project: `npm create vite@latest propiq -- --template react-ts`, install MUI, Supabase JS, Anthropic SDK
- [ ] 1.2 Configure Vite proxy for Claude API (`/api/claude` → Anthropic) so the API key stays in `.env` and never ships to the browser
- [ ] 1.3 Create Supabase project, run `proposals` table migration, copy env vars
- [ ] 1.4 Build `ProposalInput` component — textarea + "Extract" button
- [ ] 1.5 Write `extractProposal(rawText)` service — calls Claude with structured extraction prompt, parses + validates JSON response with Zod
- [ ] 1.6 Build `ProposalReview` component — shows extracted fields in an editable form before saving
- [ ] 1.7 Write `saveProposal(data)` service — upserts to Supabase
- [ ] 1.8 Build `ProposalTable` component — MUI DataGrid or Table, sortable columns, loads all proposals
- [ ] 1.9 Build `NLQueryBar` component + `queryProposals(question, proposals)` service — sends proposals as JSON context to Claude, renders answer as markdown
- [ ] 1.10 Wire up routing: `/` = input+table, `/proposals/:id` = detail view
- [ ] 1.11 `.env.example` + README with setup steps

### Phase 2: Next.js Migration

**Goal**: Move to Next.js App Router, server-side Claude/Supabase, add auth.

Tasks:

- [ ] 2.1 Create Next.js app (`create-next-app`, TypeScript, App Router, Tailwind or keep MUI)
- [ ] 2.2 Port `proposals` Supabase schema (same migration, new project or same)
- [ ] 2.3 Implement `/api/extract` Route Handler — receives raw text, calls Claude server-side, returns structured JSON
- [ ] 2.4 Implement `/api/query` Route Handler — receives NL question + proposal IDs, fetches from Supabase server-side, calls Claude
- [ ] 2.5 Migrate `ProposalInput` + `ProposalReview` as Client Components calling the new API routes
- [ ] 2.6 Build Server Component for `ProposalTable` (SSR initial load, client sort/filter)
- [ ] 2.7 Add Supabase Auth (email magic link) — protect the app behind login
- [ ] 2.8 Row-level security in Supabase so users only see their own proposals

### Phase 3: Python FastAPI AI Service

**Goal**: Offload AI work to a FastAPI microservice; experiment with LangChain/Llama.

Tasks:

- [ ] 3.1 Scaffold FastAPI project: `propiq-api/`, `pyproject.toml`, `uvicorn`, `anthropic`, `langchain`, `supabase-py`
- [ ] 3.2 Implement `POST /extract` endpoint — same extraction logic as Phase 2 but in Python; use LangChain `LLMChain` with output parser
- [ ] 3.3 Implement `POST /query` endpoint — retrieval over proposals, NL answer generation
- [ ] 3.4 Experiment: swap extraction LLM for local Llama (via `ollama` or `llama-cpp-python`) behind a feature flag
- [ ] 3.5 Update Next.js API routes to call FastAPI instead of calling Claude directly
- [ ] 3.6 Dockerise FastAPI service (`Dockerfile` + `docker-compose.yml` with Next.js + FastAPI)
- [ ] 3.7 Deploy: FastAPI to Fly.io or Railway, Next.js to Vercel; update env vars

---

## Risks & Considerations

- **API key exposure (Phase 1)**: Vite proxy mitigates this for dev; document that Phase 1 is not production-safe without a proper backend.
- **Claude JSON reliability**: Extraction prompt must include explicit fallback instructions (`return null for unknown fields`). Add a validation layer (Zod) before saving.
- **Supabase free tier limits**: proposals table is small; not a real risk, but note connection pooling if load grows.
- **Phase 2 MUI → Tailwind decision**: MUI works in Next.js App Router but requires the `'use client'` boundary carefully. Decide early whether to keep MUI or switch to Tailwind + shadcn/ui.
- **LangChain version churn (Phase 3)**: Pin to a specific LangChain version and test extraction output before declaring it stable.
- **CORS in Phase 3**: FastAPI must allow Next.js origin; use `fastapi.middleware.cors`.

---

## Progress Tracking

- [ ] Phase 1 complete
- [ ] Phase 2 complete
- [ ] Phase 3 complete

---

## Notes

_Space for discoveries, decisions, and adjustments during implementation._

- Extraction prompt should request ISO date format for `completion_date` to avoid locale ambiguity.
- Consider a "confidence" field in extracted JSON so UI can flag uncertain values.
