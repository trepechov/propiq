# PropIQ — Implementation Plan

**Created**: 2026-03-17
**Status**: In Progress

## What we have

- React + Vite + TypeScript scaffold, Node 24, Supabase connected, Gemini (`gemini-2.5-flash`) connected
- Entity field configs: `domain.ts`, `projectFields.ts`, `neighborhoodFields.ts`, `unitFields.ts`
- Prompt files: `extractionRules.ts`, `evaluationCriteria.ts`, `queryContext.ts`
- Basic test page (textarea → Gemini → response)

## Data model (3 entities)

```
neighborhoods  (1)
    └── projects  (many)
            └── units  (many)
```

---

## Phase 1 — Data Foundation

**Goal**: Database ready. TypeScript types and Supabase services in place. Nothing visible yet.

- [x] 1.1 Write `supabase/migrations/001_schema.sql` — three tables with FK relationships, indexes on `project_id`, `neighborhood_id`, `status`
- [x] 1.2 Run migration in Supabase dashboard SQL editor
- [x] 1.3 Create `src/types/` — TypeScript interfaces for `Neighborhood`, `Project`, `Unit` derived from field configs
- [x] 1.4 Add Zod schemas to `src/types/` for validating Gemini extraction output
- [x] 1.5 Expand `src/services/supabase.ts` — CRUD helpers: `getProjects`, `getProject`, `saveProject`, `getUnits`, `saveUnit`, `getNeighborhoods`, `saveNeighborhood`

---

## Phase 2 — Import Flow

**Goal**: Paste raw proposal text → Gemini extracts all 3 entities → user reviews → saves to DB.

- [ ] 2.1 Write `src/services/extractProposal.ts` — calls Gemini with `EXTRACTION_RULES` + field schemas, returns `{ neighborhood, project, units[] }`, validates with Zod
- [ ] 2.2 Build `src/components/ImportForm.tsx` — textarea + "Extract" button, shows loading state
- [ ] 2.3 Build `src/components/ReviewExtraction.tsx` — editable form showing extracted neighborhood, project, and units side by side; "Save All" button
- [ ] 2.4 Wire import flow in `App.tsx`: `ImportForm` → `ReviewExtraction` → save → redirect to project

---

## Phase 3 — Browse & Compare

**Goal**: See all saved data. Compare projects. Understand the portfolio at a glance.

- [ ] 3.1 Build `src/components/ProjectsTable.tsx` — sortable table: name, neighbourhood, stage, price/m², yield, units available, completion date
- [ ] 3.2 Build `src/pages/ProjectDetail.tsx` — project info + units table (all statuses, sortable by floor/price/status/direction)
- [ ] 3.3 Build `src/components/NLQueryBar.tsx` — natural language question input; calls Gemini with `QUERY_CONTEXT` + `EVALUATION_CRITERIA` + saved projects as context; renders answer
- [ ] 3.4 Wire routing: `/` = projects table, `/import` = import flow, `/projects/:id` = detail

---

## Key decisions already made

| Decision | Choice | Reason |
|---|---|---|
| AI provider | Gemini `gemini-2.5-flash` | Free tier via Google AI Studio |
| Auth | None in Phase 1 | Single-user dev tool for now |
| UI library | Plain CSS for now, MUI later | MUI not yet installed |
| Import granularity | One paste → all 3 entities | Gemini extracts neighbourhood + project + units in one call |
| Units import strategy | All statuses (available + sold + booked) | Sold patterns reveal buyer preference |

---

## Progress

- [ ] Phase 1 complete
- [ ] Phase 2 complete
- [ ] Phase 3 complete
