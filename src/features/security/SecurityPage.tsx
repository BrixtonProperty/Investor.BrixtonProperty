import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../app/AuthProvider'
import { useToast } from '../../components/Toast'

type Factor = { id: string; created_at: string }

/** Self-service "change my authenticator app" flow, shared by both admin and
 * investor accounts (routed at /security and /admin/security). Replacing
 * rather than a bare delete: enrolls the new app first and only removes the
 * old factor once the new one verifies, so the account is never briefly left
 * with zero factors mid-flow -- MFA is mandatory for every account. */
export default function SecurityPage() {
  const { refreshAal } = useAuth()
  const toast = useToast()

  const [factor, setFactor] = useState<Factor | null>(null)
  const [loading, setLoading] = useState(true)
  const [replacing, setReplacing] = useState(false)
  const [newFactorId, setNewFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function loadFactor() {
    const { data } = await supabase.auth.mfa.listFactors()
    setFactor(data?.totp[0] ?? null) // .totp only ever contains verified factors
    setLoading(false)
  }

  useEffect(() => {
    loadFactor()
  }, [])

  async function handleStart() {
    setError(null)
    setReplacing(true)
    // A unique friendly name sidesteps Supabase's "factor with this name
    // already exists" rejection -- both against the current verified factor
    // and any stale unverified one left behind by an abandoned attempt.
    const { data: existing } = await supabase.auth.mfa.listFactors()
    const stale = existing?.all.filter((f) => f.factor_type === 'totp' && f.status === 'unverified') ?? []
    for (const f of stale) {
      await supabase.auth.mfa.unenroll({ factorId: f.id })
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `replacement-${Date.now()}`,
    })
    if (error) {
      setError(error.message)
      setReplacing(false)
      return
    }
    setNewFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
  }

  async function handleCancel() {
    if (newFactorId) {
      await supabase.auth.mfa.unenroll({ factorId: newFactorId })
    }
    setNewFactorId(null)
    setQrCode(null)
    setSecret(null)
    setCode('')
    setError(null)
    setReplacing(false)
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!newFactorId) return
    setSubmitting(true)
    setError(null)
    const challenge = await supabase.auth.mfa.challenge({ factorId: newFactorId })
    if (challenge.error) {
      setSubmitting(false)
      setError(challenge.error.message)
      return
    }
    const verify = await supabase.auth.mfa.verify({ factorId: newFactorId, challengeId: challenge.data.id, code })
    if (verify.error) {
      setSubmitting(false)
      setError('Incorrect code. Check your authenticator app and try again.')
      return
    }
    if (factor) {
      try {
        await supabase.auth.mfa.unenroll({ factorId: factor.id })
      } catch {
        toast.show('New authenticator app confirmed, but the old one could not be removed. Try again or contact support.', 'error')
      }
    }
    await refreshAal()
    setSubmitting(false)
    setReplacing(false)
    setNewFactorId(null)
    setQrCode(null)
    setSecret(null)
    setCode('')
    toast.show('Authenticator app updated.')
    loadFactor()
  }

  if (loading) return <div className="loading-state">Loading security settings…</div>

  return (
    <>
      <h1 className="page-title serif">Security</h1>
      <div className="page-sub">Manage the authenticator app used for your two-factor login.</div>
      <div className="card" style={{ padding: 28, maxWidth: 460 }}>
        <div className="section-label">TWO-FACTOR AUTHENTICATION</div>

        {!replacing && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              {factor
                ? 'Two-factor authentication is active on your account.'
                : "No authenticator app is set up -- you'll be asked to set one up next time you sign in."}
            </p>
            {error && <div className="login-error">{error}</div>}
            <button className="btn-outline" type="button" onClick={handleStart}>
              {factor ? 'CHANGE AUTHENTICATOR APP' : 'SET UP AUTHENTICATOR APP'}
            </button>
          </>
        )}

        {replacing && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              Scan this QR code with the new authenticator app, then enter the 6-digit code it generates.
              {factor && ' Your current authenticator app will stop working once this is confirmed.'}
            </p>
            {qrCode && (
              <div className="mfa-qr">
                <img src={qrCode} alt="New authenticator QR code" />
              </div>
            )}
            {secret && (
              <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 20 }}>
                Can't scan it? Enter this key manually: <code>{secret}</code>
              </div>
            )}
            {error && <div className="login-error">{error}</div>}
            <form onSubmit={handleVerify}>
              <label className="field-label" htmlFor="security-mfa-code">
                6-digit code
              </label>
              <div className="field-input">
                <input
                  id="security-mfa-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn-gold" disabled={submitting || code.length !== 6}>
                  {submitting ? 'CONFIRMING…' : 'CONFIRM & REPLACE'}
                </button>
                <button type="button" className="btn-outline" onClick={handleCancel} disabled={submitting}>
                  CANCEL
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  )
}
