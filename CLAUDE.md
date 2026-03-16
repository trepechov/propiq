# CLAUDE.md — PropIQ

## What this project is

PropIQ is an AI-powered real estate proposal analyser built as the main project during a 30-day AI dev learning sprint. Users paste raw proposal text and Claude extracts structured fields; proposals are stored in Supabase and comparable in a sortable table with natural language Q&A.

## Implementation spec

Always read `SPEC.md` before starting work. It contains the full phased task breakdown, data model, and risk notes.

## Architecture overview

**Phase 1 (current):** React + Vite SPA. Claude API calls go through a Vite `/api` proxy so the API key never reaches the browser. Supabase JS client is used directly from the frontend.

**Phase 2:** Migrate to Next.js App Router. Claude + Supabase calls move into Route Handlers / Server Actions.

**Phase 3:** Add a Python FastAPI service to handle all AI extraction and NL query work. Next.js calls FastAPI; FastAPI calls Claude and Supabase.

## Key files

| File | Purpose |
|------|---------|
| `src/services/extractProposal.ts` | Claude extraction call — returns typed `Proposal` |
| `src/services/queryProposals.ts` | Claude NL query call — takes question + proposals array |
| `src/services/supabase.ts` | Supabase client, CRUD helpers |
| `src/types/proposal.ts` | `Proposal` type and Zod validation schema |
| `supabase/migrations/001_proposals.sql` | Database schema |
| `vite.config.ts` | Vite proxy config for `/api → api.anthropic.com` |

## Extraction prompt contract

Claude must return a JSON object with these fields (null for unknown):

```
title, location, developer, price_sqm, gross_yield,
completion_date (ISO 8601), payment_plan, currency
```

This contract must stay stable across phases — only the call site changes. Validate with Zod before saving to Supabase.

## Coding conventions

- TypeScript strict mode
- MUI v5 for UI components (Phase 1–2); decision to switch to Tailwind + shadcn/ui comes at Phase 2 start
- Zod for all external data validation (Claude responses, Supabase reads)
- Services are plain async functions, not classes
- Co-located types — `Proposal` type lives next to the Supabase service

## Environment variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=        # server-side only via Vite proxy
```

Never commit `.env`. The Vite proxy ensures `ANTHROPIC_API_KEY` is never bundled into client code.

## Daily workflow

1. Read `SPEC.md` — check which tasks are next
2. Implement the task
3. Mark the task complete in the spec (`- [x]`)
4. Commit
