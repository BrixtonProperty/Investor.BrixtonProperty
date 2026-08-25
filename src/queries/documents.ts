import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { unwrap } from '../lib/queryClient'
import type { DocumentRow } from '../types/database.types'

const KEY = 'documents'

export function useDocuments(propertyId: string | undefined) {
  return useQuery({
    queryKey: [KEY, propertyId],
    enabled: !!propertyId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('documents')
          .select('*')
          .eq('property_id', propertyId!)
          .order('date_added', { ascending: false }),
      ) as DocumentRow[],
  })
}

/** RLS scopes this to documents on properties the caller can see. Used by the
 * cross-property Investor Updates ("Reports" tab) view. */
export function useAllVisibleDocuments() {
  return useQuery({
    queryKey: [KEY, 'all'],
    queryFn: async () =>
      unwrap(
        await supabase.from('documents').select('*').order('date_added', { ascending: false }),
      ) as DocumentRow[],
  })
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      propertyId,
      categoryId,
      file,
      name,
    }: {
      propertyId: string
      categoryId: string
      file: File
      name: string
    }) => {
      const ext = file.name.split('.').pop() || 'pdf'
      const path = `${propertyId}/${crypto.randomUUID()}.${ext}`
      const upload = await supabase.storage.from('documents').upload(path, file)
      if (upload.error) throw new Error(upload.error.message)
      return unwrap(
        await supabase
          .from('documents')
          .insert({
            property_id: propertyId,
            category_id: categoryId,
            name,
            storage_path: path,
            mime_type: file.type,
            file_size_bytes: file.size,
          })
          .select()
          .single(),
      ) as DocumentRow
    },
    onSuccess: (_data, { propertyId }) => {
      qc.invalidateQueries({ queryKey: [KEY, propertyId] })
      qc.invalidateQueries({ queryKey: [KEY, 'all'] })
    },
  })
}

export function useUpdateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<DocumentRow> }) =>
      unwrap(await supabase.from('documents').update(values).eq('id', id).select().single()) as DocumentRow,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [KEY, data.property_id] })
      qc.invalidateQueries({ queryKey: [KEY, 'all'] })
    },
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (doc: DocumentRow) => {
      await supabase.storage.from('documents').remove([doc.storage_path])
      unwrap(await supabase.from('documents').delete().eq('id', doc.id))
      return doc
    },
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: [KEY, doc.property_id] })
      qc.invalidateQueries({ queryKey: [KEY, 'all'] })
    },
  })
}
