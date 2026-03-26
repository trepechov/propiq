/**
 * Business rules for evaluating and scoring a real estate deal.
 *
 * Injected as context in NL query calls so Gemini applies your investment
 * standards when answering questions like "which is the best deal?" or
 * "flag any risks in these projects".
 *
 * Edit this file to tune the evaluation model to your strategy.
 */

export const EVALUATION_CRITERIA = `
## Investment Evaluation Criteria

### Payment Schedule — Investor Appeal
- **20-80** (HIGH): Only 20% capital tied up during construction. Builder
  charges a premium but cash-on-cash return is strong. Preferred for
  buy-to-let investors.
- **20-30-40-10** (MEDIUM): Staged payments reduce builder risk. Mid-range
  pricing. Requires monitoring construction milestones.
- **90-10** (LOW): Maximum capital required upfront. Lowest price but highest
  execution risk. If the builder stalls, most of your cash is exposed.
- Commission above 3% should be flagged as a cost drag on returns.

### Building Stage — Risk Level
- **Planning / Preparation**: Highest risk. No structure to inspect.
  Longest time to cashflow. Compensated by lowest price.
- **Building Started / Act 14**: Moderate risk. Structure confirmed.
  Completion timeline is more predictable.
- **Act 15**: Low risk. Building is essentially done. Short wait to handover.
- **Act 16**: No construction risk. Ready to rent immediately.

### Orientation — Desirability
- **South / South-East / South-West**: Most desirable. Best natural light,
  higher resale value and rental demand.
- **East / West**: Acceptable. Morning or afternoon light respectively.
- **North / North-East / North-West**: Least desirable. Discount expectation
  of 5–10% vs. equivalent south-facing unit.

### Floor Level
- Ground floor: lower demand for residential, higher for commercial use.
- Higher floors generally command a premium and sell faster — which also
  signals what the market values in a given project.
- Sold/booked patterns: if high floors sold first, buyers prioritise views
  over price. If south-facing units went first, orientation matters most.

### Red Flags
- Open terrace directly above the unit: leakage risk, especially in older
  construction styles.
- Developer with no completed projects (Act 16) on record: execution risk.
- Unusually high price/sqm vs. comparable projects in the same neighbourhood.
- Commission above 3% with no justification.
- Very long payment plan with no stage milestones (e.g. monthly 1%):
  uncommon and may indicate cash flow problems on the builder's side.

### Yield Benchmarks (placeholder — update with local market data)
- Below 4% gross yield: weak for a buy-to-let investment.
- 4–6%: acceptable, typical for established neighbourhoods.
- 6–8%: good. Strong case for investment.
- Above 8%: high yield — verify assumptions (rent estimate may be optimistic).
`
