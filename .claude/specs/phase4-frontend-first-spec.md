# Phase 4-First: Frontend Components (Reordered Execution)

**Created**: 2026-03-26
**Status**: In Progress
**Parent spec**: `.claude/specs/nextjs-langchain-migration-spec.md`

---

## Overview

Execute Phase 4 (Frontend Components) before Phase 3 (Route Handlers + LangChain.js) so the Next.js app is usable and testable as soon as possible. All Supabase CRUD features (neighborhoods, projects, units) work immediately. AI features (extraction, search) show a graceful "coming soon" state backed by stub Route Handlers. Phase 3 later replaces stubs with real LangChain.js implementations — no UI rework required.

---

## Strategy: Stub Route Handlers

AI Route Handlers are created as stubs returning HTTP 501 with a clear message. The UI treats a non-2xx from these endpoints as "AI unavailable" and disables the relevant button. This means:
- CRUD flows are fully testable now
- AI extraction buttons exist in the UI but show a disabled/loading state
- No dead code — stubs become real in Phase 3

---

## Implementation Phases

### Phase A: Supabase Data Services

**Goal**: Port all 4 Supabase service files to `lib/supabase/`. No dependencies on Phase 3.

Tasks:
- [x] A.1 Port `src/services/neighborhoods.ts` → `lib/supabase/neighborhoods.ts`
      (functions: `getNeighborhoods`, `getNeighborhood`, `saveNeighborhood`, `updateNeighborhood`, `deleteNeighborhood`)
      Update import to use `lib/supabase/client.ts` browser client.
- [x] A.2 Port `src/services/projects.ts` → `lib/supabase/projects.ts`
      (functions: `getProjects`, `getProject`, `getProjectsByNeighborhood`, `saveProject`, `updateProject`, `deleteProject`)
- [x] A.3 Port `src/services/units.ts` → `lib/supabase/units.ts`
      (functions: `getUnits`, `getUnit`, `saveUnit`, `saveBulkUnits`, `updateUnit`, `deleteUnit`)
- [x] A.4 Port `src/services/searchFeedback.ts` → `lib/supabase/searchFeedback.ts`
      Keep `saveFeedback` (browser client). `getSearchFeedback` will be needed server-side in Phase 3
      — add it here too (browser version OK for now; Phase 3 uses server client directly).

---

### Phase B: Stub AI Route Handlers

**Goal**: Create stub endpoints so the UI can call them without crashing. Returns 501 with JSON error body.

Tasks:
- [x] B.1 Create `app/api/extract/project/route.ts` stub — POST, returns `{ error: "AI extraction coming in Phase 3" }` with status 501
- [x] B.2 Create `app/api/extract/units/route.ts` stub — same pattern
- [x] B.3 Create `app/api/extract/neighborhood/route.ts` stub — same pattern
- [x] B.4 Create `app/api/search/route.ts` stub — same pattern

Each stub must still include the auth guard (return 401 if no session) so that pattern is already correct when Phase 3 fills in the logic.

---

### Phase C: Pages + Components

**Goal**: All 4 protected pages ported as Client Components. Navigation works. CRUD is functional.

Tasks:
- [x] C.1 Port `src/pages/NeighborhoodsPage.tsx` → `app/(protected)/neighborhoods/page.tsx`
      - Replace with `'use client'` page
      - Use `lib/supabase/neighborhoods.ts`
      - Extraction calls `POST /api/extract/neighborhood` — handle 501 gracefully (show toast/alert, don't crash)
      - Replace all `<Link component={RouterLink}>` with `next/link`
      - Replace `useNavigate` with `useRouter` from `next/navigation`
- [x] C.2 Port `src/components/NeighborhoodForm.tsx` → `components/NeighborhoodForm.tsx` as Client Component
- [x] C.3 Port `src/pages/ProjectsPage.tsx` → `app/(protected)/projects/page.tsx`
      - Use `lib/supabase/projects.ts`
      - Extraction calls `POST /api/extract/project` — handle 501 gracefully
      - Replace React Router links/hooks with Next.js equivalents
- [x] C.4 Port `src/components/ProjectForm.tsx`, `ProjectForm.helpers.ts`, `ProjectFields.tsx` → `components/`
- [x] C.5 Port `src/pages/UnitsPage.tsx` → `app/(protected)/projects/[id]/units/page.tsx`
      - `useParams()` → `use(params)` (Next.js 15 + React 19 async params)
      - Extraction calls `POST /api/extract/units` — handle 501 gracefully
- [x] C.6 Port `src/components/UnitsImportForm.tsx`, `UnitsPreviewTable.tsx` → `components/`
- [x] C.7 Port `src/pages/SearchPage.tsx`, `SearchPage.helpers.tsx` → `app/(protected)/search/page.tsx`
      - Search calls `POST /api/search` — handle 501 gracefully (show "Search not yet available")
- [x] C.8 Port `src/components/FeedbackWidget.tsx` → `components/FeedbackWidget.tsx`
      - Calls `saveFeedback` from `lib/supabase/searchFeedback.ts` (browser) — unchanged

---

### Phase D: Verify & Build

**Goal**: Clean build, all routes navigable, CRUD works end-to-end in the browser.

Tasks:
- [x] D.1 Run `npm run build` — fix any TypeScript or ESLint errors
- [x] D.2 Run `npm run dev` — manually test:
      - Login / register / logout
      - Create, edit, delete a neighborhood
      - Create, edit, delete a project (linked to neighborhood)
      - Import units for a project
      - Navigate between all pages
      - AI extraction buttons present but disabled/error on click (expected)
      - Search page loads but shows "coming soon" (expected)
- [x] D.3 Commit: "feat: port all frontend components to Next.js App Router (Phase 4)"

---

## Risks & Considerations

- **`useParams` in Next.js 15**: params are async. Use `use(params)` in Client Components for `[id]` routes.
- **501 error handling**: pages calling AI stubs must NOT throw unhandled errors. Wrap fetch calls, catch non-2xx, show user-friendly message.
- **Existing stub pages**: `app/(protected)/neighborhoods/page.tsx`, `projects/page.tsx`, `search/page.tsx` are already stub files — overwrite them completely.
- **Import paths**: old `src/` imports (`../services/`, `../components/`, `../context/`) must all be updated to `@/` paths or relative paths from the new location.
- **`next/link` vs MUI `Button component={RouterLink}`**: In Next.js, use MUI `Button` with `component={Link}` where `Link` is from `next/link`.
- **`NEXT_PUBLIC_` env vars**: `lib/supabase/client.ts` uses `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`. Ensure `.env.local` has these values (not the old `VITE_` prefixed names).

---

## Progress Tracking

- [x] Phase A complete — Supabase data services
- [x] Phase B complete — Stub Route Handlers
- [x] Phase C complete — Pages + Components
- [ ] Phase D complete — Build passes, manually tested

---

## Notes

_Space for discoveries during implementation._
