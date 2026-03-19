# Vercel Test Deployment Spec

**Created**: 2026-03-19
**Updated**: 2026-03-19
**Status**: Planning

## Overview

Deploy the React+Vite PropIQ app to Vercel's free plan for shared testing.
This is a test deployment — not production. Goal: a public URL for a small
group of testers.

GitHub Actions provides a **manual-trigger-only** deployment workflow so
deploys happen intentionally, not on every commit.

---

## Key Finding: No Proxy Needed (Simpler Than Originally Planned)

The original spec assumed a Vite proxy was in place for the Gemini API key.
**It isn't.** The current code uses `VITE_GEMINI_API_KEY` directly in the
browser via the `@google/generative-ai` SDK. This means:

- **Test deployment path**: just set the env vars in Vercel — it works
- **The key is in the browser bundle** — acceptable for a small test group,
  not acceptable for public production. Moving it server-side is Phase H.2
  (optional, deferred).

---

## Env Vars Required

| Variable | Visibility | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Client (VITE_ prefix) | Copy from `.env` |
| `VITE_SUPABASE_ANON_KEY` | Client (VITE_ prefix) | Copy from `.env` |
| `VITE_GEMINI_API_KEY` | Client (VITE_ prefix) | Acceptable for test; move server-side later |

---

## Phase 1 — Vercel Project Setup (one-time, manual)

**Goal:** Connect the repo to Vercel and configure the project. Done once in
the Vercel dashboard / CLI — not automated.

- [ ] 1.1 Install Vercel CLI: `npm i -g vercel`
- [ ] 1.2 Run `vercel link` in the repo root — creates `.vercel/project.json`
      with `projectId` and `orgId` (needed for GitHub Actions)
      - Framework: **Vite** (auto-detected)
      - Build command: `npm run build`
      - Output directory: `dist`
- [ ] 1.3 Add `vercel.json` to repo root:
      ```json
      {
        "framework": "vite",
        "buildCommand": "npm run build",
        "outputDirectory": "dist"
      }
      ```
- [ ] 1.4 Set environment variables in Vercel dashboard
      (Settings → Environment Variables, scope: **Production + Preview**):
      - `VITE_SUPABASE_URL`
      - `VITE_SUPABASE_ANON_KEY`
      - `VITE_GEMINI_API_KEY`
- [ ] 1.5 Add Vercel `.vercel.app` deployment URL to Supabase allowed origins:
      Supabase dashboard → Authentication → URL Configuration →
      add `https://<project-name>.vercel.app` to Redirect URLs

---

## Phase 2 — GitHub Actions: Manual Deploy Workflow

**Goal:** A workflow that deploys to Vercel only when explicitly triggered —
never automatically on every commit.

### Trigger options (choose one)

**Option A — `workflow_dispatch` (recommended):**
Manually triggered from GitHub → Actions tab → "Run workflow" button.
Can choose branch at trigger time. No tagging required.

**Option B — Tag-based trigger:**
Push a tag like `git tag test-deploy && git push origin test-deploy`.
Deploy fires automatically. Good if you prefer CLI-driven deploys.

**Option C — Both (flexible):**
Support both `workflow_dispatch` and tag push. Start with A, add B later.

→ **Recommend Option A** for simplicity. Add tag trigger later if preferred.

### Required GitHub Secrets

Add these in GitHub → repo Settings → Secrets and variables → Actions:

| Secret | Where to find it |
|---|---|
| `VERCEL_TOKEN` | Vercel dashboard → Account Settings → Tokens → Create |
| `VERCEL_ORG_ID` | `.vercel/project.json` → `orgId` (after `vercel link`) |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` → `projectId` (after `vercel link`) |

### Workflow file

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  workflow_dispatch:
    inputs:
      target:
        description: 'Deploy target'
        required: true
        default: 'preview'
        type: choice
        options:
          - preview
          - production

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Pull Vercel project settings
        run: npx vercel pull --yes --environment=${{ github.event.inputs.target }} --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Build
        run: npx vercel build ${{ github.event.inputs.target == 'production' && '--prod' || '' }} --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Deploy
        run: npx vercel deploy --prebuilt ${{ github.event.inputs.target == 'production' && '--prod' || '' }} --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

**How to trigger:** GitHub → Actions → "Deploy to Vercel" → "Run workflow"
→ choose `preview` or `production` → Run.

- `preview` — deploys to a unique preview URL (safe for testing)
- `production` — deploys to the main `.vercel.app` domain

### Tasks

- [ ] 2.1 Create `.github/workflows/` directory
- [ ] 2.2 Create `.github/workflows/deploy.yml` with the workflow above
- [ ] 2.3 Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` to
      GitHub repo secrets
- [ ] 2.4 Push to GitHub; trigger the workflow manually for first deploy
- [ ] 2.5 Smoke test the live URL: app loads, Supabase data loads, AI
      extraction works, login/register works

---

## Phase 3 — (Optional) Move Gemini Key Server-Side

**Goal:** Remove `VITE_GEMINI_API_KEY` from the browser bundle for a more
secure setup. Deferred — not needed for a small test group.

When to do this: before making the URL publicly shareable, or if the API key
is quota-sensitive.

**Approach:** Create `api/gemini.ts` — a Vercel Serverless Function that
receives requests at `/api/gemini`, adds the API key server-side, and
forwards to Google's API. Update all AI service files to call `/api/gemini`
instead of using the SDK directly with the client-side key.

This requires:
- Creating `api/gemini.ts` (catch-all proxy function)
- Updating `src/services/ai/gemini.ts`, `extractProject.ts`,
  `extractNeighborhood.ts` to call the proxy instead of SDK directly
- Renaming `VITE_GEMINI_API_KEY` → `GEMINI_API_KEY` in Vercel env vars
  (drop the `VITE_` prefix so it's server-side only)

---

## Risks & Considerations

| Risk | Mitigation |
|---|---|
| `.vercel/project.json` committed to repo | Add `.vercel/` to `.gitignore` — org/project IDs aren't secrets but cleaner to exclude |
| Supabase CORS rejection in production | Add Vercel URL to Supabase allowed origins (Phase 1.5) |
| `workflow_dispatch` only available on default branch by default | Workflow file must be on `main` branch to show in Actions UI |
| Vercel free tier cold starts | First request after inactivity may be slow — acceptable for testing |
| Gemini API key in browser bundle | Acceptable for small test group; address in Phase 3 before wider rollout |

---

## Progress Tracking

- [ ] Phase 1 — Vercel project setup
- [ ] Phase 2 — GitHub Actions manual deploy workflow
- [ ] Phase 3 — (Optional) Move Gemini key server-side

---

## Notes

_Space for discoveries and decisions during deployment._
