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

- [ ] E.1 Write `src/services/searchOpportunities.ts` — loads all projects + available units
      from Supabase; sends to Gemini with `QUERY_CONTEXT` + `EVALUATION_CRITERIA` + user query;
      parses response into `{ matching: OpportunityResult[], nonMatching: OpportunityResult[] }`
- [ ] E.2 Define `OpportunityResult` type: `{ project: Project, unit?: Unit, reason: string, score?: number }`
- [ ] E.3 Build `src/pages/SearchPage.tsx` — query input + submit; renders two columns:
      "Matching (5)" and "Does Not Match (5)"; each card shows project/unit summary + reason
- [ ] E.4 Build `src/components/FeedbackWidget.tsx` — thumbs up/down + optional note per result;
      calls `saveFeedback` on submit; button state locked after vote
- [ ] E.5 Add route `/search` to `App.tsx`

---

### Phase F — Navigation + Polish

**Goal**: Working app with proper navigation and a usable UI.

- [ ] F.1 Build `src/components/NavBar.tsx` — links: Neighborhoods / Projects / Search
- [ ] F.2 Add loading states and error boundaries to all pages
- [ ] F.3 Wire up `react-router-dom` fully: all routes registered in `App.tsx`
- [ ] F.4 Clean up `App.tsx` — remove test textarea, replace with router + nav

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
- [ ] Phase E — Opportunity Search
- [ ] Phase F — Navigation + Polish
