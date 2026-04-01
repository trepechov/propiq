import type { SupabaseClient } from '@supabase/supabase-js'
import type { CriteriaKey } from '@/types/userCriteria'

export async function getUserCriteria(
  supabase: SupabaseClient,
  userId: string,
  key: CriteriaKey,
  defaultValue: string,
): Promise<string> {
  const { data } = await supabase
    .from('user_criteria')
    .select('content')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle()   // null when no row — does NOT throw
  return data?.content ?? defaultValue
}
