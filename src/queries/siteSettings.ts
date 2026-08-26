import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { unwrap } from '../lib/queryClient'
import type { SiteSettings } from '../types/database.types'

const KEY = 'site_settings'

export function useSiteSettings() {
  return useQuery({
    queryKey: [KEY],
    queryFn: async () =>
      unwrap(await supabase.from('site_settings').select('*').eq('id', 1).single()) as SiteSettings,
  })
}

export function useUpdateSiteSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<SiteSettings>) =>
      unwrap(
        await supabase.from('site_settings').update(values).eq('id', 1).select().single(),
      ) as SiteSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export async function uploadSiteAsset(file: File | Blob, prefix: string): Promise<string> {
  const ext = file instanceof File ? file.name.split('.').pop() || 'png' : 'jpg'
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('site-assets').upload(path, file, {
    upsert: true,
    contentType: file instanceof File ? file.type : 'image/jpeg',
  })
  if (error) throw new Error(error.message)
  return path
}
