import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../app/AuthProvider'

/** Forced for every admin account before they can reach any /admin/* route (mandatory MFA). */
export default function MfaEnrollPage() {
  const { refreshAal } = useAuth()
  const navigate = useNavigate()
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function start() {
      // Don't trust AuthProvider's cached hasMfaFactor here — it can be
      // stale/racy right after a fresh login. Check directly, and clean up
      // any half-finished enrollment (e.g. from a reload mid-scan) before
      // creating a new one, since Supabase rejects a second factor with the
      // same (blank) friendly name while an unverified one still exists.
      const { data: factorsData, error: listError } = await supabase.auth.mfa.listFactors()
      if (cancelled) return
      if (listError) {
        setError(listError.message)
        return
      }
      // .totp is typed to only ever contain verified factors — unverified
      // ones (e.g. a half-finished enrollment from a previous page load)
      // only show up in .all, so that's what we need to clean up here.
      if (factorsData.totp.length > 0) {
        navigate('/mfa-challenge', { replace: true })
        return
      }
      const staleTotp = factorsData.all.filter((f) => f.factor_type === 'totp' && f.status === 'unverified')
      for (const stale of staleTotp) {
        await supabase.auth.mfa.unenroll({ factorId: stale.id })
      }
      if (cancelled) return

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (cancelled) return
      if (error) {
        setError(error.message)
        return
      }
      setQrCode(data.totp.qr_code)
      setFactorId(data.id)
    }

    start()
    return () => {
      cancelled = true
    }
  }, [navigate])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setSubmitting(true)
    setError(null)
    const challenge = await supabase.auth.mfa.challenge({ factorId })
    if (challenge.error) {
      setSubmitting(false)
      setError(challenge.error.message)
      return
    }
    const verify = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code,
    })
    setSubmitting(false)
    if (verify.error) {
      setError('Incorrect code. Check your authenticator app and try again.')
      return
    }
    await refreshAal()
    navigate('/admin/properties', { replace: true })
  }

  return (
    <div className="center-screen">
      <div className="card" style={{ padding: 36, maxWidth: 420, width: '100%' }}>
        <h2 className="serif" style={{ marginTop: 0 }}>
          Set up multi-factor authentication
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          Admin accounts require MFA. Scan this QR code with an authenticator app (Google Authenticator, 1Password,
          Authy), then enter the 6-digit code it generates.
        </p>
        {error && <div className="login-error">{error}</div>}
        {qrCode && (
          <div className="mfa-qr">
            <img src={qrCode} alt="MFA QR code" />
          </div>
        )}
        <form onSubmit={handleVerify}>
          <label className="field-label" htmlFor="mfa-code">
            6-digit code
          </label>
          <div className="field-input">
            <input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>
          <button type="submit" className="btn-gold" disabled={submitting || code.length !== 6}>
            {submitting ? 'VERIFYING…' : 'VERIFY & CONTINUE'}
          </button>
        </form>
      </div>
    </div>
  )
}
