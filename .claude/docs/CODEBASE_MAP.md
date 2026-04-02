# Codebase Map

> **Purpose**: X-ray vision into the codebase — WHERE things are located with file paths for instant navigation.
>
> **Related Docs**:
> - `ARCHITECTURE_GUIDE.md` - System design, patterns, and principles
> - `BUSINESS_LOGIC.md` - Domain business rules and formulas
> - `CODE_PRINCIPLES.md` - Code quality standards and hard limits

---

## Quick Reference: File Locations

### AI / Gemini

| Domain | Purpose | File Path |
|--------|---------|-----------|
| **AI helpers** | Gemini extraction helpers (`structuredExtract`, `researchExtract`) | `lib/ai/server.ts` |
| | NL search context builder and result resolver | `lib/ai/searchHelpers.ts` |
| **Prompts** | NL search query context template | `prompts/queryContext.ts` |
| | AI evaluation criteria (user-configurable) | `prompts/evaluationCriteria.ts` |

### Route Handlers (server-side, `app/api/`)

| Route | Method | Purpose | File Path |
|-------|--------|---------|-----------|
| `/api/extract/project` | POST | Gemini project field extraction | `app/api/extract/project/route.ts` |
| `/api/extract/units` | POST | Gemini units extraction | `app/api/extract/units/route.ts` |
| `/api/extract/neighborhood` | POST | Gemini neighborhood extraction | `app/api/extract/neighborhood/route.ts` |
| `/api/search` | POST | Natural language search | `app/api/search/route.ts` |

### Supabase Services (`lib/supabase/`)

| Entity | Purpose | File Path |
|--------|---------|-----------|
| **Client** | Browser Supabase client (anon key) | `lib/supabase/client.ts` |
| | Server Supabase client (cookie-based session) | `lib/supabase/server.ts` |
| **Projects** | Projects CRUD | `lib/supabase/projects.ts` |
| **Units** | Units CRUD | `lib/supabase/units.ts` |
| **Neighborhoods** | Neighborhoods CRUD | `lib/supabase/neighborhoods.ts` |
| **Payment Schemes** | Payment schemes CRUD (`getPaymentSchemes`, `savePaymentScheme`, `updatePaymentScheme`, `deletePaymentScheme`, `setDefaultScheme`, `getDefaultSchemeNames`, `getAllSchemesByProjectServer`) | `lib/supabase/projectPaymentSchemes.ts` |
| **Search Feedback** | Search feedback CRUD | `lib/supabase/searchFeedback.ts` |
| **Server Queries** | Bulk server-side queries (e.g., `getAllSchemesByProjectServer`) | `lib/supabase/server-queries.ts` |

### Domain Utilities (`lib/payment/`)

| Utility | Purpose | File Path |
|---------|---------|-----------|
| **Scheme parsing** | `parseSchemeNameToInstallments("20-80")` → installments array; `installmentsToSchemeName` → name string | `lib/payment/parseScheme.ts` |

### Auth

| Purpose | File Path |
|---------|-----------|
| Auth helpers — register, login, logout | `lib/auth.ts` |
| Auth state — browser client, `useAuth` hook | `context/AuthContext.tsx` |
| Route protection middleware | `middleware.ts` |

### Pages (`app/(protected)/`)

| Page | File Path |
|------|-----------|
| Projects list | `app/(protected)/projects/page.tsx` |
| Project detail/edit | `app/(protected)/projects/[id]/page.tsx` |
| Units list | `app/(protected)/units/page.tsx` |
| NL search | `app/(protected)/search/page.tsx` |
| Search helpers / OpportunityCard | `app/(protected)/search/SearchPage.helpers.tsx` |

### Components (`components/`)

| Component | Purpose | File Path |
|-----------|---------|-----------|
| `ProjectForm` | Create/edit project form, triggers scheme save on new project | `components/ProjectForm.tsx` |
| `ProjectFields` | Renders `PaymentSchemesPanel` (edit) or `PaymentScheduleEditor` (new) | `components/ProjectFields.tsx` |
| `PaymentSchemesPanel` | Tabbed scheme manager — owns its own schemes state, fetches from DB by `projectId` | `components/PaymentSchemesPanel.tsx` |
| `SchemeTabPanel` | Inline editor for an existing scheme (name, installments, price modifier, Make Default / Delete) | `components/SchemeTabPanel.tsx` |
| `NewSchemeTabPanel` | Editor panel for creating a new scheme | `components/NewSchemeTabPanel.tsx` |
| `PaymentScheduleEditor` | Payment rows editor (percentage + stage dropdown) used on new projects | `components/PaymentScheduleEditor.tsx` |

