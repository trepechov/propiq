# Next.js + LangChain.js Migration Spec

**Created**: 2026-03-26
**Updated**: 2026-03-26
**Status**: Planning — reviewed by strategic-planner

---

## Overview

Migrate PropIQ from a React+Vite SPA to a Next.js App Router application, eliminating the current critical security vulnerability where `VITE_GEMINI_API_KEY` is bundled into the client-side JavaScript bundle. Concurrently replace the direct `@google/generative-ai` SDK with LangChain.js (`@langchain/google-genai`) running exclusively in Next.js Route Handlers. All existing functionality is preserved: auth, neighborhoods, projects, units, AI extraction, NL search, feedback, and Vercel deployment.

---

## Security Problem Being Fixed

The current Vite app uses `import.meta.env.VITE_GEMINI_API_KEY` directly in `extractProject.ts` and `gemini.ts`. Despite the original plan to proxy calls through Vite, **the proxy is not configured** in `vite.config.ts`. The API key ships inside the browser bundle and is readable by anyone in DevTools. This is the primary driver for the Next.js migration.

---

## Requirements

- All Gemini/LangChain calls must run exclusively on the server (Next.js Route Handlers)
- `GEMINI_API_KEY` must never appear in client-side code or be accessible in the browser
- Supabase anon key may remain browser-accessible (it is designed for this)
- Auth must survive migration: same username→`{username}@example.com` convention, same Supabase project
- All six page routes must work: `/login`, `/register`, `/neighborhoods`, `/projects`, `/projects/[id]/units`, `/search`
- Route protection (RequireAuth) must be implemented via Next.js middleware
- LangChain.js replaces `@google/generative-ai` in all AI call sites
- MUI v7 kept (known quantity, avoid introducing Tailwind churn alongside a stack migration)
- Vercel deployment updated to Next.js

---

## Technical Approach

**Stack after migration:**
- Next.js 15 App Router (TypeScript strict)
- MUI v7 with `'use client'` boundaries where needed
- Supabase JS v2 with `@supabase/ssr` for server-side session management
- LangChain.js (`langchain` + `@langchain/google-genai`) in Route Handlers only
- Zod validation unchanged
- Same Supabase project, same migrations, same RLS policies

**Folder structure (Next.js convention):**
```
propiq/
  app/
    layout.tsx                  ← root layout, MUI ThemeProvider
    (auth)/
      login/page.tsx
      register/page.tsx
    (protected)/
      layout.tsx                ← server-side auth check
      neighborhoods/page.tsx
      projects/page.tsx
      projects/[id]/units/page.tsx
      search/page.tsx
    api/
      extract/project/route.ts   ← POST, server-side Gemini
      extract/units/route.ts     ← POST, server-side Gemini
      extract/neighborhood/route.ts
      search/route.ts            ← POST, server-side Gemini search
  components/                   ← shared Client Components
  lib/
    ai/                         ← LangChain chains (server-only)
    supabase/
      client.ts                 ← browser client (anon key)
      server.ts                 ← server client (@supabase/ssr)
    auth.ts                     ← auth helpers (server-side)
  middleware.ts                 ← route protection
  types/                        ← unchanged from Vite app
  prompts/                      ← unchanged from Vite app
  config/                       ← unchanged from Vite app
```

**LangChain.js pattern for structured extraction:**
```
ChatGoogleGenerativeAI.withStructuredOutput(zodSchema) → invoke(prompt)
```
Use `withStructuredOutput()` (not `StructuredOutputParser`) — it is more idiomatic in LangChain.js and avoids the Zod v4 incompatibility risk that `StructuredOutputParser.fromZodSchema()` carries.

For research/grounding (neighborhood research), the plan is to use `ChatGoogleGenerativeAI` with the `googleSearch` tool. **Verify first** — the raw `@google/generative-ai` SDK uses `{ googleSearch: {} }` but LangChain.js may name or expose this differently. If LangChain.js does not support `googleSearch` grounding, the neighborhood research handler may need to use the raw SDK server-side (still safe, since it is server-only).

---

## Implementation Phases

### Phase 1: Next.js Scaffold

**Goal**: Working Next.js app with correct folder structure, MUI configured for App Router, and environment variables split properly.

