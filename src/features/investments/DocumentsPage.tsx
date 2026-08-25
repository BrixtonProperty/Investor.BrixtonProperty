import { useParams } from 'react-router-dom'
import { useProperty } from '../../queries/properties'
import { useDocuments } from '../../queries/documents'
import { useDocumentCategories } from '../../queries/documentCategories'
import { openDocument } from '../../lib/signedUrl'
import Breadcrumb from '../../components/Breadcrumb'
import DocTable from '../../components/DocTable'

export default function DocumentsPage() {
  const { id } = useParams<{ id: string }>()
  const property = useProperty(id)
  const documents = useDocuments(id)
  const categories = useDocumentCategories()

  if (property.isLoading) return <div className="loading-state">Loading documents…</div>
  if (!property.data) return <div className="error-state">Property not found.</div>

  const p = property.data

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Investments', to: '/investments' },
          { label: p.name, to: `/investments/${p.id}` },
          { label: 'Documents' },
        ]}
      />
      <div className="sub-eyebrow">{p.name}</div>
      <h1 className="page-title serif">All Documents</h1>
      <div className="page-sub">Browse and download all documents for {p.name}.</div>
      <DocTable
        documents={documents.data ?? []}
        categories={categories.data ?? []}
        onOpen={(d) => openDocument(d.storage_path).catch(() => {})}
      />
    </>
  )
}
