# Search Pre-Filter Spec

## Goal
Allow users to narrow the project/unit dataset before the AI processes the search query,
reducing token usage and improving search relevance.

## Status
Phase 1: Complete

## Implementation

### UI
- Collapsible panel above query input (collapsed by default)
- "Enable pre-filter" checkbox — when off, all data goes to AI (legacy behaviour)
- Project filters: title/developer text, neighborhood, stage, max price/m², completion by
- Unit filters: type, floor, area, price (cascaded within filtered projects)
- Summary row: "N projects · M units" always visible

### Data flow
1. Page loads: fetch all projects, all available units, neighborhoods (parallel)
2. User sets filters: client-side `useTableFilter` narrows project+unit arrays
3. User clicks search: if pre-filter enabled, send `projectIds` + `unitIds` with query
4. Server: filters projects/units by provided IDs before building AI prompt
5. Server always re-enforces AVAILABLE status (independent of client IDs)

### Files changed
- `lib/supabase/units.ts` — added `getAllAvailableUnits()`
- `app/api/search/route.ts` — accepts `projectIds`/`unitIds` in body
- `app/(protected)/search/SearchPage.filterConfigs.ts` — new file with filter config builders
- `app/(protected)/search/SearchPreFilterPanel.tsx` — new collapsible panel component
- `app/(protected)/search/page.tsx` — state, hooks, modified handleSearch

## Key decisions
- Client loads data on mount (not lazily) for instant filter response
- Unit filter cascades within project-filtered set (automatic via useTableFilter rows prop)
- Empty projectIds guard prevents empty AI prompt
- Status filter omitted from unit filter bar (only AVAILABLE units are ever shown)
- Filter configs in separate `.ts` file (not `.tsx`) — no JSX, keeps SearchPage.helpers.tsx under 300 lines
