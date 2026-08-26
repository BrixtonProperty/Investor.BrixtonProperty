import { useMemo } from 'react'
import { useAllVisibleNotices } from './notices'
import { useAllVisibleDocuments } from './documents'

export interface FeedItem {
  id: string
  property_id: string
  title: string
  date: string
  kind: 'notice' | 'document'
  description?: string
  storage_path?: string
}

/** Communications (notices) and Reports (documents) merged into one
 * chronological feed, RLS-scoped to whatever the caller can see. */
export function useMergedUpdates() {
  const notices = useAllVisibleNotices()
  const documents = useAllVisibleDocuments()

  const items = useMemo<FeedItem[]>(() => {
    const noticeItems: FeedItem[] = (notices.data ?? []).map((n) => ({
      id: `notice-${n.id}`,
      property_id: n.property_id,
      title: n.title,
      date: n.notice_date,
      kind: 'notice',
      description: n.description,
    }))
    const docItems: FeedItem[] = (documents.data ?? []).map((d) => ({
      id: `document-${d.id}`,
      property_id: d.property_id,
      title: d.name,
      date: d.date_added,
      kind: 'document',
      storage_path: d.storage_path,
    }))
    return [...noticeItems, ...docItems].sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [notices.data, documents.data])

  return { items, isLoading: notices.isLoading || documents.isLoading }
}