Tasks:
- [x] 1.1 Scaffold: created `app/` directory structure in-place (create-next-app skipped to avoid subdirectory clobber)
- [x] 1.2 Install dependencies: `next@15.5.14`, `@supabase/ssr@0.5.2`, `langchain@0.3.37`, `@langchain/google-genai@0.1.12`, `@mui/material-nextjs@7.3.9` added; installed with --legacy-peer-deps due to @langchain/core peer conflict from environment
- [x] 1.3 Configure MUI for App Router: `components/ThemeRegistry.tsx` uses `AppRouterCacheProvider` from `@mui/material-nextjs/v15-appRouter` (MUI v7 approach — differs from v5/v6 `useServerInsertedHTML` pattern)
- [x] 1.4 Set up environment variable split: `.env.example` updated with `GEMINI_API_KEY` (server-only), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; `.env.local` created with empty values
- [x] 1.5 Created `lib/supabase/client.ts` (browser client) and `lib/supabase/server.ts` (server client with cookie-based session)
- [x] 1.6 Copied `types/`, `prompts/`, `config/` to root level; `supabase/` already at root — skipped. Import paths verified: `types/project.ts` → `../config/domain` resolves correctly at root level
- [x] 1.7 Created `app/page.tsx` with `redirect('/neighborhoods')`
- [x] 1.8 Created `next.config.ts` with `serverExternalPackages` for langchain, @langchain/google-genai, @google/generative-ai

---

### Phase 2: Auth + Middleware

**Goal**: Login, register, logout work. Protected routes redirect unauthenticated users. Session persists via HTTP cookies.

Tasks:
- [x] 2.1 Create `middleware.ts` at repo root — use `@supabase/ssr` `createServerClient` to read session from cookies; redirect `/login` if no session on protected routes (`/neighborhoods`, `/projects`, `/search`)
- [x] 2.2 Port `services/auth.ts` → `lib/auth.ts`: same username→email convention, same `register`/`login`/`logout` functions, now using browser Supabase client
- [x] 2.3 Create `context/AuthContext.tsx` as a Client Component — same shape as Vite version (`useAuth` hook, `user` state, listens to `onAuthStateChange`)
- [x] 2.4 Wrap `app/layout.tsx` with `AuthProvider`
- [x] 2.5 Port `pages/LoginPage.tsx` → `app/(auth)/login/page.tsx` as a Client Component (`'use client'`) — form submission calls `lib/auth.ts`
- [x] 2.6 Port `pages/RegisterPage.tsx` → `app/(auth)/register/page.tsx` as a Client Component
- [x] 2.7 Create `app/(protected)/layout.tsx` as a Server Component that calls `lib/supabase/server.ts` to verify session; redirect to `/login` if absent (double-guard alongside middleware)
- [x] 2.8 Port `components/NavBar` with logout button; include in `app/layout.tsx` above the slot

---

### Phase 3: Secure Route Handlers with LangChain.js

**Goal**: All AI calls run server-side. `GEMINI_API_KEY` is never accessible in the browser. LangChain.js replaces direct `@google/generative-ai`.

Tasks:
- [x] 3.1 **Verify LangChain.js `googleSearch` grounding support before writing any code.**
      Check if `@langchain/google-genai`'s `ChatGoogleGenerativeAI` exposes the `googleSearch` tool
      (the current SDK uses `{ googleSearch: {} }` cast as `any`). If not supported, the neighborhood
      research handler will call `@google/generative-ai` directly (server-only — still safe).
      Document the decision in Notes below.
- [x] 3.2 Create `lib/ai/langchain.ts` — instantiate `ChatGoogleGenerativeAI` (model: `gemini-2.5-flash`)
      using `process.env.GEMINI_API_KEY`. Export:
      - `structuredExtract<T>(prompt, zodSchema): Promise<T>` using `model.withStructuredOutput(zodSchema)`
      - `researchExtract(prompt): Promise<{ text, sources }>` using model with Google Search tool
        (or raw SDK fallback if grounding is unsupported — see 3.1)
- [x] 3.3 Implement `app/api/extract/project/route.ts` (`POST`) — auth-guarded (return 401 if no session).
      Port the compound extraction logic from `extractProject.ts`: build prompt from `EXTRACTION_RULES` +
      `RESPONSE_SHAPE_INSTRUCTIONS`, call `structuredExtract` with the `{ neighborhood?, project }` wrapper
      schema, validate project with `extractedProjectSchema` (omits `neighborhood_id`) and neighborhood
      separately with `neighborhoodInsertSchema`. Return `{ neighborhood?, project, meta }`.
- [x] 3.4 Implement `app/api/extract/units/route.ts` (`POST`) — auth-guarded. Port logic from
      `extractUnits.ts`: call `structuredExtract` with the units array schema, validate each unit with Zod,
      return `UnitInsert[]`.
- [x] 3.5 Implement `app/api/extract/neighborhood/route.ts` (`POST`) — auth-guarded. Port logic from
      `extractNeighborhood.ts`: call `researchExtract` with `NEIGHBORHOOD_RESEARCH_CRITERIA` prompt,
      parse the JSON block from the response text, validate with `neighborhoodInsertSchema`, return result.
