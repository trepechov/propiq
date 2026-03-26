# CLAUDE.md — PropIQ

## What this project is

PropIQ is an AI-powered real estate proposal analyser built as the main project during a 30-day AI dev learning sprint. Users paste raw proposal text and Gemini extracts structured fields; proposals are stored in Supabase and comparable in a sortable table with natural language Q&A.

## Implementation spec

Always read `SPEC.md` before starting work. It contains the full phased task breakdown, data model, and risk notes.

## Architecture overview

**Current stack:** Next.js 15 App Router. Gemini API calls run exclusively in server-side Route Handlers (`app/api/`). `GEMINI_API_KEY` is never accessible in the browser. Supabase uses `@supabase/ssr` for cookie-based session management with both browser and server clients.

**Phase 3 (planned):** Add a Python FastAPI service to handle all AI extraction and NL query work. Next.js calls FastAPI; FastAPI calls Gemini and Supabase.

## Documentation structure

**This file (CLAUDE.md)**: Always loaded — contains core principles and PropIQ-specific context. Keep it concise.

**Detailed guides** (referenced, not auto-loaded — consult when needed):
- `.claude/docs/CODE_PRINCIPLES.md` — Code quality standards (hard limits, patterns)
- `.claude/docs/FILE_PRINCIPLES.md` — File organization (structure, naming)
- `.claude/docs/AGENT_GUIDE.md` — Base patterns for agent delegation
- `.claude/docs/ARCHITECTURE_GUIDE.md` — Project architecture and patterns
- `.claude/docs/CODEBASE_MAP.md` — File locations, function tables, navigation
- `.claude/docs/BUSINESS_LOGIC.md` — Domain-specific business rules and formulas
- `.claude/docs/FRONTEND_DESIGN_SYSTEM.md` — UI patterns and styling
- `.claude/docs/DELEGATE_GUIDE.md` — Agent delegation strategies
- `.claude/docs/DEBUG_GUIDE.md` — Systematic debugging methodologies
- `.claude/docs/POC_GUIDE.md` — Proof of concept patterns
- `.claude/docs/VERIFY_GUIDE.md` — Evaluate reviewer feedback critically
- `.claude/docs/KIRO_TASK_EXECUTION_GUIDE.md` — Development workflow for Kiro specs

## Available commands

| Command | Purpose |
|---------|---------|
| `/start` | Load essential project context (principles, architecture) |
| `/spec` | Create strategic implementation plan (saves to `.claude/specs/`) |
| `/delegate` | Delegate tasks to agents, keeping context clean |
| `/orchestrate` | Full workflow: analyze → implement → test → document → review |
| `/debug` | First-principles debugging for complex issues |
| `/poc` | Proof of concept to validate technical feasibility |
| `/commit` | Smart git commits with logical grouping |
| `/docs-update` | Analyze and update documentation |
| `/test` | Create QA test request documents |
| `/report` | Generate reviewer briefing documents |
| `/verify` | Evaluate reviewer feedback critically |
| `/kiro` | Execute tasks from Kiro implementation plans |
| `/kiro-create` | Create a new Kiro spec (requirements.md, design.md, tasks.md) |
| `/kiro-review` | Review completed Kiro tasks against specifications |

## Available expert agents

See `.claude/docs/DELEGATE_GUIDE.md` for detailed usage patterns.

| Agent | Purpose | When to use |
|-------|---------|-------------|
| `strategic-planner` | Implementation planning | Start of complex features |
| `senior-dev-consultant` | Expert advice | Architecture decisions, complex debugging |
| `senior-dev-implementer` | Production code | Complex features needing senior-level quality |
| `task-completion-validator` | Verify completeness | Before marking tasks done |
| `investigator` | Deep research | Bug investigation, API research |
| `codebase-analyzer` | Understand structure | Before adding new modules |
| `docs-explorer` | Documentation research | Library/API documentation lookup |
| `test-generator` | Create test suites | After implementing features |
| `docs-maintainer` | Update documentation | After significant changes |

**Quick reference:**
- Use `codebase-analyzer` instead of opening many files
- Use `docs-explorer` instead of loading extensive docs
- Run multiple agents in parallel when tasks are independent

## Key files

| File | Purpose |
|------|---------|
| `lib/ai/server.ts` | Gemini extraction helpers — `structuredExtract`, `researchExtract` |
| `lib/supabase/client.ts` | Browser Supabase client (anon key) |
| `lib/supabase/server.ts` | Server Supabase client (cookie-based session) |
| `lib/supabase/neighborhoods.ts` | Neighborhoods CRUD service |
| `lib/supabase/projects.ts` | Projects CRUD service |
| `lib/supabase/units.ts` | Units CRUD service |
| `lib/supabase/searchFeedback.ts` | Search feedback CRUD service |
| `app/api/extract/project/route.ts` | POST — server-side project extraction |
| `app/api/extract/units/route.ts` | POST — server-side units extraction |
| `app/api/extract/neighborhood/route.ts` | POST — server-side neighborhood extraction |
| `app/api/search/route.ts` | POST — server-side NL search |
| `middleware.ts` | Route protection (redirects unauthenticated users) |
| `context/AuthContext.tsx` | Auth state (browser client, `useAuth` hook) |
| `lib/auth.ts` | Auth helpers — register, login, logout |
| `supabase/migrations/001_proposals.sql` | Database schema |

## Extraction prompt contract

Gemini must return a JSON object with these fields (null for unknown):

```
title, location, developer, price_sqm,
completion_date (ISO 8601), payment_plan, currency
```

Use structured output mode to enforce JSON. This contract must stay stable — only the call site changes. Validate with Zod before saving to Supabase.

## Coding conventions

- TypeScript strict mode
- MUI v7 for UI components
- Supabase with `@supabase/ssr` (cookie-based sessions, server + browser clients)
- `@google/generative-ai` SDK used server-only in Route Handlers
- Zod for all external data validation (Gemini responses, Supabase reads)
- Services are plain async functions, not classes
- Co-located types — types live next to their Supabase service

## Core principles

### Ask before assuming

- When instructions are ambiguous, ask for clarification rather than assuming
- When multiple interpretations are possible, request specific details
- Clarify first, implement second

### Code quality (see CODE_PRINCIPLES.md for details)

| Rule | Limit |
|------|-------|
| Function length | Max 50 lines |
| Parameters | Max 4 (use object for more) |
| Nesting depth | Max 4 levels |
| File length | Max 300 lines |

### File organization (see FILE_PRINCIPLES.md for details)

- One responsibility per file
- Group by feature, not type
- Consistent naming conventions
- Temp files in `tools/tmp/` only

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=           # server-side only — never sent to the browser
```

Never commit `.env`. `GEMINI_API_KEY` has no `NEXT_PUBLIC_` prefix so Next.js never bundles it into client code.

## Daily workflow

1. Read `SPEC.md` — check which tasks are next
2. Implement the task
3. Mark the task complete in the spec (`- [x]`)
4. Run `/commit`

**Commit rules:** Never add `Co-Authored-By` lines to commit messages.

## Documentation maintenance

After implementing significant changes:
- Pattern used multiple times → update architecture guide
- Bug fixed with learnings → document in debugging guide
- New conventions emerge → update relevant guides

Run `/docs-update check` to analyse if documentation needs updating.
