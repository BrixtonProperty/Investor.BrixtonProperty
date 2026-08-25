import { useEffect, useState } from 'react'
import { useAuth } from '../../app/AuthProvider'
import { useUpdateInvestorUser } from '../../queries/investorUsers'
import { useInvestorAccount } from '../../queries/investorAccounts'
import { useToast } from '../../components/Toast'
import type { InvestorUser } from '../../types/database.types'

type FormState = Pick<
  InvestorUser,
  'name' | 'phone' | 'address_line1' | 'address_line2' | 'suburb_city' | 'region' | 'postcode' | 'country'
>

export default function ProfilePage() {
  const { investorUser, refreshInvestorUser } = useAuth()
  const account = useInvestorAccount(investorUser?.investor_account_id ?? undefined)
  const update = useUpdateInvestorUser()
  const toast = useToast()

  const [form, setForm] = useState<FormState | null>(null)

  useEffect(() => {
    if (investorUser) {
      setForm({
        name: investorUser.name,
        phone: investorUser.phone,
        address_line1: investorUser.address_line1,
        address_line2: investorUser.address_line2,
        suburb_city: investorUser.suburb_city,
        region: investorUser.region,
        postcode: investorUser.postcode,
        country: investorUser.country,
      })
    }
  }, [investorUser])

  if (!investorUser || !form) return <div className="loading-state">Loading profile…</div>

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f))
  }

  async function handleSave() {
    if (!investorUser || !form) return
    try {
      await update.mutateAsync({ id: investorUser.id, values: form })
      await refreshInvestorUser()
      toast.show('Profile updated.')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not save changes.', 'error')
    }
  }

  function handleCancel() {
    if (!investorUser) return
    setForm({
      name: investorUser.name,
      phone: investorUser.phone,
      address_line1: investorUser.address_line1,
      address_line2: investorUser.address_line2,
      suburb_city: investorUser.suburb_city,
      region: investorUser.region,
      postcode: investorUser.postcode,
      country: investorUser.country,
    })
  }

  return (
    <>
      <h1 className="page-title serif">My Profile</h1>
      <div className="page-sub">View and update your investor profile details.</div>
      <div className="card">
        <div className="profile-row">
          <div className="num-badge">1</div>
          <div>
            <div className="profile-label">Investor Name</div>
            <div className="profile-hint">Enter your full name.</div>
          </div>
          <div>
            <input className="form-input" type="text" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
        </div>
        <div className="profile-row">
          <div className="num-badge">2</div>
          <div>
            <div className="profile-label">Email</div>
            <div className="profile-hint">Contact us to change the email linked to your login.</div>
          </div>
          <div>
            <input className="form-input" type="email" value={investorUser.email} disabled />
          </div>
        </div>
        <div className="profile-row">
          <div className="num-badge">3</div>
          <div>
            <div className="profile-label">Phone</div>
            <div className="profile-hint">Enter your contact number.</div>
          </div>
          <div>
            <input
              className="form-input"
              type="text"
              value={form.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)}
            />
          </div>
        </div>
        <div className="profile-row">
          <div className="num-badge">4</div>
          <div>
            <div className="profile-label">Postal Address</div>
            <div className="profile-hint">Enter your postal address.</div>
          </div>
          <div>
            <input
              className="form-input"
              type="text"
              placeholder="Address line 1"
              value={form.address_line1 ?? ''}
              onChange={(e) => set('address_line1', e.target.value)}
            />
            <input
              className="form-input"
              type="text"
              placeholder="Address Line 2 (optional)"
              value={form.address_line2 ?? ''}
              onChange={(e) => set('address_line2', e.target.value)}
            />
            <div className="addr-grid">
              <div>
                <input
                  className="form-input"
                  type="text"
                  value={form.suburb_city ?? ''}
                  onChange={(e) => set('suburb_city', e.target.value)}
                />
                <div className="field-cap">Suburb / City</div>
              </div>
              <div>
                <input
                  className="form-input"
                  type="text"
                  value={form.region ?? ''}
                  onChange={(e) => set('region', e.target.value)}
                />
                <div className="field-cap">State / Region</div>
              </div>
              <div>
                <input
                  className="form-input"
                  type="text"
                  value={form.postcode ?? ''}
                  onChange={(e) => set('postcode', e.target.value)}
                />
                <div className="field-cap">Postcode</div>
              </div>
            </div>
            <input
              className="form-input"
              type="text"
              style={{ marginTop: 10 }}
              value={form.country}
              onChange={(e) => set('country', e.target.value)}
            />
            <div className="field-cap">Country</div>
          </div>
        </div>
        <div className="profile-row">
          <div className="num-badge">5</div>
          <div>
            <div className="profile-label">Entity Name</div>
            <div className="profile-hint">The name of your investor entity. Contact Brixton to change this.</div>
          </div>
          <div>
            <input className="form-input" type="text" value={account.data?.display_name ?? ''} disabled />
          </div>
        </div>
        <div className="profile-actions">
          <button className="btn-outline" type="button" onClick={handleCancel}>
            CANCEL
          </button>
          <button className="btn-solid" type="button" onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? 'SAVING…' : 'SAVE CHANGES'}
          </button>
        </div>
      </div>
    </>
  )
}