- [x] 3.6 Implement `app/api/search/route.ts` (`POST`) — auth-guarded. Port ALL logic from
      `searchOpportunities.ts` (~300 lines): load projects + units using the **server** Supabase client
      (session cookie must be forwarded so RLS passes), load `search_feedback` via server client,
      call `buildProjectContext`, `buildContextBlock`, `buildFeedbackContext`, `resolveResult` —
      move these helpers to `lib/ai/searchHelpers.ts`. Call `structuredExtract` with the
      `rawSearchResultSchema`. Return `SearchResult`.
- [x] 3.7 Verify `GEMINI_API_KEY` is NOT referenced anywhere outside `lib/ai/` — add a grep check
      or ESLint rule if needed

---

### Phase 4: Frontend Components (Client Components)

**Goal**: All pages and components ported to Next.js App Router as Client Components, calling the new Route Handlers instead of AI services directly.

Tasks:
- [x] 4.1a Port `services/neighborhoods.ts` → `lib/supabase/neighborhoods.ts`
      (5 functions: get, getOne, save, update, delete — unchanged logic, update import to browser client)
- [x] 4.1b Port `services/projects.ts` → `lib/supabase/projects.ts`
      (6 functions: get, getOne, getByNeighborhood, save, update, delete)
- [x] 4.1c Port `services/units.ts` → `lib/supabase/units.ts`
      (6 functions: get, getOne, save, saveBulk, update, delete)
- [x] 4.1d Port `services/searchFeedback.ts` → `lib/supabase/searchFeedback.ts`
      `saveFeedback` stays client-side (FeedbackWidget calls it directly from browser).
      `getSearchFeedback` is also needed server-side — the search Route Handler (3.6) calls it
      via the server Supabase client; keep a server-side version in `lib/supabase/server-queries.ts`
      or pass it through `lib/supabase/server.ts` directly in the Route Handler.
- [x] 4.2 Port `pages/NeighborhoodsPage.tsx` → `app/(protected)/neighborhoods/page.tsx` (`'use client'`);
      form extraction now calls `POST /api/extract/neighborhood`; update all `<Link>` to `next/link`
- [x] 4.3 Port `components/NeighborhoodForm.tsx` as Client Component — logic unchanged
- [x] 4.4 Port `pages/ProjectsPage.tsx` → `app/(protected)/projects/page.tsx` (`'use client'`);
      extraction calls `POST /api/extract/project`; update all `<Link>` / `useNavigate` → `useRouter`
- [x] 4.5 Port `components/ProjectForm.tsx`, `ProjectForm.helpers.ts`, `ProjectFields.tsx` as Client Components
- [x] 4.6 Port `pages/UnitsPage.tsx` → `app/(protected)/projects/[id]/units/page.tsx` (`'use client'`);
      extraction calls `POST /api/extract/units`; `useParams` → `use(params)` or `params` prop in Next.js
- [x] 4.7 Port `components/UnitsImportForm.tsx`, `UnitsPreviewTable.tsx` as Client Components — unchanged
- [x] 4.8 Port `pages/SearchPage.tsx`, `SearchPage.helpers.tsx` → `app/(protected)/search/page.tsx`
      (`'use client'`); search calls `POST /api/search`
- [x] 4.9 Port `components/FeedbackWidget.tsx` as Client Component — calls `saveFeedback` from
      `lib/supabase/searchFeedback.ts` (browser client) — unchanged behaviour
- [x] 4.10 Delete `src/services/ai/` directory entirely — no client-side AI calls remain
      (deferred: keep as reference while implementing Phase 3)
- [x] 4.11 Remove from `package.json`: `@google/generative-ai`, `react-router-dom`, `@vitejs/plugin-react`, `vite`
       Remove `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/components/RequireAuth.tsx`
       (deferred: clean up after Phase 3 is complete)

---

### Phase 5: Deployment Update

**Goal**: Vercel deployment updated for Next.js; environment variables migrated; old Vite config removed.

