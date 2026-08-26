import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { EmailOtpType } from '@supabase/supabase-js'
import { useAuth } from '../../app/AuthProvider'
import { supabase } from '../../lib/supabaseClient'

export default function AcceptInvitePage() {
  const { session, investorUser, refreshInvestorUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Our own inert link carries the raw token as a query param -- nothing
  // consumes it just by the page loading (unlike Supabase's own action_link,
  // a GET to their /verify endpoint that gets silently burned by email
  // link-preview scanners before the real recipient ever clicks). The token
  // is only spent inside handleSubmit, once a real person fills the form in.
  const tokenHash = searchParams.get('token_hash')
  const otpType = searchParams.get('type') as EmailOtpType | null

  if (!tokenHash && !session) {
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

    // token_hash (from the URL) is always the source of truth when present --
    // deliberately not trusting any session already sitting in this browser
    // (e.g. left over from a prior/abandoned attempt on a shared device),
    // which would otherwise silently take priority and could easily be for a
    // different, unrelated, or since-deleted account.
    let activeUserId: string | undefined
    if (tokenHash) {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType ?? 'invite',
      })
      if (verifyError || !data.session) {
        setSubmitting(false)
        setError('This link has already been used or has expired. Ask Brixton Property to resend your invite.')
        return
      }
      activeUserId = data.session.user.id
    } else if (session) {
      activeUserId = session.user.id
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setSubmitting(false)
      setError(updateError.message)
      return
    }
    if (activeUserId) {
      await supabase.from('investor_users').update({ invite_status: 'accepted' }).eq('id', activeUserId)
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
