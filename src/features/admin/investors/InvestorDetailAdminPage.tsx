import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  useInvestorAccount,
  useUpdateInvestorAccount,
  useHoldingsForAccount,
  useAssignHolding,
  useUpdateHolding,
  useRemoveHolding,
} from '../../../queries/investorAccounts'
import {
  useInvestorUsersForAccount,
  useUpdateInvestorUser,
  useCreateInvestorUser,
  useRegenerateInvite,
  useDeactivateInvestorUser,
  useDeleteInvestorUser,
} from '../../../queries/investorUsers'
import { useProperties } from '../../../queries/properties'
import { fmtCurrency, fmtPct } from '../../../lib/format'
import { useToast } from '../../../components/Toast'
import Tabs from '../../../components/Tabs'
import Modal from '../../../components/Modal'
import Icon from '../../../components/Icon'
import type { InvestorUser } from '../../../types/database.types'

type Tab = 'holdings' | 'profile' | 'logins'

export default function InvestorDetailAdminPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('holdings')

  const account = useInvestorAccount(id)
  const holdings = useHoldingsForAccount(id)
  const logins = useInvestorUsersForAccount(id)
  const allProperties = useProperties()
  const updateAccount = useUpdateInvestorAccount()
  const assignHolding = useAssignHolding()
  const updateHolding = useUpdateHolding()
  const removeHolding = useRemoveHolding()
  const updateUser = useUpdateInvestorUser()
  const createInvestor = useCreateInvestorUser()
  const regenerateInvite = useRegenerateInvite()
  const deactivate = useDeactivateInvestorUser()
  const deleteLogin = useDeleteInvestorUser()
  const toast = useToast()

  const [displayName, setDisplayName] = useState('')
  useEffect(() => {
    if (account.data) setDisplayName(account.data.display_name)
  }, [account.data])

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignForm, setAssignForm] = useState({ propertyId: '', investedAmount: '' })
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [loginForm, setLoginForm] = useState({ name: '', email: '' })
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [regeneratedLink, setRegeneratedLink] = useState<string | null>(null)

  if (account.isLoading) return <div className="loading-state">Loading investor…</div>
  if (!account.data || !id) return <div className="error-state">Investor not found.</div>

  const assignedPropertyIds = new Set((holdings.data ?? []).map((h) => h.property_id))
  const availableProperties = (allProperties.data ?? []).filter((p) => !assignedPropertyIds.has(p.id))
  const primaryUser = (logins.data ?? [])[0]

  async function handleSaveName() {
    try {
      await updateAccount.mutateAsync({ id: id!, values: { display_name: displayName } })
      toast.show('Entity name updated.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not save.', 'error')
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    try {
      await assignHolding.mutateAsync({
        investor_account_id: id!,
        property_id: assignForm.propertyId,
        invested_amount: Number(assignForm.investedAmount),
      })
      setAssignOpen(false)
      setAssignForm({ propertyId: '', investedAmount: '' })
      toast.show('Holding assigned.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not assign holding.', 'error')
    }
  }

  async function handleRemoveHolding(holdingId: string) {
    if (!confirm('Remove this property from the investor\'s holdings?')) return
    await removeHolding.mutateAsync({ id: holdingId, accountId: id! })
    toast.show('Holding removed.')
  }

  async function handleAddLogin(e: React.FormEvent) {
    e.preventDefault()
    try {
      const result = await createInvestor.mutateAsync({ name: loginForm.name, email: loginForm.email, investorAccountId: id! })
      setInviteLink(result.inviteLink)
      toast.show('Login created.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not create login.', 'error')
    }
  }

  function closeLoginModal() {
    setLoginModalOpen(false)
    setInviteLink(null)
    setLoginForm({ name: '', email: '' })
  }

  async function handleRoleChange(user: InvestorUser, role: 'admin' | 'investor') {
    try {
      await updateUser.mutateAsync({ id: user.id, values: { role } })
      toast.show(`Role updated to ${role}.`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not change role.', 'error')
    }
  }

  async function handleToggleActive(user: InvestorUser) {
    try {
      await deactivate.mutateAsync({ investorUserId: user.id, active: !user.is_active })
      toast.show(user.is_active ? 'Login deactivated.' : 'Login reactivated.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not update access.', 'error')
    }
  }

  async function handleRegenerate(user: InvestorUser) {
    try {
      const result = await regenerateInvite.mutateAsync(user.id)
      setRegeneratedLink(result.inviteLink)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not regenerate invite.', 'error')
    }
  }

  async function handleDeleteLogin(user: InvestorUser) {
    if (
      !confirm(
        `Permanently delete ${user.name}'s login (${user.email})? This can't be undone — they'll need a brand new invite to get back in.`,
      )
    )
      return
    try {
      await deleteLogin.mutateAsync(user.id)
      toast.show('Login deleted.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not delete login.', 'error')
    }
  }

  return (
    <>
      <button className="back-link" onClick={() => navigate('/admin/investors')} type="button">
        ← Back to Investors
      </button>
      <h1 className="page-title serif">{account.data.display_name}</h1>
      <div className="page-sub">Manage this investor's holdings, profile, and logins.</div>

      <div className="card" style={{ marginBottom: 20 }}>
        <Tabs
          items={[
            { id: 'holdings', label: 'Holdings' },
            { id: 'profile', label: 'Profile' },
            { id: 'logins', label: 'Logins' },
          ]}
          active={tab}
          onChange={(t) => setTab(t as Tab)}
        />

        {tab === 'holdings' && (
          <div style={{ padding: '18px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn-outline" onClick={() => setAssignOpen(true)} type="button" disabled={availableProperties.length === 0}>
                + ASSIGN PROPERTY
              </button>
            </div>
            {(holdings.data ?? []).length === 0 && <div className="empty-state">No properties assigned yet.</div>}
            {(holdings.data ?? []).map((h) => (
              <HoldingRow
                key={h.id}
                holding={h}
                accountId={id}
                onSave={(values) => updateHolding.mutateAsync({ id: h.id, accountId: id, values })}
                onRemove={() => handleRemoveHolding(h.id)}
              />
            ))}
          </div>
        )}

        {tab === 'profile' && (
          <div style={{ padding: '18px 22px', maxWidth: 420 }}>
            <label className="field-label">Entity name</label>
            <input className="form-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <button className="btn-solid" type="button" onClick={handleSaveName} disabled={updateAccount.isPending}>
              {updateAccount.isPending ? 'Saving…' : 'Save'}
            </button>
            {primaryUser && (
              <div style={{ marginTop: 20, fontSize: 12, color: 'var(--text-dim)' }}>
                Primary contact: {primaryUser.name} ({primaryUser.email}). Name/phone/address are edited by the
                investor from their own My Profile page.
              </div>
            )}
          </div>
        )}

        {tab === 'logins' && (
          <div style={{ padding: '18px 22px' }}>
            {(logins.data ?? []).length === 0 && (
              <div className="empty-state" style={{ marginBottom: 12 }}>
                No login set up yet. Holdings can be assigned and edited without one — set up an account whenever
                you're ready to give this investor access.
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn-outline" onClick={() => setLoginModalOpen(true)} type="button">
                {(logins.data ?? []).length === 0 ? '+ SET UP ACCOUNT' : '+ ADD LOGIN'}
              </button>
            </div>
            {(logins.data ?? []).map((u) => (
              <div className="admin-table-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr auto', cursor: 'default' }} key={u.id}>
                <div>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{u.email}</div>
                </div>
                <select
                  className="form-select"
                  style={{ marginBottom: 0 }}
                  value={u.role}
                  onChange={(e) => handleRoleChange(u, e.target.value as 'admin' | 'investor')}
                >
                  <option value="investor">Investor</option>
                  <option value="admin">Admin</option>
                </select>
                <span className={'status-pill ' + (u.is_active ? 'active' : 'inactive')}>{u.is_active ? 'Active' : 'Deactivated'}</span>
                <span className={'status-pill ' + (u.invite_status === 'accepted' ? 'active' : 'pending')}>
                  {u.invite_status === 'accepted' ? 'Signed up' : 'Invite pending'}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {u.invite_status === 'pending' && (
                    <button className="btn-text" type="button" onClick={() => handleRegenerate(u)}>
                      Resend
                    </button>
                  )}
                  <button className="btn-text" type="button" onClick={() => handleToggleActive(u)}>
                    {u.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                  <button className="btn-icon" type="button" onClick={() => handleDeleteLogin(u)} aria-label="Delete login">
                    <Icon name="close" size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {regeneratedLink && (
        <Modal
          title="New Invite Link"
          onClose={() => setRegeneratedLink(null)}
          footer={
            <button className="btn-solid" type="button" onClick={() => setRegeneratedLink(null)}>
              Done
            </button>
          }
        >
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 0 }}>
            Copy this link and send it to them yourself — the old link no longer works.
          </p>
          <div className="invite-box">
            <input readOnly value={regeneratedLink} onFocus={(e) => e.target.select()} />
            <button className="btn-text" type="button" onClick={() => navigator.clipboard.writeText(regeneratedLink)}>
              Copy
            </button>
          </div>
        </Modal>
      )}

      {assignOpen && (
        <Modal
          title="Assign Property"
          onClose={() => setAssignOpen(false)}
          footer={
            <>
              <button className="btn-outline" type="button" onClick={() => setAssignOpen(false)}>
                Cancel
              </button>
              <button className="btn-solid" type="submit" form="assign-form" disabled={assignHolding.isPending}>
                {assignHolding.isPending ? 'Assigning…' : 'Assign'}
              </button>
            </>
          }
        >
          <form id="assign-form" onSubmit={handleAssign}>
            <label className="field-label">Property</label>
            <select className="form-select" required value={assignForm.propertyId} onChange={(e) => setAssignForm({ ...assignForm, propertyId: e.target.value })}>
              <option value="">Select a property…</option>
              {availableProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <label className="field-label">Initial Investment ($)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              required
              value={assignForm.investedAmount}
              onChange={(e) => setAssignForm({ ...assignForm, investedAmount: e.target.value })}
            />
            <p className="form-note">
              Ownership % is calculated automatically from this amount and the property's Total Equity Invested.
            </p>
          </form>
        </Modal>
      )}

      {loginModalOpen && (
        <Modal
          title={(logins.data ?? []).length === 0 ? 'Set Up Investor Account' : 'Add Login'}
          onClose={closeLoginModal}
          footer={
            inviteLink ? (
              <button className="btn-solid" type="button" onClick={closeLoginModal}>
                Done
              </button>
            ) : (
              <>
                <button className="btn-outline" type="button" onClick={closeLoginModal}>
                  Cancel
                </button>
                <button className="btn-solid" type="submit" form="add-login-form" disabled={createInvestor.isPending}>
                  {createInvestor.isPending ? 'Creating…' : 'Create Login'}
                </button>
              </>
            )
          }
        >
          {inviteLink ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                Copy this invite link and send it to them yourself — it is not emailed automatically.
              </p>
              <div className="invite-box">
                <input readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
                <button className="btn-text" type="button" onClick={() => navigator.clipboard.writeText(inviteLink)}>
                  Copy
                </button>
              </div>
            </>
          ) : (
            <form id="add-login-form" onSubmit={handleAddLogin}>
              <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 0 }}>
                {(logins.data ?? []).length === 0
                  ? "Enter the investor's email to generate their sign-up link. It's not sent automatically — copy it and send it yourself."
                  : 'Adds another individual login (e.g. an accountant or family member) that sees the same holdings as this entity.'}
              </p>
              <label className="field-label">Name</label>
              <input className="form-input" required value={loginForm.name} onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })} />
              <label className="field-label">Email</label>
              <input className="form-input" type="email" required value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} />
            </form>
          )}
        </Modal>
      )}
    </>
  )
}

function HoldingRow({
  holding,
  onSave,
  onRemove,
}: {
  holding: {
    id: string
    property_id: string
    invested_amount: number
    properties: { name: string; location: string; total_equity_invested: number | null }
  }
  accountId: string
  onSave: (values: { invested_amount: number }) => Promise<unknown>
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [invested, setInvested] = useState(String(holding.invested_amount))
  const toast = useToast()

  const totalEquity = holding.properties?.total_equity_invested
  const ownershipPct = totalEquity ? (holding.invested_amount / totalEquity) * 100 : null

  async function save() {
    try {
      await onSave({ invested_amount: Number(invested) })
      setEditing(false)
      toast.show('Holding updated.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not save.', 'error')
    }
  }

  return (
    <div className="admin-table-row" style={{ gridTemplateColumns: '2fr 1fr 1fr auto', cursor: 'default' }}>
      <div>
        <div style={{ fontWeight: 600 }}>{holding.properties?.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{holding.properties?.location}</div>
      </div>
      <div>{fmtPct(ownershipPct)}</div>
      {editing ? (
        <input className="form-input" style={{ marginBottom: 0 }} type="number" value={invested} onChange={(e) => setInvested(e.target.value)} />
      ) : (
        <div>{fmtCurrency(holding.invested_amount)}</div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        {editing ? (
          <button className="btn-text" type="button" onClick={save}>
            Save
          </button>
        ) : (
          <button className="btn-icon" type="button" onClick={() => setEditing(true)} aria-label="Edit">
            <Icon name="edit" size={14} />
          </button>
        )}
        <button className="btn-icon" type="button" onClick={onRemove} aria-label="Remove">
          <Icon name="close" size={14} />
        </button>
      </div>
    </div>
  )
}