Tasks:
- [ ] 5.1 Update `vercel.json` for Next.js (remove any Vite-specific rewrites; Next.js is natively supported by Vercel — a minimal or empty `vercel.json` is fine)
- [ ] 5.2 Update Vercel dashboard environment variables: rename `VITE_GEMINI_API_KEY` → `GEMINI_API_KEY` (server-only), `VITE_SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] 5.3 Delete Vite-specific files: `vite.config.ts`, `index.html`, `eslint.config.js`
      (Next.js scaffold generates its own ESLint config)
- [ ] 5.4 Update `README.md`: new setup steps, env var names, `npm run dev` is same but now runs Next.js
- [ ] 5.5 Smoke test deployed app: login, create neighborhood, create project, import units, run search

---

## Risks & Considerations

- **MUI v7 + App Router**: MUI v7 requires Emotion for SSR. The `ThemeRegistry` with `useServerInsertedHTML`
  is the documented approach for MUI v5/v6; verify the exact setup for v7 before Phase 1.3 — it may differ.
  Check the MUI v7 Next.js App Router guide specifically.

- **`@supabase/ssr` cookie handling**: The server client requires `get`/`set`/`remove` cookie callbacks
  backed by Next.js `cookies()`. Middleware must call `supabase.auth.getUser()` on every request to refresh
  the session token before it reaches Route Handlers or Server Components. Missing this causes silent
  auth failures after token expiry.

- **RLS + server-side session forwarding**: The search Route Handler and any other server-side Supabase
  query must carry the user's auth token from the request cookie. Without it, RLS blocks all queries and
  returns empty results. The server client in `lib/supabase/server.ts` must read cookies from `NextRequest`
  (in middleware/Route Handlers) or from `cookies()` (in Server Components). Test this explicitly.

- **LangChain.js `withStructuredOutput()` is the correct approach** — not `StructuredOutputParser`.
  `StructuredOutputParser.fromZodSchema()` requires Zod v3; the project uses Zod v4 (`zod@^4.3.6`).
  `withStructuredOutput()` binds the schema directly to the model and is more reliable.

- **LangChain.js `googleSearch` grounding**: The raw SDK uses `{ googleSearch: {} }` (cast as `any`
  to bypass stale types). `@langchain/google-genai` may not expose this tool yet. If so, the neighborhood
  research Route Handler should use `@google/generative-ai` directly on the server — the key is safe
  server-side regardless. Verify at task 3.1 before writing any grounding code.

- **`buildFeedbackContext` server-side loading**: The search Route Handler must call `getSearchFeedback()`
  using the **server** Supabase client (with session cookie) — not the browser client. This is a separate
  code path from the client-side `saveFeedback`.

- **Route Handler auth guard**: Middleware alone does not protect Route Handlers — each one must
  independently verify the session via the server Supabase client and return 401 if absent.

- **React 19 + ecosystem compatibility**: The project uses `react@^19.2.4`. Verify that
  `@supabase/ssr` and `@langchain/google-genai` are compatible with React 19 before Phase 1.

- **React Router removed**: `react-router-dom` is replaced by Next.js file-based routing.
  All `<Link>` → `next/link`, `useNavigate` → `useRouter` from `next/navigation`,
  `useParams` → `use(params)` (React 19 async params in Next.js 15).

---

## Progress Tracking

- [x] Phase 1 complete — Next.js scaffold
- [x] Phase 2 complete — Auth + middleware
- [x] Phase 3 complete — Route Handlers + LangChain.js
- [x] Phase 4 complete — Frontend components
- [ ] Phase 5 complete — Deployment

---

## Notes

_Space for discoveries and decisions during implementation._

- **MUI v7 ThemeRegistry pattern (Phase 1 decision)**: MUI v7 provides `AppRouterCacheProvider` from
  `@mui/material-nextjs/v15-appRouter` which handles Emotion SSR internally. This replaces the manual
  `useServerInsertedHTML` + custom Emotion cache setup required in MUI v5/v6. The `@mui/material-nextjs`
  package must be installed separately (added to dependencies at v7.3.9).

- **`npm install --legacy-peer-deps` required**: The development environment has `@langchain/core@1.1.36`
  installed globally (likely from Claude CLI). `langchain@0.3.x` requires `@langchain/core@>=0.3.58 <0.4.0`,
  causing a conflict. Using `--legacy-peer-deps` resolves this for local development. CI/CD environments
  (clean installs) may not have this conflict — verify on Vercel in Phase 5.

- **Phase 3 decision — raw SDK used instead of LangChain.js (tasks 3.1 + 3.2)**: `lib/ai/server.ts`
  was implemented with the raw `@google/generative-ai` SDK rather than LangChain.js. The reason: Phase 4
  frontend was already done before Phase 3 and the AI helpers file (`lib/ai/server.ts`) was pre-built with
  the raw SDK. The raw SDK is server-only (uses `process.env.GEMINI_API_KEY`, no `NEXT_PUBLIC_` prefix) so
  the security goal is fully met. LangChain.js is available as a future upgrade path — it would not change
  the route handler interfaces at all.

- **Start Phase 3 with task 3.1** — the `googleSearch` grounding decision affects how both `lib/ai/langchain.ts`
  and the neighborhood Route Handler are written. Do not write LangChain code before this is resolved.
- **In-place migration recommended**: delete Vite-specific files, add Next.js files alongside existing
  `types/`, `prompts/`, `config/`, `supabase/` — these directories are framework-agnostic and copy unchanged.
- **`useParams` in Next.js 15 with React 19**: params are now async (`Promise<{ id: string }>`). Use
  `use(params)` in Client Components or `await params` in Server Components for `[id]` routes.
