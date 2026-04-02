# Payment Schemes Implementation Spec

**Created**: 2026-04-01
**Status**: Planning

## Overview

Each project currently has a single `payment_schedule` field (jsonb on `projects`, never shown in the UI) that gets extracted by AI but goes nowhere useful. This feature replaces it with a proper `project_payment_schemes` table, integrates scheme extraction into the project import flow, displays the default scheme on the projects list, and allows users to add alternative schemes with flat per-m² price adjustments on the project's units page.

## Background: Payment Scheme Economics

- **Low down-payment schemes (e.g. 20-80)**: Developer ties up less cash from the buyer during construction → charges a **flat premium per m²**. Preferred by investors who want to preserve capital (e.g. +€150/m²).
- **High down-payment schemes (e.g. 90-10)**: Buyer pays most upfront → developer offers a **flat discount per m²** (e.g. −€50/m²). Preferred by cash-rich buyers.
- The modifier is stored as **signed €/m²** (in the project's currency):
  - `+150` = €150/m² premium over the default scheme prices
  - `−50` = €50/m² discount off the default scheme prices
  - `0` = the default scheme — unit prices are always imported relative to this scheme

### Installment naming convention

The scheme name encodes the installment split:
- **First digit** = percentage paid **at signing** (contract date)
- **Last digit** = percentage paid **at Act 16** (project completion/handover)
- **Middle digits** (if any) = intermediate stage payments — Act 14 then Act 15 (in order)
- Middle payments are optional; the vast majority of schemes have 2 or 4 parts

Examples:
| Scheme name | Installments |
|-------------|-------------|
| `20-80` | 20% signing → 80% Act 16 |
| `90-10` | 90% signing → 10% Act 16 |
| `20-30-40-10` | 20% signing → 30% Act 14 → 40% Act 15 → 10% Act 16 |
| `10-20-30-30-10` | 10% signing → 20% Act 14 → 30% Act 15 → 30% Act 15 → 10% Act 16 (rare) |

This convention is used to:
1. Auto-derive installments from a name extracted by AI
2. Auto-generate a name from installments entered manually
3. Guide the AI extraction prompt

## Requirements

- Every project has exactly one default payment scheme (`is_default = true`).
- The default scheme is extracted from the proposal text during AI import and saved alongside the project — no extra manual step.
- Unit `price_sqm_vat` / `total_price_vat` values are for the default scheme.
- The default scheme name is visible as a column on the projects list page.
- Alternative schemes store a `price_modifier_sqm` (signed numeric, in the project's currency per m²); adjusted prices are computed client-side.
- Users can add, edit, and delete alternative schemes from the project's units page.
- The units page shows a scheme selector; selecting a scheme recalculates displayed prices.
- Existing `payment_schedule` jsonb column on `projects` must be migrated then removed.

## Current State

| What | Location | Notes |
|------|----------|-------|
| `projects.payment_schedule` | `supabase/migrations/001_schema.sql` | `PaymentInstallment[]` jsonb; extracted by AI but never shown |
| Extraction route | `app/api/extract/project/route.ts:59` | Includes `payment_schedule` in `RESPONSE_SHAPE_INSTRUCTIONS` |
| `PaymentSchedule` interface | `config/domain.ts:51` | Richer type: name, installments, investorAppeal, notes |
| `PAYMENT_SCHEDULE_PRESETS` | `config/domain.ts:71` | 3 presets: 20-80, 20-30-40-10, 90-10 |
| `Project` interface | `types/project.ts:22` | Has `payment_schedule: PaymentInstallment[] \| null` |
| `ProjectFields` UI | `components/ProjectFields.tsx` | No payment_schedule field rendered at all |
| Projects table | `app/(protected)/projects/page.tsx` | No scheme column |
| Unit prices | `types/unit.ts` / `units` DB table | `price_sqm_vat`, `total_price_vat` — base prices for default scheme |

## Technical Approach

### New table: `project_payment_schemes`

```sql
CREATE TABLE project_payment_schemes (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  project_id           uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name                 text        NOT NULL,   -- e.g. "20-80", "90-10"
  installments         jsonb       NOT NULL,   -- PaymentInstallment[]
  is_default           boolean     NOT NULL DEFAULT false,
  -- Flat adjustment per m² in the project's currency. Always 0 for default scheme.
  -- Positive = premium (investor low-down scheme), negative = discount (cash buyer).
  price_modifier_sqm   numeric     NOT NULL DEFAULT 0,
  notes                text
);

-- Enforce exactly one default per project
CREATE UNIQUE INDEX one_default_per_project
  ON project_payment_schemes (project_id)
  WHERE is_default = true;
```

### Scheme name parsing utility

```typescript
// lib/payment/parseScheme.ts

const MIDDLE_TRIGGERS = ['act14', 'act15'] as const

/**
 * Converts a scheme name like "20-80" or "20/30/40/10" into
 * PaymentInstallment[] following the domain convention:
 * first → signing, last → act16, middle(s) → act14, act15 in order.
 */
export function parseSchemeNameToInstallments(name: string): PaymentInstallment[] {
  const parts = name.split(/[-/]/).map(Number)
  if (parts.length < 2 || parts.some(isNaN)) return []

  return parts.map((pct, i) => {
    if (i === 0)              return { percentage: pct, trigger: 'signing' }
    if (i === parts.length - 1) return { percentage: pct, trigger: 'act16' }
    return { percentage: pct, trigger: MIDDLE_TRIGGERS[i - 1] ?? 'act15' }
  })
}

/**
 * Derives the canonical dash-separated name from installments.
 * e.g. [{20, signing}, {80, act16}] → "20-80"
 */
export function installmentsToSchemeName(installments: PaymentInstallment[]): string {
  return installments.map(i => i.percentage).join('-')
}
```

### AI extraction shape change

The AI now returns `payment_scheme_name` (a text string) instead of the full `payment_schedule` array. The API route converts the name to installments using `parseSchemeNameToInstallments`.

```
// New extraction field in RESPONSE_SHAPE_INSTRUCTIONS:
payment_scheme_name (string or null) — the payment split notation, e.g. "20-80" or "20-30-40-10".
  First number = % at signing. Last = % at Act 16 (completion). Any middle numbers = Act 14, Act 15.
  Extract null if the proposal does not mention a payment scheme.
```

### Project import flow (updated)

```
1. User pastes proposal text → POST /api/extract/project
2. AI returns { project: { ...fields, payment_scheme_name }, neighborhood? }
3. Route converts payment_scheme_name → PaymentInstallment[] via parseSchemeNameToInstallments
4. Route returns { project (without payment_schedule), defaultScheme: { name, installments } | null }
5. ProjectForm renders extracted scheme in PaymentScheduleEditor (user can review/adjust)
6. handleSave: saveProject() → savePaymentScheme({ is_default: true, price_modifier_sqm: 0, ... })
   Both in sequence; if scheme save fails, project already exists — user can re-save from edit form
```

### Price calculation (client-side, units page)

```typescript
function applySchemeModifier(
  unit: Unit,
  modifierSqm: number,
): { priceSqm: number | null; totalPrice: number | null } {
  if (modifierSqm === 0) return { priceSqm: unit.price_sqm_vat, totalPrice: unit.total_price_vat }

  const priceSqm = unit.price_sqm_vat != null
    ? unit.price_sqm_vat + modifierSqm
    : null

  const totalPrice = unit.total_area != null && priceSqm != null
    ? unit.total_area * priceSqm
    : null  // cannot recalculate without area

  return { priceSqm, totalPrice }
}
```

---

## Implementation Phases

### Phase 1: Database, Types & Scheme Parsing Utility

**Goal**: New table, TypeScript types, Zod schema, service functions, RLS, and the scheme-name parsing utility. Remove `payment_schedule` from projects.

Tasks:
- [ ] 1.1 Migration `005_payment_schemes.sql`:
  - Create `project_payment_schemes` table with all columns
  - Create partial unique index `one_default_per_project`
  - Enable RLS + `authenticated full access` policy (pattern from `003_enable_rls.sql`)
  - Migrate existing `payment_schedule` data: for each project where `payment_schedule` is not null, INSERT a default scheme row with `name = installmentsToSchemeName(payment_schedule)`, `is_default = true`, `price_modifier_sqm = 0`; for projects with null, INSERT a minimal default row (`name = 'Default'`, `installments = '[]'`)
  - Drop `payment_schedule` column from `projects`
- [ ] 1.2 New type file `types/projectPaymentScheme.ts`:
  - `ProjectPaymentScheme` interface (mirrors DB columns exactly)
  - `ProjectPaymentSchemeInsert` type (omit `id`, `created_at`, `updated_at`)
  - Zod schema `projectPaymentSchemeSchema`:
    - `name`: `z.string().min(1)`
    - `installments`: `z.array(paymentInstallmentSchema)` (reuse from project.ts — move to shared location)
    - `is_default`: `z.boolean().default(false)`
    - `price_modifier_sqm`: `z.number().default(0)`
    - `notes`: `z.string().nullable().default(null)`
- [ ] 1.3 Update `types/project.ts`:
  - Remove `payment_schedule` field from `Project` interface
  - Remove `paymentInstallmentSchema` (will be moved to shared location in 1.2)
  - Remove `payment_schedule` from `projectSchema`
- [ ] 1.4 Update `types/index.ts` to export `ProjectPaymentScheme` and `ProjectPaymentSchemeInsert`
- [ ] 1.5 New service file `lib/supabase/projectPaymentSchemes.ts`:
  - `getPaymentSchemes(projectId)` → `ProjectPaymentScheme[]` (default row first, ordered by `is_default DESC, name`)
  - `getDefaultPaymentScheme(projectId)` → `ProjectPaymentScheme | null`
  - `savePaymentScheme(data: ProjectPaymentSchemeInsert)` → `ProjectPaymentScheme`
  - `updatePaymentScheme(id, data: Partial<ProjectPaymentSchemeInsert>)` → `ProjectPaymentScheme`
  - `deletePaymentScheme(id)` → `void`
  - `setDefaultScheme(projectId, schemeId)` → UPDATE old `is_default=true` row to `false`, then new one to `true` (sequential, acceptable for single-user tool)
- [ ] 1.6 New utility `lib/payment/parseScheme.ts`:
  - `parseSchemeNameToInstallments(name: string): PaymentInstallment[]`
  - `installmentsToSchemeName(installments: PaymentInstallment[]): string`
  - Pure functions — no side effects, easy to unit test

### Phase 2: AI Extraction Integration & Default Scheme in Project Form

**Goal**: Default scheme extracted automatically from proposal text, saved on project import, and visible in the project form (editable before save).

Tasks:
- [ ] 2.1 Update `RESPONSE_SHAPE_INSTRUCTIONS` in `app/api/extract/project/route.ts`:
  - Replace `payment_schedule (array...)` field with `payment_scheme_name (string or null)`
  - Add explanation of the naming convention in the prompt so AI knows how to format it
  - Example: `"20-80" for 20% at signing, 80% at completion (Act 16)`
- [ ] 2.2 Update `extractedProjectSchema` in the extraction route:
  - Remove `payment_schedule` field
  - Add `payment_scheme_name: z.string().nullable().default(null)`
- [ ] 2.3 Update `POST /api/extract/project` handler:
  - After Zod validation, extract `payment_scheme_name` from result
  - Convert to installments via `parseSchemeNameToInstallments`
  - Return `defaultScheme: { name, installments } | null` alongside `project` in response
  - Remove `payment_schedule` from `project` in response
- [ ] 2.4 Update `ExtractProjectResponse` interface to include `defaultScheme`
- [ ] 2.5 New component `components/PaymentScheduleEditor.tsx`:
  - Preset picker: dropdown with `PAYMENT_SCHEDULE_PRESETS` names + "Custom" option
  - Selecting a preset: auto-populates name + installments via `parseSchemeNameToInstallments`
  - Installments list: each row shows `percentage` (number) + `trigger` (select from `PaymentTrigger` values)
  - Add / remove installment rows
  - Name field auto-updates via `installmentsToSchemeName` when installments change
  - Shows sum of percentages with amber warning if ≠ 100%
  - No `price_modifier_sqm` — that's only for alternative schemes
- [ ] 2.6 Update `components/ProjectFields.tsx`:
  - Add `PaymentScheduleEditor` section labelled "Default Payment Scheme"
  - `FieldValues` gains `defaultPaymentScheme: { name: string; installments: PaymentInstallment[] } | null`
- [ ] 2.7 Update `components/ProjectForm.tsx` + `ProjectForm.helpers.ts`:
  - `handleExtract`: populate `fields.defaultPaymentScheme` from `result.defaultScheme`
  - `handleSave`: after `saveProject(payload)`, if `defaultPaymentScheme` is set, call `savePaymentScheme({ project_id: savedProject.id, is_default: true, price_modifier_sqm: 0, ...defaultPaymentScheme })`
  - Edit mode: load existing default scheme via `getDefaultPaymentScheme(existing.id)` in the open effect; on save call `updatePaymentScheme` (if scheme exists) or `savePaymentScheme` (if not)
  - `serializeExistingProject` helper: remove `payment_schedule` reference
- [ ] 2.8 Add "Default Scheme" column to projects table (`app/(protected)/projects/page.tsx`):
  - Load schemes lazily: after projects load, call `getPaymentSchemes` for each project? → Too many requests
  - Better: a single server-side query via `server-queries.ts` that joins `project_payment_schemes` filtered by `is_default = true` (one query, returns map of `project_id → scheme_name`)
  - Add `getDefaultSchemeNames(projectIds: string[])` to `lib/supabase/server-queries.ts`
  - Show scheme name (e.g. "20-80") or "—" if none in the projects table

### Phase 3: Alternative Schemes Management (Edit Project Modal)

**Goal**: Users can view and manage all payment schemes (default + alternatives) directly from the Edit Project modal, with a full tabbed UI for adding, editing, and deleting schemes.

**UI location updated (2026-04-01):** `PaymentSchemesPanel` was originally placed on the units page. It has been moved into `ProjectFields` (rendered inside the Edit Project modal) for better discoverability and a cleaner units page.

Tasks:
- [x] 3.1 New component `components/PaymentSchemesPanel.tsx`:
  - Always-visible section with "Payment Schemes" heading (not collapsible)
  - MUI `<Tabs>` / `<Tab>` layout — one tab per scheme, plus a "+" tab at the end
  - Default scheme tab shows a "(Default)" chip badge; alternative tabs show the modifier chip
  - Active tab renders the full scheme editor inline (no dialog)
  - Composed of three sub-components: `SchemeTabPanel`, `NewSchemeTabPanel`
- [x] 3.2 New component `components/SchemeTabPanel.tsx` _(replaces SchemeFormDialog)_:
  - Inline editor for an existing scheme (name, price modifier, installments, notes)
  - Default scheme: modifier field locked to 0 with explanatory tooltip; Delete button hidden
  - Alternative schemes: Save and Delete buttons; delete requires inline confirmation step
- [x] 3.3 New component `components/NewSchemeTabPanel.tsx`:
  - Empty editor shown when "+" tab is active
  - "Create Scheme" button saves and switches the panel to the new tab
- [x] 3.4 `components/PaymentScheduleEditor.tsx` — preset picker removed:
  - The `<Select>` preset dropdown (using `PAYMENT_SCHEDULE_PRESETS`) has been removed
  - Users type the scheme name freely or add installments manually
  - All other functionality retained (installment rows, add button, percentage sum badge)
- [x] 3.5 Wire `PaymentSchemesPanel` into `ProjectFields` / Edit Project modal:
  - `ProjectFields` gains optional `projectId?: string` prop
  - When `projectId` is provided (edit mode): renders `PaymentSchemesPanel` with `schemes` state loaded via `getPaymentSchemes(projectId)` and refreshed by `onSchemesChanged`
  - When `projectId` is absent (new project): renders existing `PaymentScheduleEditor` for the default scheme
  - `ProjectForm` passes `projectId={existing?.id}` to `ProjectFields`
- [x] 3.6 Clean up units page:
  - Removed `getPaymentSchemes`, `PaymentSchemesPanel`, `applySchemeModifier` imports
  - Removed `schemes`, `activeSchemeId` state and `loadSchemes()` function
  - `load()` no longer fetches schemes — only `getProject` + `getUnits`
  - Removed scheme selector `<FormControl>/<Select>` from page header
  - Removed active scheme info `<Alert>` banner
  - Removed dynamic column header variables; headers revert to static "Price/m² (VAT)" and "Total Price (VAT)"
  - `UnitRow` receives `unit.price_sqm_vat` / `unit.total_price_vat` directly (no modifier applied)

### Phase 4: Price Adjustment on Units Page

**Goal**: Scheme selector on units page recalculates price display values for the active scheme.

**Note**: This phase is deferred. Scheme management has moved to the Edit Project modal. Price adjustment display on the units page may be revisited as a future enhancement.

Tasks:
- [ ] 4.1 `applySchemeModifier` helper remains in `UnitsPage.helpers.ts` (available for future use):
  - Pure function: `(unit, modifierSqm) → { priceSqm, totalPrice }`
  - Returns stored values unchanged when `modifierSqm === 0`
- [ ] 4.2 Add scheme selector to units page header (future):
  - MUI `<Select>` next to "Import Units" button
  - Options: all schemes for the project; default scheme selected on load
  - Each option: `"20-80  (Default)"` or `"90-10  −50 €/m²"`
  - Only shown when schemes are loaded and there are ≥ 2 schemes (no selector needed if only default exists)
- [ ] 4.3 Pass adjusted prices into `UnitRow` (future):
  - Compute adjusted values from active scheme in the `sorted` memo / render loop
  - Pass `displayPriceSqm` and `displayTotalPrice` as props to `UnitRow` (do not mutate unit objects)
- [ ] 4.4 Update units table column headers when non-default scheme is active (future):
  - "Price/m² (VAT)" → "Price/m² — 20-80 (+150 €/m²)"
  - "Total Price (VAT)" → "Total — 20-80"
  - Add an info chip below the header showing `Active scheme: 20-80  +150 €/m²` in amber

---

## Risks & Considerations

| Risk | Mitigation |
|------|-----------|
| `parseSchemeNameToInstallments` receives unexpected formats from AI (e.g. "20/80", "20% / 80%") | Normalise input: strip `%`, replace `/` with `-`, split, filter non-numeric parts |
| More than 4 parts in scheme name (rare 5-part schemes) | Map extra middle parts to `act15` — document as known limitation |
| `total_area` null on some units — can't recalculate adjusted total | `applySchemeModifier` returns `null` for `totalPrice`; display as `—` |
| Bulk scheme name loading on projects page (N queries) | Single query with `IN (project_ids)` + `WHERE is_default = true` in `getDefaultSchemeNames` |
| `saveProject` succeeds but `savePaymentScheme` fails on import | Project row exists without a default scheme. Handle: catch error in `handleSave`, show warning "Project saved but scheme failed — edit to retry"; do not roll back the project |
| Existing projects with null `payment_schedule` get a placeholder default scheme (`installments = []`) | These will show "Default" in the scheme column — acceptable; users can edit the scheme from the project form |
| Partial unique index on `is_default` — two concurrent INSERTs | Single-user tool; DB index enforces data integrity as a safety net |

## Progress Tracking

- [ ] Phase 1 complete — DB + types + parsing utility + services
- [ ] Phase 2 complete — AI extraction integration + default scheme in form + projects table column
- [x] Phase 3 complete — Alternative schemes management panel on units page (tabbed UI)
- [ ] Phase 4 complete — Price adjustment selector on units page

## Notes

_Space for discoveries and decisions during implementation._

- `config/domain.ts` has `PAYMENT_SCHEDULE_PRESETS` with the 3 canonical patterns. These are no longer used in `PaymentScheduleEditor` (preset picker removed). They may still be useful for AI prompt guidance.
- `investorAppeal` from `PaymentSchedule` in `domain.ts` is not stored in DB. Can be derived from `price_modifier_sqm` sign for badge colouring only.
- `paymentInstallmentSchema` is currently defined in `types/project.ts`. Move it to `types/projectPaymentScheme.ts` and re-export from `types/project.ts` for backward compat during the transition.
- The `price_modifier_sqm` label reads the project's `currency` field (already on the project row loaded by the units page).
- For the scheme name auto-update in `PaymentScheduleEditor`: debounce the `installmentsToSchemeName` call or only update when installments are valid (non-empty, sum to ~100%).
- Tab-based UI design decision (2026-04-01): inline editing reduces clicks (no dialog open/close cycle) and makes the default scheme's locked modifier field clearly visible at a glance alongside alternative schemes.
