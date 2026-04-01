# Per-User AI Criteria Editor — Spec

**Created**: 2026-04-01
**Status**: Completed

## Overview

Each authenticated user can override the 4 AI prompt criteria used across PropIQ's extraction and search routes. Overrides are stored in Supabase with RLS; route handlers fall back to hardcoded TypeScript constants when no override exists. A tabbed settings page (`/criteria`) lets users view, edit, save, and reset each criterion.

## Requirements

- 4 editable criteria: `evaluation_criteria`, `query_context`, `extraction_rules`, `neighborhood_research`
- User overrides isolated via Supabase RLS (`auth.uid() = user_id`)
- Graceful fallback to TS constant defaults — no DB row = default behaviour
- Accessible from the NavBar user dropdown ("AI Criteria")
- Save per-tab, Reset to Default per-tab

## Technical Approach

- **DB**: `user_criteria` table with `(user_id, key)` unique constraint and RLS policy
- **Server helper**: `getUserCriteria(supabase, userId, key, defaultValue)` using `.maybeSingle()` — returns override or default
- **API**: `GET/PUT/DELETE /api/criteria` — auth-guarded, Zod key validation
- **UI**: `'use client'` page with MUI Tabs + large TextField (minRows=20) per criterion
- **Prompt defaults**: `prompts/defaults/*.md` — human-readable copies, not read at runtime

## Implementation Phases

### Phase 1: Database
**Goal**: Table, RLS, trigger

- [x] `supabase/migrations/004_user_criteria.sql` — table + CHECK constraint + UNIQUE + RLS policy + set_updated_at trigger
- [x] Run migration in Supabase dashboard

### Phase 2: Backend
**Goal**: Types, helper, API route

- [x] `types/userCriteria.ts` — `CRITERIA_KEYS`, `CriteriaKey`, `UserCriterion`, `UserCriteriaMap`
- [x] `lib/supabase/userCriteria.ts` — `getUserCriteria()` with `.maybeSingle()` fallback
- [x] `app/api/criteria/route.ts` — GET (all 4 with `isDefault` flag), PUT (upsert), DELETE (reset)
- [x] `prompts/defaults/*.md` — 4 documentation copies of TS defaults

### Phase 3: Route Handler Updates
**Goal**: All AI routes use per-user criteria

- [x] `app/api/extract/project/route.ts` — `extraction_rules` via `getUserCriteria`
- [x] `app/api/extract/units/route.ts` — `extraction_rules` via `getUserCriteria`
- [x] `app/api/extract/neighborhood/route.ts` — `neighborhood_research` via `getUserCriteria`
- [x] `app/api/search/route.ts` — `query_context` + `evaluation_criteria` added to existing `Promise.all` (at end, preserving destructuring indices)

### Phase 4: Frontend
**Goal**: Settings page + NavBar entry point

- [x] `app/(protected)/criteria/page.tsx` — tabbed editor, fetch on mount, Save + Reset per tab, success/error alerts
- [x] `components/NavBar.tsx` — AI Criteria MenuItem (TuneIcon) in user dropdown

## Key Decisions

- **`.ts` constants as defaults, not `.md` files** — avoids `fs.readFileSync` complexity in Next.js deployments; `.md` files are docs only
- **`maybeSingle()` not `single()`** — `.single()` throws on zero rows; `.maybeSingle()` returns `null`
- **Zod `z.enum(CRITERIA_KEYS)`** — validates key in PUT/DELETE; works because `CRITERIA_KEYS` is `as const`
- **Criteria at end of `Promise.all`** — search route already destructures 3 values; new criteria appended at positions 3 and 4

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/004_user_criteria.sql` | New |
| `types/userCriteria.ts` | New |
| `lib/supabase/userCriteria.ts` | New |
| `app/api/criteria/route.ts` | New |
| `app/(protected)/criteria/page.tsx` | New |
| `prompts/defaults/*.md` (×4) | New |
| `app/api/extract/project/route.ts` | Updated |
| `app/api/extract/units/route.ts` | Updated |
| `app/api/extract/neighborhood/route.ts` | Updated |
| `app/api/search/route.ts` | Updated |
| `components/NavBar.tsx` | Updated |
