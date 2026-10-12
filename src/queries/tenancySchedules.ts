import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { unwrap } from '../lib/queryClient'
import type { PropertyTenancySchedule } from '../types/database.types'

const KEY = 'property_tenancy_schedules'

export function useTenancySchedule(propertyId: string | undefined) {
  return useQuery({
    queryKey: [KEY, propertyId],
    enabled: !!propertyId,
    queryFn: async () =>
      unwrap(
        await supabase.from('property_tenancy_schedules').select('*').eq('property_id', propertyId!).maybeSingle(),
      ) as PropertyTenancySchedule | null,
  })
}

export function useSaveTenancySchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Pick<PropertyTenancySchedule, 'property_id' | 'as_at' | 'file_name' | 'columns' | 'rows'>) =>
      unwrap(
        await supabase.from('property_tenancy_schedules').upsert(values, { onConflict: 'property_id' }).select().single(),
      ) as PropertyTenancySchedule,
    onSuccess: (data) => qc.invalidateQueries({ queryKey: [KEY, data.property_id] }),
  })
}

export function useDeleteTenancySchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (propertyId: string) => {
      unwrap(await supabase.from('property_tenancy_schedules').delete().eq('property_id', propertyId))
      return propertyId
    },
    onSuccess: (propertyId) => qc.invalidateQueries({ queryKey: [KEY, propertyId] }),
  })
}
