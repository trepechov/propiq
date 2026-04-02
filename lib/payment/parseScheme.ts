/**
 * Payment scheme name parsing utilities.
 *
 * The scheme name encodes the installment split using a dash-separated notation:
 *   - First digit  → signing (contract date)
 *   - Last digit   → Act 16 (project completion / handover)
 *   - Middle digits (if any) → Act 14 then Act 15 (in order)
 *
 * Examples:
 *   "20-80"         → [{20, signing}, {80, act16}]
 *   "20-30-40-10"   → [{20, signing}, {30, act14}, {40, act15}, {10, act16}]
 *   "10-20-30-30-10"→ [{10, signing}, {20, act14}, {30, act15}, {30, act15}, {10, act16}]
 *
 * Pure functions — no side effects, easy to unit test.
 */

import type { PaymentInstallmentData } from '../../types/projectPaymentScheme'

// Middle triggers assigned in order for any installments between signing and act16.
// Rare 5-part schemes map excess middle parts to act15 (documented limitation).
const MIDDLE_TRIGGERS = ['act14', 'act15'] as const

/**
 * Normalises a raw scheme name string before parsing.
 * Handles AI edge cases: slashes as separators, % characters, extra whitespace.
 *
 * Examples:
 *   "20/80"        → "20-80"
 *   "20% / 80%"   → "20-80"
 *   " 20 - 80 "   → "20-80"
 */
function normaliseSchemeInput(raw: string): string {
  return raw
    .replace(/%/g, '')      // remove percent signs
    .replace(/\//g, '-')    // normalise slash separators to dash
    .replace(/\s+/g, '')    // strip all whitespace
}

/**
 * Converts a scheme name like "20-80" or "20/30/40/10" into
 * PaymentInstallmentData[] following the domain convention:
 *   first → signing, last → act16, middle(s) → act14 then act15.
 *
 * Returns an empty array if the input is invalid (non-numeric parts, < 2 parts).
 */
export function parseSchemeNameToInstallments(
  name: string,
): PaymentInstallmentData[] {
  const normalised = normaliseSchemeInput(name)
  const parts = normalised.split('-').map(Number)

  if (parts.length < 2 || parts.some(isNaN)) return []

  return parts.map((pct, i) => {
    if (i === 0) return { percentage: pct, trigger: 'signing' }
    if (i === parts.length - 1) return { percentage: pct, trigger: 'act16' }
    // Middle positions: map to act14, then act15. Excess → act15.
    const middleTrigger = MIDDLE_TRIGGERS[i - 1] ?? 'act15'
    return { percentage: pct, trigger: middleTrigger }
  })
}

/**
 * Derives the canonical dash-separated name from an installments array.
 * e.g. [{20, signing}, {80, act16}] → "20-80"
 *
 * Returns an empty string if the array is empty.
 */
export function installmentsToSchemeName(
  installments: PaymentInstallmentData[],
): string {
  if (installments.length === 0) return ''
  return installments.map((item) => item.percentage).join('-')
}
