# Vercel Test Deployment Spec

**Created**: 2026-03-19
**Status**: Planning

## Overview

Deploy the React+Vite PropIQ app to Vercel's free plan so others can test it after
Phase F (Authentication) is complete. This is a test/staging deployment, not production.
The main technical challenge is replacing the dev-only Vite proxy (used to keep the
Gemini API key off the browser) with a Vercel Serverless Function that does the same
job in production.

## Requirements

- App accessible at a public Vercel URL (free tier `.vercel.app` domain is fine)
- Gemini API key never reaches the browser — must stay server-side
- Supabase connection works in production (env vars set correctly)
- No code changes to how the client calls `/api/*` — only the proxy implementation changes
- Simple enough to set up in one session; no CI/CD needed yet

## Technical Approach

**The proxy problem:**
`vite.config.ts` proxies `/api → generativelanguage.googleapis.com` in dev only.
In production, Vite builds static files — no proxy process runs.

**The solution — Vercel Serverless Function:**
Create `api/gemini.ts` (or a catch-all `api/[...path].ts`) at the repo root.
Vercel auto-deploys any file under `api/` as a serverless function, mounted at the
same `/api/*` path. The function reads `GEMINI_API_KEY` from Vercel env vars
(server-side only, no `VITE_` prefix) and forwards the request to Google's API.
The client code calls `/api/...` identically in dev and production.

**Env var split:**
| Variable | Visibility | Where set |
|---|---|---|
| `VITE_SUPABASE_URL` | Public (in client bundle) | Vercel env vars |
| `VITE_SUPABASE_ANON_KEY` | Public (in client bundle) | Vercel env vars |
| `GEMINI_API_KEY` | Server-side only (no VITE_ prefix) | Vercel env vars |

**Supabase in production:**
The Supabase anon key is designed to be public — RLS enforces access control.
Auth (Phase F) adds RLS, but even before that the anon key exposure is expected
and safe for a test deployment with no sensitive data.

---

## Implementation Phases

### Phase 1 — Vercel Serverless Proxy

**Goal:** Replace the Vite proxy with a Vercel Serverless Function so the Gemini API
key stays server-side in production. No client code changes needed.

Tasks:

- [ ] 1.1 Create `api/gemini.ts` — a Vercel Serverless Function that:
      - Accepts any method (POST for Gemini calls)
      - Reads `GEMINI_API_KEY` from `process.env` (not `import.meta.env`)
      - Forwards the request to `https://generativelanguage.googleapis.com` with the
        API key appended as a query param (matching how the Vite proxy works today)
      - Streams the response back if the client requests streaming; otherwise returns
        the JSON body directly
      - Returns a 500 with a safe error message if the key is missing
- [ ] 1.2 Check how the client currently constructs the Gemini URL (which path segments
      after `/api` are used) — confirm `api/gemini.ts` covers all call patterns, or
      use a catch-all `api/[...path].ts` if multiple sub-paths are needed
- [ ] 1.3 Add `vercel.json` to the repo root with:
      - `"framework": "vite"` (tells Vercel this is a Vite app)
      - A rewrite rule routing `/api/*` to the serverless function if needed
        (Vercel auto-routes `api/` files, but explicit config avoids surprises)
- [ ] 1.4 Test locally with `vercel dev` — this runs the serverless function alongside
      the Vite dev server, proving the function works before deploying

---

### Phase 2 — Vercel Setup + Deploy

**Goal:** Connect the repo to Vercel, set env vars, and get a live URL.

Tasks:

- [ ] 2.1 Create a Vercel account (if not already) and install Vercel CLI: `npm i -g vercel`
- [ ] 2.2 Run `vercel` in the repo root — follow the prompts:
      - Link to or create a new Vercel project
      - Framework: Vite (auto-detected)
      - Build command: `npm run build` (default)
      - Output directory: `dist` (Vite default)
- [ ] 2.3 Set environment variables in Vercel dashboard
      (Settings → Environment Variables) for Production + Preview:
      - `VITE_SUPABASE_URL` — copy from `.env`
      - `VITE_SUPABASE_ANON_KEY` — copy from `.env`
      - `GEMINI_API_KEY` — copy from `.env` (**no** VITE_ prefix — server only)
- [ ] 2.4 Trigger a production deploy: `vercel --prod` or push to `main` branch
      (connect GitHub repo in Vercel dashboard for automatic deploys on push)
- [ ] 2.5 Smoke test the live URL:
      - App loads
      - Supabase data loads (existing neighborhoods / projects visible)
      - AI extraction works (paste proposal text → Gemini extracts fields)
      - Opportunity search works
      - No API key visible in browser network tab

---

### Phase 3 — Post-Deploy Checklist

**Goal:** Confirm the deployment is stable and document the URL for testers.

Tasks:

- [ ] 3.1 Check Supabase CORS settings — add the Vercel `.vercel.app` domain to the
      allowed origins in the Supabase project settings (Authentication → URL Configuration
      → Site URL and Redirect URLs)
- [ ] 3.2 Verify Supabase anon key RLS policies are in place before sharing the URL
      widely — after Phase F (Auth) these will lock data per user; before auth, all
      data is readable by anyone with the URL (acceptable for a closed test group)
- [ ] 3.3 Share the URL with testers; note: no auth yet if Phase F isn't complete —
      document this clearly so testers know the app is open
- [ ] 3.4 Add the live URL to the README and to the progress log
- [ ] 3.5 (Optional) Set up a custom preview URL alias in Vercel for easier sharing

---

## Risks & Considerations

| Risk | Mitigation |
|---|---|
| Vite proxy path doesn't match the serverless function path | Check `vite.config.ts` proxy target carefully; use catch-all `api/[...path].ts` if multiple sub-paths are used |
| Streaming responses from Gemini break in the serverless function | Test with `vercel dev` first; Vercel functions support streaming via `res.write()` / ReadableStream |
| `GEMINI_API_KEY` accidentally set with `VITE_` prefix | Double-check in Vercel dashboard — `VITE_` prefix means the value is bundled into client JS |
| Supabase CORS rejection in production | Add the `.vercel.app` domain to Supabase allowed origins before testing |
| Cold start latency on Vercel free tier | Acceptable for test deployment — first request after inactivity may be slow (~1–2s) |
| Open data before auth is complete | Document explicitly; only share URL with trusted testers until Phase F is live |

---

## Progress Tracking

- [ ] Phase 1 — Serverless proxy complete
- [ ] Phase 2 — Deployed to Vercel
- [ ] Phase 3 — Post-deploy verified

---

## Notes

_Space for discoveries and decisions during deployment._
