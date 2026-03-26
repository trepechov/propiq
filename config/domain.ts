/**
 * PropIQ — Core domain types and constants.
 *
 * Also exports FieldType — the shared primitive used by all field config files.
 *
 * Uses `const` objects + derived types instead of `enum`
 * (required by `erasableSyntaxOnly: true` in tsconfig).
 *
 * Pattern:
 *   export const Foo = { A: 'a', B: 'b' } as const
 *   export type Foo = typeof Foo[keyof typeof Foo]
 */

export type FieldType = 'text' | 'number' | 'percent' | 'currency' | 'date'

// ── Building Stages ──────────────────────────────────────────────────────────
// Listed from most complete → least complete (reverse chronological).
// These are the official Bulgarian construction act stages used in payment plans.

export const BuildingStage = {
  ACT_16:          'act16',           // Fully complete — occupancy permit issued
  ACT_15:          'act15',           // Building complete, minor docs/finishing pending
  ACT_14:          'act14',           // Raw structure done — brick, concrete, roof
  BUILDING_STARTED:'building_started',// Foundation + vertical construction underway
  PREPARATION:     'preparation',     // Site prepared, permits obtained, work started
  PLANNING:        'planning',        // Project announced / pre-sales open, no construction yet
} as const

export type BuildingStage = typeof BuildingStage[keyof typeof BuildingStage]

export const BUILDING_STAGE_LABELS: Record<BuildingStage, string> = {
  [BuildingStage.ACT_16]:           'Act 16 — Complete',
  [BuildingStage.ACT_15]:           'Act 15 — Building ready, docs pending',
  [BuildingStage.ACT_14]:           'Act 14 — Raw structure (brick & concrete)',
  [BuildingStage.BUILDING_STARTED]: 'Building started',
  [BuildingStage.PREPARATION]:      'Preparation',
  [BuildingStage.PLANNING]:         'Planning / Pre-sales',
}

// ── Payment Schedules ────────────────────────────────────────────────────────

export type PaymentTrigger = BuildingStage | 'signing'

export interface PaymentInstallment {
  /** Percentage of total price due at this trigger (0–100) */
  percentage: number
  /** What event triggers this payment */
  trigger: PaymentTrigger
}

export interface PaymentSchedule {
  /**
   * Shorthand notation — percentages joined by dashes, e.g. "20-30-40-10".
   * Each number maps to an installment in order.
   */
  name: string
  installments: PaymentInstallment[]
  /**
   * How investor-friendly this schedule is.
   * HIGH  = low upfront capital tied up, better cash-on-cash return.
   * LOW   = most capital required upfront, typically lowest price.
   */
  investorAppeal: 'high' | 'medium' | 'low'
  notes: string
}

/**
 * Common payment schedule presets.
 * Real projects may use variations — these are the canonical patterns.
 */
export const PAYMENT_SCHEDULE_PRESETS: PaymentSchedule[] = [
  {
    name: '20-80',
    installments: [
      { percentage: 20, trigger: 'signing' },
      { percentage: 80, trigger: BuildingStage.ACT_16 },
    ],
    investorAppeal: 'high',
    notes:
      'Investor favourite — only 20% capital tied up during construction. ' +
      'Builder charges a premium for deferring 80% to completion. ' +
      'High cash-on-cash return because most capital is deployed only at handover.',
  },
  {
    name: '20-30-40-10',
    installments: [
      { percentage: 20, trigger: 'signing' },
      { percentage: 30, trigger: BuildingStage.ACT_14 },
      { percentage: 40, trigger: BuildingStage.ACT_15 },
      { percentage: 10, trigger: BuildingStage.ACT_16 },
    ],
    investorAppeal: 'medium',
    notes:
      'Staged payments reduce builder risk and typically yield mid-range pricing. ' +
      'Payments at Act 14 and Act 15 require monitoring construction progress.',
  },
  {
    name: '90-10',
    installments: [
      { percentage: 90, trigger: 'signing' },
      { percentage: 10, trigger: BuildingStage.ACT_16 },
    ],
    investorAppeal: 'low',
    notes:
      'Most cash required upfront — typically the lowest purchase price. ' +
      'High execution risk: if builder delays or fails, capital is fully exposed.',
  },
]

// ── Unit Status ──────────────────────────────────────────────────────────────
// Imported for all units — not just available ones. Sold/booked patterns
// across a project reveal which unit types, floors, and orientations buyers
// prefer, informing decisions on future projects.

export const UnitStatus = {
  AVAILABLE: 'available',
  BOOKED:    'booked',   // Reserved but not yet contracted
  SOLD:      'sold',
} as const

export type UnitStatus = typeof UnitStatus[keyof typeof UnitStatus]

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  [UnitStatus.AVAILABLE]: 'Available',
  [UnitStatus.BOOKED]:    'Booked',
  [UnitStatus.SOLD]:      'Sold',
}

// ── Unit Direction ────────────────────────────────────────────────────────────
// Cardinal orientation of the main facade / living area.
// South > East/West > North in terms of natural light and desirability.

export const UnitDirection = {
  SOUTH:      'south',
  NORTH:      'north',
  EAST:       'east',
  WEST:       'west',
  SOUTH_EAST: 'south_east',
  SOUTH_WEST: 'south_west',
  NORTH_EAST: 'north_east',
  NORTH_WEST: 'north_west',
} as const

export type UnitDirection = typeof UnitDirection[keyof typeof UnitDirection]

export const UNIT_DIRECTION_LABELS: Record<UnitDirection, string> = {
  [UnitDirection.SOUTH]:      'South',
  [UnitDirection.NORTH]:      'North',
  [UnitDirection.EAST]:       'East',
  [UnitDirection.WEST]:       'West',
  [UnitDirection.SOUTH_EAST]: 'South-East',
  [UnitDirection.SOUTH_WEST]: 'South-West',
  [UnitDirection.NORTH_EAST]: 'North-East',
  [UnitDirection.NORTH_WEST]: 'North-West',
}

// ── Unit Type ─────────────────────────────────────────────────────────────────

export const UnitType = {
  APARTMENT: 'apartment',
  STUDIO:    'studio',
  GARAGE:    'garage',
  PARKING:   'parking',
  STORAGE:   'storage',
} as const

export type UnitType = typeof UnitType[keyof typeof UnitType]

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  [UnitType.APARTMENT]: 'Apartment',
  [UnitType.STUDIO]:    'Studio',
  [UnitType.GARAGE]:    'Garage',
  [UnitType.PARKING]:   'Parking Space',
  [UnitType.STORAGE]:   'Storage',
}

// ── Buyer Profile ────────────────────────────────────────────────────────────

export type BuyerProfile =
  | 'families'            // 2+ bedrooms, good schools, playgrounds nearby
  | 'young_professionals' // 1–2 bed, transport links, co-working proximity
  | 'retirees'            // quiet areas, ground-floor access, medical facilities
  | 'investors'           // yield-focused, may not occupy — short or long let
  | 'students'            // near universities, smaller units, affordable

export const BUYER_PROFILE_LABELS: Record<BuyerProfile, string> = {
  families:            'Families',
  young_professionals: 'Young Professionals',
  retirees:            'Retirees',
  investors:           'Investors (buy-to-let)',
  students:            'Students',
}
