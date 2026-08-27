import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { unwrap } from '../lib/queryClient'
import type { PropertyTenant } from '../types/database.types'

const KEY = 'property_tenants'

export function useTenants(propertyId: string | undefined) {
  return useQuery({
    queryKey: [KEY, propertyId],
    enabled: !!propertyId,
    queryFn: async () =>
      unwrap(
        await supabase.from('property_tenants').select('*').eq('property_id', propertyId!).order('name'),
      ) as PropertyTenant[],
  })
}

export function useCreateTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<PropertyTenant>) =>
      unwrap(await supabase.from('property_tenants').insert(values).select().single()) as PropertyTenant,
    onSuccess: (data) => qc.invalidateQueries({ queryKey: [KEY, data.property_id] }),
  })
}

export function useUpdateTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<PropertyTenant> }) =>
      unwrap(await supabase.from('property_tenants').update(values).eq('id', id).select().single()) as PropertyTenant,
    onSuccess: (data) => qc.invalidateQueries({ queryKey: [KEY, data.property_id] }),
  })
}

export function useDeleteTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tenant: PropertyTenant) => {
      unwrap(await supabase.from('property_tenants').delete().eq('id', tenant.id))
      return tenant
    },
    onSuccess: (tenant) => qc.invalidateQueries({ queryKey: [KEY, tenant.property_id] }),
  })
}
