import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { unwrap } from '../lib/queryClient'
import { signPhotoUrls, PHOTO_QUERY_STALE_TIME } from '../lib/signedUrl'
import type { PropertyPhoto } from '../types/database.types'

const KEY = 'property_photos'

export function usePropertyPhotos(propertyId: string | undefined) {
  return useQuery({
    queryKey: [KEY, propertyId],
    enabled: !!propertyId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('property_photos')
          .select('*')
          .eq('property_id', propertyId!)
          .order('taken_or_added_date', { ascending: false })
          .order('sort_order'),
      ) as PropertyPhoto[],
  })
}

/** One cover (or first) photo per property, for grid/list thumbnails. */
export function useCoverPhotos(propertyIds: string[]) {
  const sortedIds = propertyIds.slice().sort()
  return useQuery({
    queryKey: [KEY, 'covers', sortedIds.join(',')],
    enabled: sortedIds.length > 0,
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from('property_photos')
          .select('*')
          .in('property_id', sortedIds)
          .order('is_cover', { ascending: false })
          .order('sort_order'),
      ) as PropertyPhoto[]
      const byProperty = new Map<string, PropertyPhoto>()
      for (const row of rows) {
        if (!byProperty.has(row.property_id)) byProperty.set(row.property_id, row)
      }
      return byProperty
    },
  })
}

export function useSignedPhotoUrls(paths: string[]) {
  return useQuery({
    queryKey: ['signed-photo-urls', paths.slice().sort().join(',')],
    enabled: paths.length > 0,
    staleTime: PHOTO_QUERY_STALE_TIME,
    queryFn: () => signPhotoUrls(paths),
  })
}

/** Map of property_id -> signed thumbnail URL, for grid/list views. */
export function usePropertyThumbnails(propertyIds: string[]) {
  const covers = useCoverPhotos(propertyIds)
  const paths = covers.data ? Array.from(covers.data.values()).map((p) => p.storage_path) : []
  const signed = useSignedPhotoUrls(paths)
  const thumbnails = new Map<string, string>()
  if (covers.data && signed.data) {
    for (const [propertyId, photo] of covers.data) {
      const url = signed.data[photo.storage_path]
      if (url) thumbnails.set(propertyId, url)
    }
  }
  return { thumbnails, isLoading: covers.isLoading || signed.isLoading }
}

export function useUploadPropertyPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      propertyId,
      file,
      title,
      takenDate,
    }: {
      propertyId: string
      file: File
      title: string
      takenDate: string
    }) => {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${propertyId}/${crypto.randomUUID()}.${ext}`
      const upload = await supabase.storage.from('property-photos').upload(path, file, {
        cacheControl: '3600',
      })
      if (upload.error) throw new Error(upload.error.message)
      return unwrap(
        await supabase
          .from('property_photos')
          .insert({ property_id: propertyId, storage_path: path, title, taken_or_added_date: takenDate })
          .select()
          .single(),
      ) as PropertyPhoto
    },
    onSuccess: (_data, { propertyId }) => qc.invalidateQueries({ queryKey: [KEY, propertyId] }),
  })
}

export function useReplacePropertyPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ photo, file }: { photo: PropertyPhoto; file: File }) => {
      const upload = await supabase.storage
        .from('property-photos')
        .upload(photo.storage_path, file, { upsert: true, cacheControl: '3600' })
      if (upload.error) throw new Error(upload.error.message)
      return unwrap(
        await supabase
          .from('property_photos')
          .update({ taken_or_added_date: new Date().toISOString().slice(0, 10) })
          .eq('id', photo.id)
          .select()
          .single(),
      ) as PropertyPhoto
    },
    onSuccess: (_data, { photo }) => qc.invalidateQueries({ queryKey: [KEY, photo.property_id] }),
  })
}

/** Uploads a cropped (fixed 16:9) cover image as its own photo row, marks it
 * as the cover, and clears is_cover from whichever photo held it before. */
export function useCropAndSetCover() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ propertyId, blob, title }: { propertyId: string; blob: Blob; title: string }) => {
      await supabase
        .from('property_photos')
        .update({ is_cover: false })
        .eq('property_id', propertyId)
        .eq('is_cover', true)

      const path = `${propertyId}/${crypto.randomUUID()}.jpg`
      const upload = await supabase.storage
        .from('property-photos')
        .upload(path, blob, { cacheControl: '3600', contentType: 'image/jpeg' })
      if (upload.error) throw new Error(upload.error.message)

      return unwrap(
        await supabase
          .from('property_photos')
          .insert({
            property_id: propertyId,
            storage_path: path,
            title,
            taken_or_added_date: new Date().toISOString().slice(0, 10),
            is_cover: true,
          })
          .select()
          .single(),
      ) as PropertyPhoto
    },
    onSuccess: (_data, { propertyId }) => {
      qc.invalidateQueries({ queryKey: [KEY, propertyId] })
      qc.invalidateQueries({ queryKey: [KEY, 'covers'] })
    },
  })
}

export function useDeletePropertyPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (photo: PropertyPhoto) => {
      await supabase.storage.from('property-photos').remove([photo.storage_path])
      unwrap(await supabase.from('property_photos').delete().eq('id', photo.id))
      return photo
    },
    onSuccess: (photo) => qc.invalidateQueries({ queryKey: [KEY, photo.property_id] }),
  })
}
