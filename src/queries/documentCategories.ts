import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { unwrap } from '../lib/queryClient'
import type { DocumentCategory } from '../types/database.types'

const KEY = 'document_categories'

export function useDocumentCategories() {
  return useQuery({
    queryKey: [KEY],
    queryFn: async () =>
      unwrap(
        await supabase.from('document_categories').select('*').order('sort_order').order('name'),
      ) as DocumentCategory[],
  })
}

export function useCreateDocumentCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<DocumentCategory>) =>
      unwrap(await supabase.from('document_categories').insert(values).select().single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateDocumentCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<DocumentCategory> }) =>
      unwrap(await supabase.from('document_categories').update(values).eq('id', id).select().single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteDocumentCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('document_categories').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
