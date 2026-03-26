# Vite Cleanup Spec

**Created**: 2026-03-26
**Status**: Planning
**Parent spec**: `.claude/specs/nextjs-langchain-migration-spec.md` (tasks 4.10, 4.11)

---

## Overview

Remove all Vite/React Router remnants now that the Next.js migration is complete and Phase 3 AI route handlers are working. Delete the `src/` directory, remove unused packages, regenerate a clean `package-lock.json`.

---

## What to Remove

### Files / Directories

| Path               | Why                                                                           |
| ------------------ | ----------------------------------------------------------------------------- |
| `src/`             | Entire old Vite source tree — all superseded by `app/`, `components/`, `lib/` |
| `index.html`       | Vite entry point — Next.js uses `app/layout.tsx`                              |
| `vite.config.ts`   | Vite bundler config — replaced by `next.config.ts`                            |
| `eslint.config.js` | Old Vite-era ESLint config — Next.js generates its own                        |

Note: `src/config/`, `src/prompts/`, `src/types/` are duplicates of root-level `config/`, `prompts/`, `types/` (copied during migration). Safe to delete with the rest of `src/`.

### Packages to Remove

**devDependencies (definitely remove):**

- `vite` — old bundler
- `@vitejs/plugin-react` — Vite-specific plugin
- `eslint-plugin-react-refresh` — Vite dev-server HMR plugin
- `globals` — was used by old `eslint.config.js`, not needed by Next.js ESLint
- `@types/pg` — Postgres types, not used in Next.js app
- `pg` — Postgres client, not used in Next.js app

**dependencies (unused, safe to remove):**

- `react-router-dom` — replaced by Next.js file-based routing
- `langchain` — installed for Phase 3 but raw `@google/generative-ai` SDK was used instead; not imported anywhere in the codebase
- `@langchain/google-genai` — same; not imported anywhere in the codebase

**dependencies (keep):**

- `@google/generative-ai` — used by `lib/ai/server.ts`
- Everything else — Next.js, MUI, Supabase, Zod

---

## Implementation

### Phase A: Delete Vite Files

Tasks:

- [x] A.1 Delete `src/` directory entirely
- [x] A.2 Delete `index.html`
- [x] A.3 Delete `vite.config.ts`
- [x] A.4 Delete `eslint.config.js`

### Phase B: Remove Packages + Regenerate Lockfile

Tasks:

- [x] B.1 Run `npm uninstall` for all packages listed above (one command)
- [x] B.2 Delete `package-lock.json`
- [x] B.3 Run `npm install` to regenerate a clean lockfile
- [x] B.4 Run `npm run build` to confirm build still passes

### Phase C: Verify + Commit

Tasks:

- [x] C.1 Confirm no `src/` imports remain in the codebase (grep check)
- [x] C.2 Confirm `GEMINI_API_KEY` does not appear anywhere (grep check)
- [x] C.3 Commit: "chore: remove Vite app, unused packages, regenerate lockfile"
- [x] C.4 Mark tasks 4.10 and 4.11 complete in the migration spec

---

## Risks & Considerations

- **`eslint.config.js` deletion**: Next.js uses `.eslintrc.json` or its own config. Deleting `eslint.config.js` should be safe — verify `npm run lint` still works after cleanup.
- **`langchain` / `@langchain/google-genai` removal**: These are installed but unused. If any future Phase 3 work wants LangChain, it can be re-added. Removing keeps the bundle lean.
- **`globals` package**: Used only by the old `eslint.config.js`. Once that file is deleted, `globals` serves no purpose.

---

## Progress Tracking

- [x] Phase A complete — Vite files deleted
- [x] Phase B complete — packages removed, lockfile regenerated
- [x] Phase C complete — verified and committed
