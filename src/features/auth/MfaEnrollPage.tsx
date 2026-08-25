import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../app/AuthProvider'

/** Forced for every admin account before they can reach any /admin/* route (mandatory MFA). */
export default function MfaEnrollPage() {
  const { refreshAal, hasMfaFactor } = useAuth()
  const navigate = useNavigate()
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (hasMfaFactor) {
      navigate('/mfa-challenge', { replace: true })
      return
    }
    supabase.auth.mfa.enroll({ factorType: 'totp' }).then(({ data, error }) => {
      if (error) {
        setError(error.message)
        return
      }
      setQrCode(data.totp.qr_code)
      setFactorId(data.id)
    })
  }, [hasMfaFactor, navigate])

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
