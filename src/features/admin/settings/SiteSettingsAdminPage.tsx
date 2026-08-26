import { useEffect, useState } from 'react'
import { useSiteSettings, useUpdateSiteSettings, uploadSiteAsset } from '../../../queries/siteSettings'
import { publicAssetUrl } from '../../../lib/signedUrl'
import { useToast } from '../../../components/Toast'
import ImageCropper from '../../../components/ImageCropper'
import type { SiteSettings } from '../../../types/database.types'

type AssetField = 'logo_storage_path' | 'badge_storage_path' | 'login_background_storage_path' | 'dashboard_hero_storage_path'

interface AssetConfig {
  field: AssetField
  label: string
  prefix: string
  aspectRatio: number
  frameWidth: number
  helpText: string
}

const ASSETS: AssetConfig[] = [
  {
    field: 'logo_storage_path',
    label: 'Sidebar logo',
    prefix: 'logo',
    aspectRatio: 3,
    frameWidth: 420,
    helpText: 'Crops to a wide logo lockup shape — it displays at full sidebar width, scaled to fit.',
  },
  {
    field: 'badge_storage_path',
    label: 'Company badge (bottom-left)',
    prefix: 'badge',
    aspectRatio: 1,
    frameWidth: 320,
    helpText: 'Crops to a square — it always displays as a small square badge.',
  },
  {
    field: 'login_background_storage_path',
    label: 'Login page background photo',
    prefix: 'login-bg',
    aspectRatio: 3 / 4,
    frameWidth: 300,
    helpText: 'Crops to a tall portrait shape, matching the full-height photo panel on the login screen.',
  },
  {
    field: 'dashboard_hero_storage_path',
    label: 'Dashboard hero banner',
    prefix: 'dashboard-hero',
    aspectRatio: 16 / 9,
    frameWidth: 480,
    helpText: 'Crops to a wide banner shape, matching the photo strip at the top of the investor Dashboard.',
  },
]

type FormState = Pick<
  SiteSettings,
  'company_name' | 'company_tagline' | 'login_heading' | 'login_subtext' | 'login_contact_email'
>

export default function SiteSettingsAdminPage() {
  const { data: settings, isLoading } = useSiteSettings()
  const update = useUpdateSiteSettings()
  const toast = useToast()

  const [form, setForm] = useState<FormState | null>(null)
  const [uploadingField, setUploadingField] = useState<AssetField | null>(null)
  const [cropping, setCropping] = useState<{ config: AssetConfig; objectUrl: string } | null>(null)

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name,
        company_tagline: settings.company_tagline,
        login_heading: settings.login_heading,
        login_subtext: settings.login_subtext,
        login_contact_email: settings.login_contact_email,
      })
    }
  }, [settings])

  if (isLoading || !form) return <div className="loading-state">Loading site settings…</div>

  async function handleSave() {
    if (!form) return
    try {
      await update.mutateAsync(form)
      toast.show('Site settings saved.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not save.', 'error')
    }
  }

  function handleFileChosen(config: AssetConfig, file: File | undefined) {
    if (!file) return
    setCropping({ config, objectUrl: URL.createObjectURL(file) })
  }

  function closeCropper() {
    if (cropping) URL.revokeObjectURL(cropping.objectUrl)
    setCropping(null)
  }

  async function handleCropSave(blob: Blob) {
    if (!cropping) return
    const { config } = cropping
    setUploadingField(config.field)
    try {
      const path = await uploadSiteAsset(blob, config.prefix)
      await update.mutateAsync({ [config.field]: path })
      toast.show('Image updated.')
      closeCropper()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not upload image.', 'error')
    } finally {
      setUploadingField(null)
    }
  }

  return (
    <>
      <h1 className="page-title serif">Site Settings</h1>
      <div className="page-sub">Branding and login page content shown across the portal.</div>

      <div className="card" style={{ padding: '22px 24px', marginBottom: 20 }}>
        <h4 style={{ marginTop: 0 }}>Branding</h4>
        {ASSETS.map((config) => (
          <AssetUploader
            key={config.field}
            label={config.label}
            currentPath={settings?.[config.field]}
            uploading={uploadingField === config.field}
            onChoose={(f) => handleFileChosen(config, f)}
          />
        ))}

        <label className="field-label" style={{ marginTop: 18, display: 'block' }}>
          Company name
        </label>
        <input className="form-input" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        <label className="field-label">Tagline</label>
        <textarea className="form-textarea" value={form.company_tagline} onChange={(e) => setForm({ ...form, company_tagline: e.target.value })} />
      </div>

      <div className="card" style={{ padding: '22px 24px', marginBottom: 20 }}>
        <h4 style={{ marginTop: 0 }}>Login Page</h4>
        <label className="field-label">Heading</label>
        <input className="form-input" value={form.login_heading} onChange={(e) => setForm({ ...form, login_heading: e.target.value })} />
        <label className="field-label">Subtext</label>
        <textarea className="form-textarea" value={form.login_subtext} onChange={(e) => setForm({ ...form, login_subtext: e.target.value })} />
        <label className="field-label">Contact email</label>
        <input
          className="form-input"
          type="email"
          value={form.login_contact_email}
          onChange={(e) => setForm({ ...form, login_contact_email: e.target.value })}
        />
      </div>

      <button className="btn-solid" type="button" onClick={handleSave} disabled={update.isPending}>
        {update.isPending ? 'SAVING…' : 'SAVE CHANGES'}
      </button>

      {cropping && (
        <ImageCropper
          title={`Crop ${cropping.config.label}`}
          imageUrl={cropping.objectUrl}
          aspectRatio={cropping.config.aspectRatio}
          frameWidth={cropping.config.frameWidth}
          helpText={cropping.config.helpText}
          onCancel={closeCropper}
          onSave={handleCropSave}
          saving={!!uploadingField}
        />
      )}
    </>
  )
}

function AssetUploader({
  label,
  currentPath,
  uploading,
  onChoose,
}: {
  label: string
  currentPath: string | null | undefined
  uploading: boolean
  onChoose: (file: File | undefined) => void
}) {
  const url = publicAssetUrl(currentPath)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: url ? `url('${url}') center/contain no-repeat` : 'var(--panel-2)',
          flexShrink: 0,
        }}
      />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</div>
        <label className="btn-outline" style={{ display: 'inline-block', cursor: 'pointer' }}>
          {uploading ? 'Uploading…' : 'Replace image'}
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              onChoose(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}
