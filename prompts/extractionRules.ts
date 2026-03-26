/**
 * Rules injected into every Gemini extraction call.
 *
 * These tell Gemini HOW to interpret raw proposal text and map it to
 * the structured fields defined in src/config/. Edit freely — this is
 * plain text, not code.
 */

export const EXTRACTION_RULES = `
## Extraction Rules

You are a real estate data analyst. Extract structured information from the
raw proposal text below and return it as a JSON object.

### General Rules
- Return null for any field you cannot find or confidently infer.
- Do not invent or guess numerical values — null is better than wrong.
- All dates must be ISO 8601 format (YYYY-MM-DD). Use the 1st of the month
  if only month/year is given (e.g. "Q2 2026" → "2026-04-01").
- Currency defaults to EUR unless stated otherwise.

### Identifying the Three Entities
A single proposal document may describe:
1. A **Neighbourhood** — the area, district, or location context.
2. A **Project** — the specific building or development being offered.
3. One or more **Units** — individual apartments, studios, or garages.

Extract each entity separately. If a field belongs to the neighbourhood
(e.g. transport links, area demographics), put it in the neighbourhood
object, not the project.

### Building Stage Mapping
Map construction status to the closest stage value:
- "just started" / "foundation" → "building_started"
- "structure complete" / "shell done" / "roofed" → "act14"
- "finishing works" / "almost ready" / "pending documents" → "act15"
- "keys ready" / "occupancy permit" / "move-in ready" → "act16"
- No construction yet / off-plan → "planning" or "preparation"

### Payment Schedule
Parse the payment plan into an array of installments with "percentage"
and "trigger" fields. Triggers are: "signing", "act14", "act15", "act16".
Example — "20% on signing, 80% on handover":
[{"percentage": 20, "trigger": "signing"}, {"percentage": 80, "trigger": "act16"}]

### Commission
- If no commission is mentioned → return "0%"
- Flat fee → "1000 EUR flat"
- Percentage → "3%"

### AI Summary
Write 3–5 factual sentences covering: location, project stage, price level,
payment structure, and the headline investment case or red flag.
Use numbers. Do not use marketing language.
`
