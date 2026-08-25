import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/AuthProvider'
import { supabase } from '../../lib/supabaseClient'

export default function AcceptInvitePage() {
  const { session, loading, investorUser, refreshInvestorUser } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <div className="center-screen loading-state">Verifying your invite…</div>
  }
  if (!session) {
    return (
      <div className="center-screen">
        <div className="card" style={{ padding: 32, maxWidth: 420, textAlign: 'center' }}>
          <h2 className="serif" style={{ marginTop: 0 }}>
            Invite link not recognised
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
            This invite link may have expired or already been used. Contact your Brixton Property contact for a
            new one.
          </p>
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
    if (session) {
      await supabase.from('investor_users').update({ invite_status: 'accepted' }).eq('id', session.user.id)
      await refreshInvestorUser()
    }
    setSubmitting(false)
    navigate('/', { replace: true })
  }

  return (
    <div className="login-screen">
      <div className="login-photo" />
      <div className="login-panel">
        <h1 className="serif">Set your password</h1>
        <div className="sub-text">
          Welcome{investorUser?.name ? `, ${investorUser.name}` : ''}. Choose a password to finish setting up your
          Brixton Property investor login.
        </div>

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
