import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { unwrap } from '../lib/queryClient'
import { callFunction } from '../lib/functionsClient'
import type { InvestorUser } from '../types/database.types'

const KEY = 'investor_users'

export function useInvestorUsersForAccount(accountId: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'account', accountId],
    enabled: !!accountId,
    queryFn: async () =>
      unwrap(
        await supabase.from('investor_users').select('*').eq('investor_account_id', accountId!).order('created_at'),
      ) as InvestorUser[],
  })
}

export function useAllInvestorUsers() {
  return useQuery({
    queryKey: [KEY, 'all'],
    queryFn: async () =>
      unwrap(
        await supabase.from('investor_users').select('*, investor_accounts(display_name)').order('name'),
      ) as (InvestorUser & { investor_accounts: { display_name: string } | null })[],
  })
}

export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'me', userId],
    enabled: !!userId,
    queryFn: async () =>
      unwrap(await supabase.from('investor_users').select('*').eq('id', userId!).single()) as InvestorUser,
  })
}

export function useUpdateInvestorUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<InvestorUser> }) =>
      unwrap(await supabase.from('investor_users').update(values).eq('id', id).select().single()) as InvestorUser,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      if (data.investor_account_id) {
        qc.invalidateQueries({ queryKey: [KEY, 'account', data.investor_account_id] })
      }
      qc.invalidateQueries({ queryKey: [KEY, 'me', data.id] })
    },
  })
}

// ---- Privileged operations that must run server-side (Netlify Functions) ----

export interface CreateInvestorUserInput {
  name: string
  email: string
  investorAccountId?: string
  newAccountDisplayName?: string
}
export interface CreateInvestorUserResult {
  investorAccountId: string
  investorUserId: string
  inviteLink: string
}

export function useCreateInvestorUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateInvestorUserInput) =>
      callFunction<CreateInvestorUserResult>('create-investor-user', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investor_accounts'] })
      qc.invalidateQueries({ queryKey: [KEY] })
    },
  })
}

export function useRegenerateInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (investorUserId: string) =>
      callFunction<{ inviteLink: string }>('regenerate-invite', { investorUserId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeactivateInvestorUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ investorUserId, active }: { investorUserId: string; active: boolean }) =>
      callFunction<{ ok: true }>('deactivate-user', { investorUserId, active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
