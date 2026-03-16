# PropIQ

AI-powered real estate proposal analyser.

Paste raw proposal text (emails, PDFs) and PropIQ extracts structured fields — location, developer, price/sqm, gross yield, completion date, payment plan. Proposals are saved and shown in a sortable comparison table. Ask natural language questions like *"which has the best yield for a 5-year hold?"*

---

## Features

- **AI extraction** — paste any raw proposal text; Claude returns structured JSON
- **Editable review** — confirm or correct extracted fields before saving
- **Comparison table** — sortable by any field across all saved proposals
- **Natural language queries** — ask questions over your saved proposals

---

## Stack evolution

| Phase | Stack | Status |
|-------|-------|--------|
| 1 | React + Vite + Supabase + Claude API via Vite proxy | Planned |
| 2 | Next.js App Router — Claude + Supabase move server-side | Planned |
| 3 | + Python FastAPI — handles all AI extraction and NL queries | Planned |

---

## Project structure (Phase 1 target)

```
propiq/
├── src/
│   ├── components/
│   │   ├── ProposalInput.tsx      # Paste area + Extract button
│   │   ├── ProposalReview.tsx     # Editable extracted fields form
│   │   ├── ProposalTable.tsx      # Sortable comparison table
│   │   └── NLQueryBar.tsx         # Natural language question input
│   ├── services/
│   │   ├── extractProposal.ts     # Claude extraction call
│   │   ├── queryProposals.ts      # Claude NL query call
│   │   └── supabase.ts            # Supabase client + CRUD
│   ├── types/
│   │   └── proposal.ts            # Proposal type + Zod schema
│   └── App.tsx
├── supabase/
│   └── migrations/
│       └── 001_proposals.sql
├── .env.example
└── vite.config.ts                 # Includes /api proxy for Claude
```

---

## Data model

```sql
id              uuid primary key default gen_random_uuid()
created_at      timestamptz default now()
raw_text        text
title           text
location        text
developer       text
price_sqm       numeric
gross_yield     numeric        -- percent
completion_date date
payment_plan    text
currency        text default 'USD'
status          text default 'watching'  -- watching | shortlisted | rejected
notes           text
```

---

## Getting started

```bash
# Install dependencies
npm install

# Copy env vars
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY

# Run Supabase migration
npx supabase db push

# Start dev server
npm run dev
```

---

## Implementation spec

See [`SPEC.md`](SPEC.md) for the full phased task breakdown.
