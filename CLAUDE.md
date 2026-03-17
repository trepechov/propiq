# CLAUDE.md — PropIQ

## What this project is

PropIQ is an AI-powered real estate proposal analyser built as the main project during a 30-day AI dev learning sprint. Users paste raw proposal text and Claude extracts structured fields; proposals are stored in Supabase and comparable in a sortable table with natural language Q&A.

## Implementation spec

Always read `SPEC.md` before starting work. It contains the full phased task breakdown, data model, and risk notes.

## Architecture overview

**Phase 1 (current):** React + Vite SPA. Claude API calls go through a Vite `/api` proxy so the API key never reaches the browser. Supabase JS client is used directly from the frontend.

**Phase 2:** Migrate to Next.js App Router. Claude + Supabase calls move into Route Handlers / Server Actions.

**Phase 3:** Add a Python FastAPI service to handle all AI extraction and NL query work. Next.js calls FastAPI; FastAPI calls Claude and Supabase.

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
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=        # server-side only via Vite proxy
```

Never commit `.env`. The Vite proxy ensures `ANTHROPIC_API_KEY` is never bundled into client code.

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
