import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { unwrap } from '../lib/queryClient'
import type { Notice } from '../types/database.types'

const KEY = 'notices'

export function useNotices(propertyId: string | undefined) {
  return useQuery({
    queryKey: [KEY, propertyId],
    enabled: !!propertyId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('notices')
          .select('*')
          .eq('property_id', propertyId!)
          .order('notice_date', { ascending: false }),
      ) as Notice[],
  })
}

/** RLS scopes this to notices on properties the caller can see. */
export function useAllVisibleNotices() {
  return useQuery({
    queryKey: [KEY, 'all'],
    queryFn: async () =>
      unwrap(await supabase.from('notices').select('*').order('notice_date', { ascending: false })) as Notice[],
  })
}

export function useCreateNotice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<Notice>) =>
      unwrap(await supabase.from('notices').insert(values).select().single()) as Notice,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [KEY, data.property_id] })
      qc.invalidateQueries({ queryKey: [KEY, 'all'] })
    },
  })
}

export function useUpdateNotice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Notice> }) =>
      unwrap(await supabase.from('notices').update(values).eq('id', id).select().single()) as Notice,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [KEY, data.property_id] })
      qc.invalidateQueries({ queryKey: [KEY, 'all'] })
    },
  })
}

export function useDeleteNotice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (notice: Notice) => {
      unwrap(await supabase.from('notices').delete().eq('id', notice.id))
      return notice
    },
    onSuccess: (notice) => {
      qc.invalidateQueries({ queryKey: [KEY, notice.property_id] })
      qc.invalidateQueries({ queryKey: [KEY, 'all'] })
    },
  })
}
