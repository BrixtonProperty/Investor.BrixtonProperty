import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/AuthProvider'
import { supabase } from '../../lib/supabaseClient'

/**
 * Landing page for the "Forgot password" email link. Unlike /accept-invite,
 * this one has no choice but to rely on Supabase's own auto-consuming
 * action_link (resetPasswordForEmail() sends its own email through
 * Supabase's built-in delivery and never hands the raw token back to us the
 * way generateLink() does server-side, so there's no hashed_token available
 * here to defer verification the way AcceptInvitePage does). If an email
 * scanner burns the link before the real click, session stays null and we
 * show a clear, actionable message rather than a silent bounce to /login.
 */
export default function ResetPasswordPage() {
  const { session, loading, refreshInvestorUser } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <div className="center-screen loading-state">Verifying your link…</div>
  }
  if (!session) {
    return (
      <div className="center-screen">
        <div className="card" style={{ padding: 32, maxWidth: 420, textAlign: 'center' }}>
          <h2 className="serif" style={{ marginTop: 0 }}>
            Reset link not recognised
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
            This password reset link may have expired or already been used. Request a new one from the login page.
          </p>
          <button className="btn-outline" type="button" onClick={() => navigate('/login', { replace: true })}>
            Back to Log In
          </button>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setSubmitting(false)
      setError(updateError.message)
      return
    }
    await refreshInvestorUser()
    setSubmitting(false)
    navigate('/', { replace: true })
  }

  return (
    <div className="login-screen">
      <div className="login-photo" />
      <div className="login-panel">
        <h1 className="serif">Set a new password</h1>
        <div className="sub-text">Choose a new password for your Brixton Property investor login.</div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="password">
            New password
          </label>
          <div className="field-input">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <label className="field-label" htmlFor="confirm">
            Confirm password
          </label>
          <div className="field-input">
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <button type="submit" className="btn-gold" disabled={submitting}>
            {submitting ? 'SAVING…' : 'SET PASSWORD & CONTINUE'}
          </button>
        </form>
      </div>
    </div>
  )
}
