# PropIQ — Final Implementation Spec

**Created**: 2026-03-17
**Updated**: 2026-03-18
**Status**: In Progress — Phases A–D complete

---

## Overview

PropIQ is an AI-powered real estate investment analyser. Users import raw proposal text;
Gemini extracts structured data across three entities (Neighborhoods, Projects, Units).
The app surfaces investment opportunities, ranks them against personal criteria, and
learns from user feedback over time.

**Tech stack (current):** React + Vite + TypeScript, Supabase (PostgreSQL), Gemini `gemini-2.5-flash`

---

## What is already built ✅

- Vite + React + TypeScript scaffold, Node 24
- Supabase connected + 3-table schema (`neighborhoods`, `projects`, `units`)
- Gemini connected and tested
- Entity field configs: `domain.ts`, `projectFields.ts`, `neighborhoodFields.ts`, `unitFields.ts`
- TypeScript types + Zod schemas: `src/types/`
- Supabase CRUD services: `src/services/neighborhoods.ts`, `projects.ts`, `units.ts`
- Prompt strategy files: `src/prompts/extractionRules.ts`, `evaluationCriteria.ts`, `queryContext.ts`

---

## Data Model

```
neighborhoods (1)
    └── projects (many)
            └── units (many)

search_feedback (standalone — stores user ratings on opportunity search results)
```

**New table needed:** `search_feedback` — stores user accept/reject signals per search result
(added in Phase A migration).

---

## Screens

### 1. Neighborhoods (`/neighborhoods`)
- Table listing all saved neighborhoods (name, city, target buyers, project count)
- **Add**: single text field — user pastes any raw info about an area;
  Gemini uses `NEIGHBORHOOD_RESEARCH_CRITERIA` prompt to extract + enrich neighborhood fields
- **Edit**: click a row → single text field pre-filled with current data as text;
  Gemini re-processes and updates the record (including refreshing `ai_summary`)
- No delete (neighborhoods are shared across projects — archive instead if needed later)

### 2. Projects (`/projects`)
- Table listing all projects (title, neighborhood, stage, price/m², yield, unit count, completion)
- **Add**: single text field — user pastes raw proposal text;
  Gemini extracts project fields using `EXTRACTION_RULES`; user reviews extracted data before saving
- **Edit**: click a row → single text field pre-filled with current project data;
  Gemini re-processes and updates (user confirms before save)
- Units for a project accessible from the project row → links to Units screen filtered by project

### 3. Units (`/projects/:id/units`)
- Table of all units for a project (all statuses: available, booked, sold)
- Sortable by floor, price, status, direction
- **Add**: single text area for CSV-style input — user pastes a block of unit data
  (one unit per line, or tabular format from a sales list);
  Gemini parses each row into a structured `Unit` record; bulk insert after confirmation
- **Edit**: inline cell editing for status and notes (most common field updates)

### 4. Opportunity Search (`/search`)
- Plain text input — user describes what they are looking for
  (e.g. "2-bed apartment, south facing, under 120k EUR, good yield, low risk stage")
- On submit: Gemini queries the DB context (all projects + units + neighborhoods)
  against `EVALUATION_CRITERIA` and the user's query
- **Results format** — two sections returned side by side:
  - **5 Matching opportunities** — ranked by fit; each shows project + unit summary + match reason
  - **5 Non-matching opportunities** — why they don't fit; useful for learning preferences
- **Feedback per result**: thumbs up / thumbs down + optional text note
  → stored in `search_feedback` table for future refinement of criteria

---

## Prompt Files

| File | Purpose |
|---|---|
| `src/prompts/extractionRules.ts` | How to parse raw proposal text into Neighborhood + Project + Units ✅ |
| `src/prompts/evaluationCriteria.ts` | Investment scoring rules (yield, stage risk, orientation, red flags) ✅ |
| `src/prompts/queryContext.ts` | Gemini role + response style for NL queries ✅ |
| `src/prompts/neighborhoodResearchCriteria.ts` | **NEW** — How to research and enrich a neighbourhood from raw text |

---

## Implementation Phases

### Phase A — Foundation gaps + new DB table

**Goal**: Fill missing infrastructure before building screens.

- [x] A.1 Create `src/prompts/neighborhoodResearchCriteria.ts` — prompt for extracting and
      enriching neighborhood data (transport, demographics, buyer profile, area character)
- [x] A.2 Write `supabase/migrations/002_search_feedback.sql` — `search_feedback` table:
      `id`, `created_at`, `query_text`, `result_project_id` (FK → projects), `result_unit_id`
      (FK nullable → units), `match_type` ('matching'|'non_matching'), `rating` ('up'|'down'),
      `note` (text nullable)
- [x] A.3 Run migration: executed directly via inline pg client script
- [x] A.4 Add `SearchFeedback` type + Zod schema to `src/types/`
- [x] A.5 Add `saveFeedback` service to `src/services/`

---