### Types (`types/`)

| Type | Purpose | File Path |
|------|---------|-----------|
| `ProjectPaymentScheme` | Interface + Zod schema for payment scheme records | `types/projectPaymentScheme.ts` |

### Database Migrations (`supabase/migrations/`)

| Migration | Purpose | File Path |
|-----------|---------|-----------|
| `001_proposals.sql` | Initial schema (projects, units, auth) | `supabase/migrations/001_proposals.sql` |
| `005_payment_schemes.sql` | `project_payment_schemes` table + partial unique index for default scheme enforcement | `supabase/migrations/005_payment_schemes.sql` |

---

## Quick Reference: Key Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `structuredExtract()` | `lib/ai/server.ts` | Gemini structured JSON extraction |
| `researchExtract()` | `lib/ai/server.ts` | Gemini research-style extraction |
| `buildProjectContext()` | `lib/ai/searchHelpers.ts` | Builds AI prompt context for one project (now includes schemes block) |
| `buildContextBlock()` | `lib/ai/searchHelpers.ts` | Assembles full context string for all projects |
| `resolveResult()` | `lib/ai/searchHelpers.ts` | Attaches schemes data to each NL search result |
| `parseSchemeNameToInstallments()` | `lib/payment/parseScheme.ts` | Converts scheme name string (e.g. `"20-80"`) to installments array |
| `installmentsToSchemeName()` | `lib/payment/parseScheme.ts` | Converts installments array back to name string |
| `getAllSchemesByProjectServer()` | `lib/supabase/server-queries.ts` | Bulk-fetches all schemes grouped by project ID (server-side) |
| `getPaymentSchemes()` | `lib/supabase/projectPaymentSchemes.ts` | Fetch all schemes for a project |
| `savePaymentScheme()` | `lib/supabase/projectPaymentSchemes.ts` | Insert new scheme |
| `updatePaymentScheme()` | `lib/supabase/projectPaymentSchemes.ts` | Update existing scheme |
| `deletePaymentScheme()` | `lib/supabase/projectPaymentSchemes.ts` | Delete a scheme |
| `setDefaultScheme()` | `lib/supabase/projectPaymentSchemes.ts` | Mark a scheme as default (DB partial unique index enforces one default) |

---

## Data Flow: Project Extraction (with Payment Scheme)

```
1. User pastes proposal text → ProjectForm
2. POST /api/extract/project → Gemini returns structured JSON incl. payment_scheme_name
3. Route Handler: parseSchemeNameToInstallments(payment_scheme_name) → installments
4. saveProject() → writes to `projects` table
5. savePaymentScheme({ is_default: true, installments }) → writes to `project_payment_schemes`
6. ProjectForm sets projectId → PaymentSchemesPanel fetches and renders schemes
```

## Data Flow: NL Search (with Payment Schemes)

```
1. User submits query → POST /api/search
2. Route Handler fetches projects + getAllSchemesByProjectServer()
3. buildContextBlock(projects, schemes) → injects Payment Schemes block per project
4. Gemini reasons over context → returns ranked results
5. resolveResult() attaches schemes to each result
6. SearchPage renders OpportunityCard with PaymentSchemesDisplay / SchemeChip
```

---

## Architecture Decision Records

**Why does `PaymentSchemesPanel` fetch its own schemes instead of receiving them as props?**

When a new project is saved, the parent form transitions: it writes the project, then sets `projectId` state, then triggers a page reload. If schemes were passed as props from the parent, the panel would receive the new `projectId` before the parent finished re-fetching — causing it to render with a stale or empty schemes list. By fetching internally on `projectId` change, the panel owns its data lifecycle and is immune to the parent's reload race.

**Why is `lib/payment/` a separate directory from `lib/supabase/`?**

Scheme name parsing is pure computation — no database, no AI. Placing it in `lib/supabase/` would imply a dependency that doesn't exist. The `lib/payment/` directory signals that this is domain logic specific to the payment subdomain, reusable by both the extraction pipeline and the UI without pulling in DB concerns.

**Why is the default scheme enforced by a DB partial unique index rather than application logic?**

A partial unique index on `(project_id, is_default) WHERE is_default = true` makes it impossible to have two default schemes even under concurrent writes. Application-level guards (e.g., "set all others to false before setting this one") are not atomic and can race. The DB constraint is the authoritative enforcement point.
