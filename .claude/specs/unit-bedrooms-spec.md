# Unit Bedrooms Field — Implementation Spec

**Created**: 2026-04-04
**Status**: Planning

## Overview

Add a `bedrooms` field (nullable integer) to the `units` entity. This field is meaningful only for `apartment` and `studio` unit types. It surfaces in the units table (sortable/filterable), the search pre-filter, the AI search context, the search result cards, and the AI extraction prompt so that bedroom count is auto-populated on import.

## Requirements

- `bedrooms` stored as nullable integer in the `units` DB table
- Auto-extracted by Gemini during unit import (add to extraction prompt)
- Displayed as a sortable column in the units table
- Filterable in the units table (`exactNumber` filter)
- Filterable in the search page pre-filter panel (`exactNumber` filter)
- Included in the AI search context so Gemini can reason about bedroom count
- Displayed in search result cards (UnitSummary line)
- BUSINESS_LOGIC.md updated with investor/family bedroom preference guidance

## Technical Approach

Nullable integer column — no DB constraint on range (some proposals list studios as 0 bedrooms). All existing places that loop over unit fields need `bedrooms` added. The AI extraction prompt is the most critical addition because it eliminates manual data entry. The Zod schema is the single source of truth for the shape; adding it there cascades validation everywhere.

---

## Implementation Phases

### Phase 1: Database + Types

**Goal**: Persist the field and type the whole codebase

Tasks:
- [ ] 1.1 Create `supabase/migrations/006_unit_bedrooms.sql` — `ALTER TABLE units ADD COLUMN bedrooms integer;` (nullable, no default, no check constraint)
- [ ] 1.2 Add `bedrooms: number | null` to the `Unit` interface in `types/unit.ts` under the Characteristics section
- [ ] 1.3 Add `bedrooms: z.number().int().nullable().default(null)` to `unitSchema` in `types/unit.ts`
- [ ] 1.4 Apply the migration in Supabase dashboard

**Risk**: Migration is irreversible once applied — verify column name and type before running.

---

### Phase 2: AI Extraction

**Goal**: Auto-populate `bedrooms` on import

Tasks:
- [ ] 2.1 Add `bedrooms` field to `RESPONSE_SHAPE_INSTRUCTIONS` in `app/api/extract/units/route.ts`:
  ```
  bedrooms  (number or null — number of bedrooms; 0 for studio, null if not applicable or unknown)
  ```
  Place it in the Characteristics group after `direction`.

**Risk**: Gemini may not populate bedrooms for garages/parking/storage. This is expected — null is correct for those unit types.

---

### Phase 3: Units Table Display + Filter

**Goal**: Show and filter bedrooms in the project units view

Tasks:
- [ ] 3.1 Add `Bedrooms` column to `UnitsTableHead` in `app/(protected)/projects/[id]/units/UnitRow.tsx` — between Direction and Status
- [ ] 3.2 Add `<TableCell align="right">{formatNumber(unit.bedrooms)}</TableCell>` to `UnitRow` — same position
- [ ] 3.3 Add `bedrooms` as a sortable column in `buildUnitComparator` in `app/(protected)/projects/[id]/UnitsPage.helpers.ts` — it follows the generic number branch, no special case needed
- [ ] 3.4 Add `exactNumber` filter config for `bedrooms` in `buildUnitFilterConfigs()` in `UnitsPage.helpers.ts`:
  ```ts
  { type: 'exactNumber', field: 'bedrooms', label: 'Bedrooms', placeholder: 'e.g. 2' }
  ```
  Place after the `floor` filter (both are exact-match integer fields).

---

### Phase 4: Search Integration

**Goal**: Bedrooms influence AI reasoning and user pre-filtering

Tasks:
- [ ] 4.1 Add `exactNumber` bedrooms filter to `SEARCH_UNIT_FILTER_CONFIGS` in `app/(protected)/search/SearchPage.filterConfigs.ts` — after `floor`, before area fields:
  ```ts
  { type: 'exactNumber', field: 'bedrooms', label: 'Bedrooms', placeholder: 'e.g. 2' }
  ```
- [ ] 4.2 Add `bedrooms` to the unit line in `buildProjectContext` in `lib/ai/searchHelpers.ts` — append after direction:
  ```ts
  u.bedrooms !== null ? `${u.bedrooms}BR` : null,
  ```
- [ ] 4.3 Add bedrooms to `UnitSummary` in `app/(protected)/search/SearchPage.helpers.tsx` — append after direction:
  ```ts
  if (unit.bedrooms !== null) parts.push(`${unit.bedrooms} bed${unit.bedrooms !== 1 ? 's' : ''}`)
  ```

---

### Phase 5: Documentation

**Goal**: Capture domain knowledge about bedroom preferences

Tasks:
- [ ] 5.1 Add "Unit Bedroom Count" section to `.claude/docs/BUSINESS_LOGIC.md`:
  - Small investors (yield-focused) prefer studios and 1-bed units: lower entry price, easier to rent, higher yield relative to price
  - Families purchasing for own use prefer 2+ bedrooms
  - Studios use `bedrooms = 0`; garages/parking/storage leave `bedrooms = null`
  - AI search uses this context when buyer intent is mentioned in the query

---

## Risks & Considerations

- **Schema migration is additive** — no existing data breaks; all existing rows get `bedrooms = null`
- **Zod schema** — `unitInsertSchema = unitSchema` alias means bedrooms is validated on insert automatically
- **UnitRow line limit** — `UnitRow.tsx` is currently ~144 lines; adding one column keeps it well under 300
- **UnitsPage.helpers.ts** — adding two items keeps it under 300 lines
- **SearchPage.filterConfigs.ts** — already has `floor` as `exactNumber`; bedrooms follows the same pattern

## Progress Tracking

- [ ] Phase 1 complete (DB + types)
- [ ] Phase 2 complete (AI extraction)
- [ ] Phase 3 complete (units table)
- [ ] Phase 4 complete (search integration)
- [ ] Phase 5 complete (documentation)

## Notes

_Space for discoveries and decisions during implementation._
