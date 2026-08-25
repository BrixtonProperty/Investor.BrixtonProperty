import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/AuthProvider'
import { useSiteSettings } from '../../queries/siteSettings'
import { publicAssetUrl } from '../../lib/signedUrl'
import { supabase } from '../../lib/supabaseClient'

interface NavItem {
  to: string
  label: string
}

const investorNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/investments', label: 'Investments' },
  { to: '/updates', label: 'Investor Updates' },
]
const investorSecondaryNav: NavItem[] = [
  { to: '/profile', label: 'My Profile' },
  { to: '/contact', label: 'Contact' },
]

const adminNav: NavItem[] = [
  { to: '/admin/properties', label: 'Properties' },
  { to: '/admin/investors', label: 'Investors' },
  { to: '/admin/document-categories', label: 'Document Categories' },
]
const adminSecondaryNav: NavItem[] = [{ to: '/admin/settings', label: 'Site Settings' }]

export default function AppShell() {
  const { investorUser } = useAuth()
  const { data: settings } = useSiteSettings()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const isAdmin = investorUser?.role === 'admin'
  const nav = isAdmin ? adminNav : investorNav
  const navSecondary = isAdmin ? adminSecondaryNav : investorSecondaryNav
  const logoUrl = publicAssetUrl(settings?.logo_storage_path)
  const badgeUrl = publicAssetUrl(settings?.badge_storage_path)

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app">
      <div className="sidebar">
        {logoUrl ? (
          <img className="brand-logo" src={logoUrl} alt={settings?.company_name ?? 'Brixton Property'} />
        ) : (
          <div className="brand-logo serif" style={{ fontSize: 20, fontWeight: 600 }}>
            {settings?.company_name ?? 'Brixton Property'}
          </div>
        )}
        <div className="portal-label">{isAdmin ? 'ADMIN PANEL' : 'INVESTOR PORTAL'}</div>
        <div className="nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
        <div className="nav-divider" />
        <div className="nav">
          {navSecondary.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button className="nav-item" onClick={handleLogout}>
            <span>Log Out</span>
          </button>
        </div>
        <div className="sidebar-foot">
          {badgeUrl && <img className="foot-badge" src={badgeUrl} alt="" />}
          <div className="foot-title">{settings?.company_name ?? 'Brixton Property Limited'}</div>
          <div className="foot-sub">{settings?.company_tagline}</div>
          <div className="foot-help">
            Need help?
            <br />
            Contact our investor relations team
            <br />
            <a href={`mailto:${settings?.login_contact_email ?? ''}`}>{settings?.login_contact_email}</a>
          </div>
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="topbar-badges">{isAdmin && <span className="role-badge">ADMIN</span>}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div className="bell">🔔</div>
            <div className="user" onClick={() => setMenuOpen((v) => !v)}>
              Welcome, <b>{investorUser?.name ?? ''}</b> ▾
              {menuOpen && (
                <div className="user-menu" onMouseLeave={() => setMenuOpen(false)}>
                  <button onClick={handleLogout}>Log Out</button>
                </div>
              )}
            </div>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
