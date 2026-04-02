# Architecture Guide

> **Context Loading**: This file is REFERENCED, not loaded. Consult when making architectural decisions.
>
> **Related Docs**:
> - `CODEBASE_MAP.md` - File locations, function tables, navigation
> - `BUSINESS_LOGIC.md` - Domain-specific business rules and formulas
> - `FRONTEND_DESIGN_SYSTEM.md` - UI patterns and styling

---

## Project Overview

**Project Name**: PropIQ

**Description**: AI-powered real estate proposal analyser. Users paste raw proposal text; Gemini extracts structured fields. Proposals are stored in Supabase, comparable in a sortable table, and queryable via natural language search.

**Key Characteristics**:
- Next.js 15 App Router (single deployment)
- All AI calls are server-side only (Route Handlers in `app/api/`)
- Supabase for persistence and auth (`@supabase/ssr` cookie-based sessions)
- Gemini via `@google/generative-ai` SDK — never imported client-side
- MUI v7 component library

---

## Project Structure

```
propiq/
├── app/
│   ├── api/                    # Server-side Route Handlers (AI + data writes)
│   │   ├── extract/            # Gemini extraction endpoints (project, units, neighborhood)
│   │   └── search/             # Natural language search endpoint
│   ├── (auth)/                 # Login / register pages
│   └── (protected)/            # Authenticated pages (projects, units, search, etc.)
│
├── components/                 # Shared React components
├── context/                    # React Context (AuthContext)
├── lib/
│   ├── ai/                     # Gemini helpers (server.ts, searchHelpers.ts)
│   ├── payment/                # Domain utilities for payment scheme parsing
│   └── supabase/               # Data services (one file per entity)
│
├── prompts/                    # AI prompt strings
├── types/                      # Shared TypeScript types
├── supabase/migrations/        # SQL migration files
└── middleware.ts               # Auth-based route protection
```

---

## Data Model

### Core Tables

| Table | Description |
|-------|-------------|
| `projects` | Top-level real estate project records (title, location, developer, price, etc.) |
| `units` | Individual units within a project (size, floor, price, etc.) |
| `neighborhoods` | Area-level data linked to projects |
| `project_payment_schemes` | Payment schemes per project — one default + optional alternatives |
| `user_criteria` | Per-user AI evaluation criteria for NL search |
| `search_feedback` | User feedback on NL search results |

### `project_payment_schemes` Schema

- `id` — UUID primary key
- `project_id` — FK to `projects`
- `name` — scheme label, e.g. `"20-80"`, `"30-30-40"` (matches `parseSchemeNameToInstallments` convention)
- `installments` — JSONB array of `{ percentage, stage }` objects
- `price_modifier_sqm` — flat EUR/m² delta on top of the project base price (0 for default scheme)
- `is_default` — boolean; enforced at DB level via partial unique index: only one default per project

**Default scheme enforcement**: A partial unique index `WHERE is_default = true` on `(project_id, is_default)` prevents multiple defaults at the database level without needing application-level guards.

---

## Architectural Principles

### AI Calls Are Always Server-Side

All Gemini calls live in Route Handlers under `app/api/`. The `GEMINI_API_KEY` has no `NEXT_PUBLIC_` prefix — Next.js never bundles it into client code. Client components call the Route Handlers; they never import `@google/generative-ai`.

### Supabase Client Split

Two distinct clients:
- `lib/supabase/client.ts` — browser client (anon key, no cookies). Used in client components.
- `lib/supabase/server.ts` — server client (cookie-based session). Used in Route Handlers and Server Components.

Never use the server client in client components or vice versa.

### Services Are Plain Functions

Data services (e.g., `lib/supabase/projects.ts`) export plain async functions — not classes. Types are co-located in the same file as the service that owns them.

### `lib/payment/` — Domain Utility Layer

`lib/payment/parseScheme.ts` handles the conversion between scheme name strings (e.g. `"20-80"`) and structured installment arrays. This is pure computation — no DB or AI calls. It is the single source of truth for name-to-installments mapping and is used by both the extraction pipeline and the UI.

---

## Key Patterns

### Component State Ownership: PaymentSchemesPanel

`PaymentSchemesPanel` fetches and owns its own schemes state from the DB directly — schemes are not passed in as props from the parent form. This is intentional.

**Why**: When a new project is saved, the parent form sets `projectId` and triggers a reload. If schemes were passed as props, there is a race where the tab panel receives the new `projectId` before the parent has finished re-fetching — causing the panel to render with a stale or empty schemes list. By fetching internally on `projectId` change, the panel controls its own data lifecycle and avoids this race.

**Pattern rule**: Components that manage a sub-entity linked by a foreign key (e.g., schemes linked to a project) should own their own fetch rather than receive the sub-entity list from a parent that is also transitioning state.

### Centralized Scheme Name Parsing (DRY)

`parseSchemeNameToInstallments` and `installmentsToSchemeName` in `lib/payment/parseScheme.ts` are the authoritative conversion functions. Do not inline scheme-name parsing logic anywhere else.

### Extraction Contract Stability

The Gemini extraction prompt contract (field names, output shape) must remain stable. Only call sites change. Validate all Gemini output with Zod before writing to Supabase.

For payment schemes: extraction produces a `payment_scheme_name` string (e.g. `"20-80"`), which is then converted to an installments array via `parseSchemeNameToInstallments` before DB insertion.

### Search Context Injection

`lib/ai/searchHelpers.ts` builds the AI prompt context for NL search. It accepts schemes alongside project data and injects a structured "Payment Schemes:" block so the AI can reason about payment flexibility across projects. All schemes (default + alternatives) must be included — see `BUSINESS_LOGIC.md` for the rationale.

---

## Where to Put New Code

| New Code Type | Location |
|---------------|----------|
| Gemini AI call | `app/api/<feature>/route.ts` (Route Handler, server-only) |
| Supabase CRUD service | `lib/supabase/<entity>.ts` |
| Domain computation (no DB/AI) | `lib/<domain>/<name>.ts` |
| Shared React component | `components/<ComponentName>.tsx` |
| Page | `app/(protected)/<feature>/page.tsx` |
| DB migration | `supabase/migrations/<NNN>_<description>.sql` |
| TypeScript type for DB entity | Co-locate in `types/<entity>.ts` or in the service file |
| AI prompt string | `prompts/<name>.ts` |

---

## Warning Signs

- **Gemini import in a non-route file**: `@google/generative-ai` must never appear outside `app/api/` or `lib/ai/`.
- **Server client in client component**: `lib/supabase/server.ts` must not be imported in any `"use client"` file.
- **Inline scheme name parsing**: Any code that manually splits a `"20-80"` string instead of calling `parseSchemeNameToInstallments` is a DRY violation.
- **Props threading schemes through parent**: If a parent component is also reloading on project save, pass `projectId` to the child and let it fetch its own data.

---

## Related Documentation

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [CODEBASE_MAP.md](./CODEBASE_MAP.md) | File locations, function tables | Finding code, navigating the project |
| [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) | Domain rules, payment scheme logic | Understanding domain decisions |
| [FRONTEND_DESIGN_SYSTEM.md](./FRONTEND_DESIGN_SYSTEM.md) | UI component patterns, MUI styling | Building or modifying UI |
