# PropIQ Implementation Spec

**Created**: 2026-03-16
**Updated**: 2026-03-17
**Status**: In Progress

## Overview

PropIQ is an AI-powered real estate proposal analyser. Users paste raw proposal text (from PDFs, emails, etc.) and Gemini extracts structured fields — location, developer, price/sqm, yield, completion date, payment plan. Proposals are persisted in Supabase, displayed in a sortable comparison table, and users can query proposals with natural language ("which has the best yield for a 5-year hold").

The app is built in three phases matching the 30-day learning plan: React+Vite (Phase 1), Next.js migration (Phase 2), Python FastAPI backend (Phase 3).

## Requirements

- Paste raw text → Gemini extracts structured proposal fields
- Proposals saved to Supabase (full CRUD)
- Sortable comparison table (multi-column, multi-proposal)
- Natural language Q&A over saved proposals ("which has the best yield?")
- Phase 1: React+Vite SPA, direct Supabase client, Gemini API calls via Vite proxy
- Phase 2: Next.js with API routes, server-side rendering, better auth
- Phase 3: Python FastAPI microservice handling AI extraction + NL queries

## Technical Approach

**Phase 1 — React+Vite SPA**
- Vite + React + TypeScript + MUI (familiar stack)
- Supabase JS client (direct from browser)
- Gemini API called via a thin Vite proxy (`/api` → `generativelanguage.googleapis.com`) to avoid CORS/key exposure
- Google AI SDK (`@google/generative-ai`) for typed Gemini calls
- Model: `gemini-2.0-flash` (free tier via Google AI Studio)
- Two Gemini calls: (1) structured extraction (JSON mode), (2) NL query with proposals as context

**Phase 2 — Next.js**
- Migrate to Next.js App Router
- Move Gemini + Supabase calls into Server Actions / Route Handlers (no more proxy needed)
- Add auth with Supabase Auth

