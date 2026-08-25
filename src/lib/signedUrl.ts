import { supabase } from './supabaseClient'

const DOCUMENT_URL_EXPIRY_SECONDS = 60
const PHOTO_URL_EXPIRY_SECONDS = 60 * 60

/** Generates a fresh short-expiry signed URL for a document and opens it in a new tab. */
export async function openDocument(storagePath: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, DOCUMENT_URL_EXPIRY_SECONDS)
  if (error || !data?.signedUrl) {
    throw error ?? new Error('Could not generate a document link.')
  }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
}

/** Batch-signs a set of property photo paths (1hr expiry — the gallery/lightbox re-renders them repeatedly). */
export async function signPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const { data, error } = await supabase.storage
    .from('property-photos')
    .createSignedUrls(paths, PHOTO_URL_EXPIRY_SECONDS)
  if (error || !data) throw error ?? new Error('Could not sign photo URLs.')
  const map: Record<string, string> = {}
  for (const item of data) {
    if (item.signedUrl) map[item.path ?? ''] = item.signedUrl
  }
  return map
}

export function publicAssetUrl(storagePath: string | null | undefined): string | undefined {
  if (!storagePath) return undefined
  return supabase.storage.from('site-assets').getPublicUrl(storagePath).data.publicUrl
}

const PHOTO_SIGNED_URL_STALE_MS = (PHOTO_URL_EXPIRY_SECONDS - 120) * 1000
export const PHOTO_QUERY_STALE_TIME = PHOTO_SIGNED_URL_STALE_MS