### Phase B — Neighborhoods screen

**Goal**: Full CRUD for neighborhoods with AI-assisted add/edit.

- [x] B.1 Write `src/services/extractNeighborhood.ts` — Gemini call using
      `NEIGHBORHOOD_RESEARCH_CRITERIA`, returns validated `NeighborhoodInsert`
- [x] B.2 Build `src/pages/NeighborhoodsPage.tsx` — table with name, city, target buyers,
      project count columns; "Add Neighborhood" button
- [x] B.3 Build `src/components/NeighborhoodForm.tsx` — single textarea + "Research with AI"
      button → shows extracted fields in editable form → "Save" button
- [x] B.4 Wire edit: clicking a row opens `NeighborhoodForm` pre-populated with existing data
      serialised as text; Gemini re-extracts; user confirms before update
- [x] B.5 Add route `/neighborhoods` to `App.tsx`

---

### Phase C — Projects screen

**Goal**: Full CRUD for projects with AI-assisted add/edit.

- [x] C.1 Write `src/services/extractProject.ts` — Gemini call using `EXTRACTION_RULES`,
      returns `{ neighborhood?: NeighborhoodInsert, project: ProjectInsert }` validated with Zod.
      If neighborhood is extracted and not yet in DB → prompt user to save it first
- [x] C.2 Build `src/pages/ProjectsPage.tsx` — sortable table with key columns;
      "Add Project" button; row click → project detail
- [x] C.3 Build `src/components/ProjectForm.tsx` — single textarea + "Extract with AI" button
      → review extracted fields in editable form → "Save" button
- [x] C.4 Wire edit: same `ProjectForm` pre-populated; Gemini re-extracts on re-submit
- [x] C.5 Add route `/projects` to `App.tsx`

---

### Phase D — Units screen

**Goal**: Bulk import units from CSV-style text; view + edit per project.

- [x] D.1 Write `src/services/extractUnits.ts` — Gemini call that parses a CSV/tabular text
      block into `UnitInsert[]`; returns array validated with Zod; invalid rows skipped
- [x] D.2 Build `src/pages/UnitsPage.tsx` — table of all units for a project;
      project title in header, back link to /projects
- [x] D.3 Build `src/components/UnitsImportForm.tsx` — textarea for CSV input + "Parse with AI"
      → shows parsed units in a preview table → "Import All" button for bulk insert
- [x] D.3a Build `src/components/UnitsPreviewTable.tsx` — extracted preview table component
- [x] D.4 Add route `/projects/:id/units` to `App.tsx`

---

### Phase E — Opportunity Search screen

**Goal**: Natural language opportunity search with structured results + user feedback loop.

- [x] E.1 Write `src/services/searchOpportunities.ts` — loads all projects + available units
      from Supabase; sends to Gemini with `QUERY_CONTEXT` + `EVALUATION_CRITERIA` + user query;
      parses response into `{ matching: OpportunityResult[], nonMatching: OpportunityResult[] }`
- [x] E.2 Define `OpportunityResult` type: `{ project: Project, unit?: Unit, reason: string, score?: number }`
- [x] E.3 Build `src/pages/SearchPage.tsx` — query input + submit; renders two columns:
      "Matching (5)" and "Does Not Match (5)"; each card shows project/unit summary + reason
- [x] E.4 Build `src/components/FeedbackWidget.tsx` — thumbs up/down + optional note per result;
      calls `saveFeedback` on submit; button state locked after vote
- [x] E.5 Add route `/search` to `App.tsx`
- [ ] E.6 Feed stored feedback into subsequent searches — load recent `search_feedback` rows
      from Supabase and inject a summary into the Gemini prompt:
      "User previously rated these projects UP: X, Y; DOWN: Z" so results improve over time

---

### Phase F — Authentication

**Goal**: Username + password login; all data scoped to the logged-in user.
No email delivery. Admin resets passwords manually (v1: Supabase dashboard; v2: in-app admin panel).

#### Auth design

**Username → email mapping**: Supabase Auth requires an email address. Store each
username as `{username}@propiq.local` internally; display name comes from
`user_metadata.display_name`. Disable email confirmation in Supabase project settings
(Authentication → Email → "Confirm email" toggle off).

**Password reset (no email)**:
- v1 (no code): Admin resets via Supabase dashboard → Authentication → Users → set
  new password. Document as the support runbook.
- v2 (in-app, add when user base grows): Protected `/admin/users` route, gated by
  `role: 'admin'` in `user_metadata`. Admin selects a user and sets a new temporary
  password. The actual password update runs in a Supabase Edge Function using the
  service-role key (`supabase.auth.admin.updateUserById`). Set
  `user_metadata.must_change_password = true`; clear it after the user submits a new
  password on the forced-change screen. Never expose the service-role key to the
  browser.
- Admin role: set `role: 'admin'` in `user_metadata` manually via the Supabase
  dashboard for the initial admin user.