**Phase 3 — Python FastAPI**
- FastAPI service for AI extraction and NL query endpoints
- Next.js calls FastAPI; FastAPI calls Gemini + Supabase
- Uses `google-generativeai` Python SDK
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
completion_date date
payment_plan text
currency     text default 'EUR'
notes        text                  -- user freeform notes
```

## Extraction Prompt Contract

Gemini must return a JSON object matching the schema above (minus id/created_at/raw_text). Unknown fields return `null`. Use ISO 8601 for `completion_date`. Enable JSON mode via `responseMimeType: 'application/json'` in the Gemini API call. This contract must stay stable across phases — only the call site moves. Validate with Zod before saving.

---

## Implementation Phases

### Phase 1: React+Vite Foundation

**Goal**: Working app — paste text, extract, save, compare, ask questions.

Tasks:

- [x] 1.1 Scaffold project: `npm create vite@latest propiq -- --template react-ts`, install MUI, Supabase JS, Google AI SDK
- [x] 1.2 Configure Vite proxy for Gemini API (`/api` → `generativelanguage.googleapis.com`) so the API key stays in `.env` and never ships to the browser
- [x] 1.3 Create Supabase project, run `proposals` table migration, copy env vars
- [ ] 1.4 Build `ProposalInput` component — textarea + "Extract" button
- [ ] 1.5 Write `extractProposal(rawText)` service — calls Gemini with structured extraction prompt + JSON mode, parses + validates response with Zod
- [ ] 1.6 Build `ProposalReview` component — shows extracted fields in an editable form before saving
- [ ] 1.7 Write `saveProposal(data)` service — upserts to Supabase
- [ ] 1.8 Build `ProposalTable` component — MUI DataGrid or Table, sortable columns, loads all proposals
- [ ] 1.9 Build `NLQueryBar` component + `queryProposals(question, proposals)` service — sends proposals as JSON context to Gemini, renders answer as markdown
- [ ] 1.10 Wire up routing: `/` = input+table, `/proposals/:id` = detail view
- [x] 1.11 `.env.example` + README with setup steps

### Phase 2: Next.js Migration

**Goal**: Move to Next.js App Router, server-side Gemini/Supabase, add auth.

Tasks:

- [ ] 2.1 Create Next.js app (`create-next-app`, TypeScript, App Router, Tailwind or keep MUI)
- [ ] 2.2 Port `proposals` Supabase schema (same migration, new project or same)
- [ ] 2.3 Implement `/api/extract` Route Handler — receives raw text, calls Gemini server-side, returns structured JSON
- [ ] 2.4 Implement `/api/query` Route Handler — receives NL question + proposal IDs, fetches from Supabase server-side, calls Gemini
- [ ] 2.5 Migrate `ProposalInput` + `ProposalReview` as Client Components calling the new API routes
- [ ] 2.6 Build Server Component for `ProposalTable` (SSR initial load, client sort/filter)
- [ ] 2.7 Add Supabase Auth (username + password, no email) — protect the app behind login;
      see auth spec notes below for design decisions
- [ ] 2.8 Row-level security in Supabase so users only see their own proposals

### Phase 3: Python FastAPI AI Service

**Goal**: Offload AI work to a FastAPI microservice; experiment with LangChain/Llama.

Tasks:

- [ ] 3.1 Scaffold FastAPI project: `propiq-api/`, `pyproject.toml`, `uvicorn`, `google-generativeai`, `langchain`, `supabase-py`
- [ ] 3.2 Implement `POST /extract` endpoint — same extraction logic as Phase 2 but in Python; use LangChain with Gemini output parser
- [ ] 3.3 Implement `POST /query` endpoint — retrieval over proposals, NL answer generation
- [ ] 3.4 Experiment: swap extraction LLM for local Llama (via `ollama` or `llama-cpp-python`) behind a feature flag
- [ ] 3.5 Update Next.js API routes to call FastAPI instead of calling Gemini directly
- [ ] 3.6 Dockerise FastAPI service (`Dockerfile` + `docker-compose.yml` with Next.js + FastAPI)
- [ ] 3.7 Deploy: FastAPI to Fly.io or Railway, Next.js to Vercel; update env vars

---

## Authentication Design Notes

### Username + password (no email)

Supabase Auth is email-centric, so the workaround is to store the username as
`{username}@propiq.local` internally and disable email confirmation in the Supabase
project settings. The user's display name is stored in `user_metadata.display_name`.

**Registration flow:** user enters username + password → app calls
`supabase.auth.signUp({ email: `${username}@propiq.local`, password, options: { data: { display_name: username } } })`.

**Login flow:** user enters username + password → app converts to the internal email
format and calls `supabase.auth.signInWithPassword()`.

### Password reset (no email, admin-only)

There is no self-service password reset because that requires email delivery.
Two-tier approach:

**v1 — Supabase dashboard (no code required):**
Admin goes to Supabase dashboard → Authentication → Users → finds the user → sets
a new password directly. Document this as the support procedure. Simple enough for
a small user base.

**v2 — In-app admin panel (optional, add when needed):**
A protected `/admin/users` route visible only to users with `role: 'admin'` in
`user_metadata`. Shows a list of all users; admin can set a new temporary password
for any user via a form. The form calls a Supabase Edge Function (or Next.js Route
Handler in Phase 2) that uses the Supabase Admin API
(`supabase.auth.admin.updateUserById(uid, { password })`) — this call requires the
service-role key and must never run in the browser. The user should be forced to
change the password on next login (track via a `must_change_password` flag in
`user_metadata`; cleared after the first password change).

### Admin role assignment

Set `role: 'admin'` in `user_metadata` manually via the Supabase dashboard for the
first admin user. Subsequent admin grants can be done through the admin panel.
Never derive admin status from a client-side field alone — always verify on the
server/edge function side using the service-role key.

---

## Risks & Considerations

- **API key exposure (Phase 1)**: Vite proxy mitigates this for dev; document that Phase 1 is not production-safe without a proper backend.
- **Gemini JSON reliability**: Use `responseMimeType: 'application/json'` in the API call to enforce JSON output. Add Zod validation before saving. Include explicit fallback instructions (`return null for unknown fields`).
- **Gemini free tier limits**: `gemini-2.0-flash` has generous free limits (15 req/min, 1M tokens/day on AI Studio). Switch to `gemini-1.5-flash` as fallback if quota issues arise.
- **Supabase free tier limits**: proposals table is small; not a real risk, but note connection pooling if load grows.
- **Phase 2 MUI → Tailwind decision**: MUI works in Next.js App Router but requires the `'use client'` boundary carefully. Decide early whether to keep MUI or switch to Tailwind + shadcn/ui.
- **LangChain + Gemini (Phase 3)**: Use `langchain-google-genai` package. Pin versions and test extraction output before declaring stable.
- **CORS in Phase 3**: FastAPI must allow Next.js origin; use `fastapi.middleware.cors`.

---

## Progress Tracking

- [ ] Phase 1 complete
- [ ] Phase 2 complete
- [ ] Phase 3 complete

---

## Notes

_Space for discoveries, decisions, and adjustments during implementation._

- 2026-03-17: Switched from Anthropic/Claude to Google Gemini (`gemini-2.0-flash`) — free credits via Google AI Studio.
- Extraction prompt should request ISO date format for `completion_date` to avoid locale ambiguity.
- Consider a "confidence" field in extracted JSON so UI can flag uncertain values.
- Gemini API key obtained from: https://aistudio.google.com/app/apikey
