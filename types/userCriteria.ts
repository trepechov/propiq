export const CRITERIA_KEYS = [
  'evaluation_criteria',
  'query_context',
  'extraction_rules',
  'neighborhood_research',
] as const

export type CriteriaKey = typeof CRITERIA_KEYS[number]

export interface UserCriterion {
  key: CriteriaKey
  content: string
  isDefault: boolean  // true = no DB row exists; used by Reset button
}

export type UserCriteriaMap = Record<CriteriaKey, UserCriterion>
