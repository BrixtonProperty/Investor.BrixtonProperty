import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { unwrap } from '../lib/queryClient'
import type { InvestorAccount, InvestorProperty } from '../types/database.types'

const KEY = 'investor_accounts'
const IP_KEY = 'investor_properties'

export function useInvestorAccounts() {
  return useQuery({
    queryKey: [KEY],
    queryFn: async () =>
      unwrap(await supabase.from('investor_accounts').select('*').order('display_name')) as InvestorAccount[],
  })
}

export function useInvestorAccount(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    enabled: !!id,
    queryFn: async () =>
      unwrap(await supabase.from('investor_accounts').select('*').eq('id', id!).single()) as InvestorAccount,
  })
}

export function useCreateInvestorAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (displayName: string) =>
      unwrap(
        await supabase.from('investor_accounts').insert({ display_name: displayName }).select().single(),
      ) as InvestorAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateInvestorAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<InvestorAccount> }) =>
      unwrap(
        await supabase.from('investor_accounts').update(values).eq('id', id).select().single(),
      ) as InvestorAccount,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [KEY, data.id] })
    },
  })
}

// ---- Holdings assignment (ownership %, invested amount, which properties) ----

export function useHoldingsForAccount(accountId: string | undefined) {
  return useQuery({
    queryKey: [IP_KEY, accountId],
    enabled: !!accountId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('investor_properties')
          .select('*, properties(name, location, total_equity_invested)')
          .eq('investor_account_id', accountId!),
      ) as (InvestorProperty & { properties: { name: string; location: string; total_equity_invested: number | null } })[],
  })
}

export function useAssignHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: { investor_account_id: string; property_id: string; invested_amount: number }) =>
      unwrap(await supabase.from('investor_properties').insert(values).select().single()),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: [IP_KEY, vars.investor_account_id] }),
  })
}

export function useUpdateHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string
      accountId: string
      values: Partial<InvestorProperty>
    }) => unwrap(await supabase.from('investor_properties').update(values).eq('id', id).select().single()),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: [IP_KEY, vars.accountId] }),
  })
}

export function useRemoveHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; accountId: string }) =>
      unwrap(await supabase.from('investor_properties').delete().eq('id', id)),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: [IP_KEY, vars.accountId] }),
  })
}
