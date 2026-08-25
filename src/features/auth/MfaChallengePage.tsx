import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../app/AuthProvider'

export default function MfaChallengePage() {
  const { refreshAal } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const factors = await supabase.auth.mfa.listFactors()
    const factorId = factors.data?.totp[0]?.id // .totp only ever contains verified factors
    if (!factorId) {
      setSubmitting(false)
      setError('No authenticator found on this account.')
      return
    }
    const challenge = await supabase.auth.mfa.challenge({ factorId })
    if (challenge.error) {
      setSubmitting(false)
      setError(challenge.error.message)
      return
    }
    const verify = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code })
    setSubmitting(false)
    if (verify.error) {
      setError('Incorrect code. Try again.')
      return
    }
    await refreshAal()
    navigate('/admin/properties', { replace: true })
  }

  return (
    <div className="center-screen">
      <div className="card" style={{ padding: 36, maxWidth: 380, width: '100%' }}>
        <h2 className="serif" style={{ marginTop: 0 }}>
          Enter your MFA code
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Open your authenticator app for the current code.</p>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field-input">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
              required
            />
          </div>
          <button type="submit" className="btn-gold" disabled={submitting || code.length !== 6}>
            {submitting ? 'VERIFYING…' : 'VERIFY'}
          </button>
        </form>
      </div>
    </div>
  )
}
