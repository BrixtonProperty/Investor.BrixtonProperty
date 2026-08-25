import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { unwrap } from '../lib/queryClient'
import type { InvestorHolding } from '../types/database.types'

const KEY = 'investor_holdings'

/** RLS scopes this to the logged-in investor's own rows automatically. */
export function useInvestorHoldings() {
  return useQuery({
    queryKey: [KEY],
    queryFn: async () =>
      unwrap(await supabase.from('investor_holdings').select('*')) as InvestorHolding[],
  })
}

export function useHoldingForProperty(propertyId: string | undefined) {
  const { data, ...rest } = useInvestorHoldings()
  return { ...rest, data: data?.find((h) => h.property_id === propertyId) }
}
