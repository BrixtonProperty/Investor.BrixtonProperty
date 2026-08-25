import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { unwrap } from '../lib/queryClient'
import type { Property } from '../types/database.types'

const KEY = 'properties'

export function useProperties() {
  return useQuery({
    queryKey: [KEY],
    queryFn: async () =>
      unwrap(
        await supabase.from('properties').select('*').eq('is_archived', false).order('name'),
      ) as Property[],
  })
}

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    enabled: !!id,
    queryFn: async () =>
      unwrap(await supabase.from('properties').select('*').eq('id', id!).single()) as Property,
  })
}

export function useCreateProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<Property>) =>
      unwrap(await supabase.from('properties').insert(values).select().single()) as Property,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Property> }) =>
      unwrap(
        await supabase.from('properties').update(values).eq('id', id).select().single(),
      ) as Property,
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [KEY, id] })
    },
  })
}

export function useArchiveProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await supabase.from('properties').update({ is_archived: true }).eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
