import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useSiteSettings } from '../../queries/siteSettings'
import { publicAssetUrl } from '../../lib/signedUrl'
import { useAuth } from '../../app/AuthProvider'
import Icon from '../../components/Icon'

export default function LoginPage() {
  const { data: settings } = useSiteSettings()
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) {
    const from = (location.state as { from?: Location })?.from?.pathname
    return <Navigate to={from || '/'} replace />
  }

  const bgUrl = publicAssetUrl(settings?.login_background_storage_path)
  const logoUrl = publicAssetUrl(settings?.logo_storage_path)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="login-screen">
      <div className="login-photo" style={bgUrl ? { backgroundImage: `url('${bgUrl}')` } : undefined} />
      <div className="login-panel">
        <div className="login-logo">
          {logoUrl ? (
            <img src={logoUrl} alt={settings?.company_name ?? 'Brixton Property'} />
          ) : (
            <div className="serif" style={{ fontSize: 22, fontWeight: 600 }}>
              {settings?.company_name ?? 'Brixton Property'}
            </div>
          )}
        </div>
        <h1 className="serif">{settings?.login_heading ?? 'Welcome to the Investor Portal'}</h1>
        <div className="sub-text">
          {settings?.login_subtext ?? 'Access your investments, updates and important documents.'}
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="email">
            Email address
          </label>
          <div className="field-input">
            <input
              id="email"
              type="email"
              placeholder="Enter your email address"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <div className="field-input">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label="Toggle password visibility"
            >
              <Icon name="eye" size={16} />
            </button>
          </div>
          <div className="login-row">
            <label>
              <input type="checkbox" /> Remember me
            </label>
          </div>
          <button type="submit" className="btn-gold" disabled={submitting}>
            {submitting ? 'LOGGING IN…' : 'LOG IN'}
          </button>
        </form>

        <div className="login-help">
          Need help?
          <br />
          <br />
          Contact our investor relations team
          <br />
          <a href={`mailto:${settings?.login_contact_email ?? ''}`}>{settings?.login_contact_email}</a>
        </div>

        <div className="login-foot">
          <span>© {new Date().getFullYear()} {settings?.company_name ?? 'Brixton Property'}. All rights reserved.</span>
        </div>
      </div>
    </div>
  )
}