#### Tasks

- [x] F.1 Supabase config: disable email confirmation; note internal email format
      (`{username}@propiq.local`) in a code comment near the auth service
- [x] F.2 Write `src/services/auth.ts` — `register(username, password)`,
      `login(username, password)`, `logout()`, `getCurrentUser()` helpers;
      all handle the username ↔ internal-email conversion internally so callers
      never deal with fake emails
- [x] F.3 Build `src/pages/RegisterPage.tsx` — username + password + confirm-password
      fields; calls `register()`; redirects to `/` on success
- [x] F.4 Build `src/pages/LoginPage.tsx` — username + password fields; calls `login()`;
      redirects to `/` on success; link to register page
- [x] F.5 Add route guard — wrap protected routes with `<RequireAuth>` component
      (uses react-router Outlet pattern); redirects unauthenticated users to `/login`
- [ ] F.6 Add `user_id uuid references auth.users` column to `neighborhoods`,
      `projects`, and `units` tables (migration `003_add_user_id.sql`); backfill
      existing rows with the first admin `uid` or leave null and restrict via RLS
- [x] F.7 Enable RLS on all tables (Option B — authenticated-role full-access policies);
      migration `003_enable_rls.sql` — must be run manually in Supabase dashboard
- [ ] F.8 Update all Supabase service calls to pass `user_id: session.user.id` on insert
      (skipped — using Option B; no user_id column needed)
- [x] F.9 Auth state in AppBar: show logged-in username + Logout button; nav links
      hidden on login/register pages (user is not logged in there)
- [ ] F.10 (v2, optional) Build `src/pages/AdminUsersPage.tsx` — lists all users via a
       Supabase Edge Function; admin can set a new temporary password; sets
       `must_change_password` flag; add route `/admin/users` gated by admin role check
- [ ] F.11 (v2, optional) Build `src/pages/ChangePasswordPage.tsx` — shown automatically
       after login if `must_change_password` is true; clears the flag on success

---

### Phase G — Navigation + Polish

**Goal**: Working app with proper navigation, a usable UI, and any loose ends cleaned up.
Kept last because there will always be more to add as the app evolves.

- [ ] G.1 Build `src/components/NavBar.tsx` — links: Neighborhoods / Projects / Search;
      auth state (username + Logout button) wired from Phase F
- [ ] G.2 Add loading states and error boundaries to all pages
- [ ] G.3 Wire up `react-router-dom` fully: all routes registered in `App.tsx`
- [ ] G.4 Clean up `App.tsx` — remove test textarea, replace with router + nav
- [ ] G.5 Ongoing: UI improvements, empty states, mobile responsiveness, etc.

---

### Phase H — Vercel Test Deployment

**Goal:** Deploy to Vercel free plan so others can test the app. Not production — a shared test URL.
Full spec: `.claude/specs/vercel-deployment-spec.md`

The key challenge is replacing the dev-only Vite proxy (keeps Gemini API key off the browser)
with a Vercel Serverless Function that does the same job in production.

- [ ] H.1 Create `api/gemini.ts` — Vercel Serverless Function that forwards `/api/*` to
      Google's Gemini API using `GEMINI_API_KEY` from server-side env vars (deferred — key
      is currently client-side via VITE_ prefix, acceptable for test group)
- [x] H.2 Add `vercel.json` with Vite framework config
- [x] H.3 Connect repo to Vercel; set env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
      `VITE_GEMINI_API_KEY`)
- [x] H.4 Deployed successfully; app live on Vercel
- [ ] H.5 Add Vercel domain to Supabase allowed origins; share URL with testers
- [ ] H.6 Set up GitHub Actions manual deploy workflow (workflow_dispatch)

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Gemini JSON parsing failure on CSV units | Always wrap extraction in try/catch + show raw error to user; Zod errors map to field-level messages |
| Neighborhood not matched when adding project | Extract neighbourhood name from project text; fuzzy-match against existing DB records; if no match, offer "Create new neighbourhood" |
| Opportunity search context too large for Gemini | Summarise projects using `ai_summary` field rather than full records; keeps token count predictable |
| Feedback data too sparse to be useful early | Store it from day one; even 10–20 signals per query type will reveal patterns |
| Free tier Gemini rate limits on search (many projects) | Cache `ai_summary` per project; send summaries not full records to Gemini |

---

## Progress

- [x] Phase 1 / Data Foundation (schema, types, services) — COMPLETE
- [x] Phase A — Foundation gaps — COMPLETE
- [x] Phase B — Neighborhoods screen — COMPLETE
- [x] Phase C — Projects screen — COMPLETE
- [x] Phase D — Units screen — COMPLETE
- [x] Phase E — Opportunity Search — COMPLETE
- [x] Phase F — Authentication (core complete; F.6/F.8 skipped — Option B chosen)
- [ ] Phase G — Navigation + Polish
- [x] Phase H — Vercel Test Deployment
