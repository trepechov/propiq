# Business Logic

> **Purpose**: Domain-specific business rules, formulas, and logic - the WHY behind how the system works.
>
> **Related Docs**:
> - `ARCHITECTURE_GUIDE.md` - System design and patterns
> - `CODEBASE_MAP.md` - File locations and navigation
> - `CODE_PRINCIPLES.md` - Code quality standards

---

## How to Use This File

This file documents **domain-specific business logic** that isn't obvious from reading the code. It answers "why does the system work this way?" rather than "where is the code?"

**IMPORTANT: This is a template.** Sections below contain example placeholders. When customizing for your project:
1. **DELETE the example rows/sections entirely** (don't just fill them in)
2. **ADD your actual content** following the same format
3. **REMOVE sections that don't apply** to your project

**When to update this file:**
- After implementing complex business rules
- When formulas or calculations are non-obvious
- When business decisions affect code structure
- After learning domain knowledge that future developers need

---

## Core Concepts

<!-- DELETE the example rows below and add your actual concepts -->

| Concept | Definition | Key Rule |
|---------|------------|----------|
| *Example: Order* | *A customer's purchase request* | *Must have at least one item* |

---

## Business Rules

<!-- DELETE the example section below and add your actual rules -->

### *Example: Pricing Rules*

**Rule**: *Discounts cannot exceed 50% of original price*

**Why**: *Prevents accidental/malicious extreme discounts*

**Implementation**: See `pricing.service.ts`

**Example**:
```
Input: 100% discount requested
Rule applied: Cap at 50%
Output: 50% discount applied
```

---

## Formulas and Calculations

<!-- DELETE the example section below and add your actual formulas -->

### *Example: Tax Calculation*

**Purpose**: *Calculate sales tax for an order*

**Formula**:
```
tax = subtotal * taxRate
total = subtotal + tax
```

**Variables**:
- `subtotal`: Sum of item prices
- `taxRate`: Jurisdiction-specific rate (0.0 - 0.15)

**Implementation**: `tax.service.ts`

---

## Process Flows

<!-- DELETE the example section below and add your actual flows -->

### *Example: Order Fulfillment*

```
1. Order placed - Payment captured
2. Inventory reserved - Stock decremented
3. Shipment created - Carrier notified
   └── If out of stock: Backorder created
4. Delivered - Order completed
```

**Business Rules Applied**:
- At step 2: Cannot oversell inventory
- At step 3: Carrier selected by cheapest rate

---

## State Transitions

<!-- DELETE the example section below and add your actual states -->

### *Example: Order Lifecycle*

```
PENDING → CONFIRMED → SHIPPED → DELIVERED
              ↓
          CANCELLED
```

**Transition Rules**:

| From | To | Trigger | Conditions |
|------|-----|---------|------------|
| PENDING | CONFIRMED | Payment success | Valid payment method |
| CONFIRMED | CANCELLED | User request | Within 24 hours |

---

## Domain Terminology

<!-- DELETE the example rows below and add your actual terms -->

| Term | Definition | Context |
|------|------------|---------|
| *SKU* | *Stock Keeping Unit - unique product identifier* | *Inventory management* |

---

## Configuration Parameters

<!-- DELETE the example rows below and add your actual parameters -->

| Parameter | Purpose | Default | Valid Range |
|-----------|---------|---------|-------------|
| *maxCartItems* | *Limit items per cart* | *50* | *1-100* |

---

## Edge Cases and Special Handling

<!-- DELETE the example section below and add your actual edge cases -->

### *Example: Zero-Quantity Orders*

**Scenario**: User submits order with 0 items

**Problem**: Would create invalid order record

**Solution**: Validation rejects at API layer

---

## Business Constraints

<!-- DELETE the example rows below and add your actual constraints -->

| Constraint | Reason | Enforcement |
|------------|--------|-------------|
| *Min order $10* | *Shipping cost economics* | *Checkout validation* |

---

## Integration Points

<!-- DELETE the example section below and add your actual integrations -->

### *Example: Payment Gateway*

**Purpose**: Process credit card payments

**Key Interactions**:
- We send: Card token, amount, currency
- We receive: Transaction ID, status

**Business Rules**:
- Retry failed payments up to 3 times

---

## Payment Schemes in AI Search

Each project has one default payment scheme and optionally multiple alternative schemes.
The default scheme represents the base unit prices (`price_modifier_sqm = 0`).
Alternative schemes have a flat EUR/m² modifier (positive = premium, negative = discount).

When building AI search context, ALL schemes for a project must be included so the AI
can reason about payment flexibility. Example: a project with a 20-80 optional scheme
is more investor-friendly than one with only a 90-10 scheme, even if 90-10 is the default.

The search context format per project:
```
Payment Schemes:
  • [name] [DEFAULT|OPTIONAL] — [installments summary] ([modifier description])
```

Installment trigger mapping (DB value → prompt label):
- `signing` → `signing`
- `act14` → `Act 14`
- `act15` → `Act 15`
- `act16` → `Act 16`

Evaluation criteria (in `evaluationCriteria.ts`) teaches the AI:
- 20-80 = HIGH investor appeal (low down payment, strong cash-on-cash return)
- 20-30-40-10 = MEDIUM (staged payments, requires milestone monitoring)
- 90-10 = LOW (maximum capital upfront, highest execution risk)

### Scheme Naming Convention

Scheme names encode the installment percentages in stage order:

```
"20-80"       → 20% at signing, 80% at Act 16
"30-30-40"    → 30% at signing, 30% at Act 14, 40% at Act 16
"20-30-40-10" → 20% at signing, 30% at Act 14, 40% at Act 15, 10% at Act 16
```

The first number is always the signing percentage. The last number is always the Act 16 percentage. Middle numbers fill in Act 14, then Act 15 (in that order). The canonical parsing implementation is `parseSchemeNameToInstallments` in `lib/payment/parseScheme.ts`.

### Default Scheme Enforcement

The database enforces exactly one default scheme per project via a partial unique index:

```sql
CREATE UNIQUE INDEX ON project_payment_schemes (project_id)
WHERE is_default = true;
```

This means the DB will reject any insert or update that would create a second default for the same project. Application code does not need (and should not implement) its own "set all others to false" guard — the constraint is atomic and race-safe.

### UI State Pattern: PaymentSchemesPanel Owns Its Own Schemes

`PaymentSchemesPanel` fetches schemes from the DB directly, keyed on `projectId` — it does NOT receive schemes as props from the parent form. This avoids a prop-cycle race: when a new project is saved, the parent sets `projectId` state and begins a reload. If schemes were passed as props, the panel would see the new `projectId` before the parent's reload completed, resulting in an empty or stale scheme list.

Rule: any component managing a child entity linked by FK should own its own fetch rather than receive the list from a reloading parent.

**Implementation files:**
- `lib/supabase/server-queries.ts` — `getAllSchemesByProjectServer()` bulk fetch
- `lib/supabase/projectPaymentSchemes.ts` — full CRUD for payment schemes
- `lib/payment/parseScheme.ts` — scheme name ↔ installments conversion (single source of truth)
- `lib/ai/searchHelpers.ts` — `buildSchemesBlock()`, `buildProjectContext()`, `buildContextBlock()`
- `app/api/search/route.ts` — fetches schemes after projects load, passes to context builder and result resolver
- `app/(protected)/search/SearchPage.helpers.tsx` — `PaymentSchemesDisplay` and `SchemeChip` render scheme chips on result cards

---

*This document captures domain knowledge that isn't obvious from the code. Keep it updated as business rules evolve.*
