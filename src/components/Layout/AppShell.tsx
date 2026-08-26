import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/AuthProvider'
import { useSiteSettings } from '../../queries/siteSettings'
import { publicAssetUrl } from '../../lib/signedUrl'
import { supabase } from '../../lib/supabaseClient'
import Icon from '../Icon'

interface NavItem {
  to: string
  label: string
  /** Match only the exact path -- for pages with no nested child routes, so
   * a shorter sibling path (e.g. /admin/portfolio) doesn't stay highlighted
   * just because it's a string-prefix of /admin/portfolio/investments etc. */
  end?: boolean
}

const investorNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/investments', label: 'Investments' },
  { to: '/updates', label: 'Investor Updates', end: true },
]
const investorSecondaryNav: NavItem[] = [
  { to: '/profile', label: 'My Profile', end: true },
  { to: '/contact', label: 'Contact', end: true },
]

const adminNav: NavItem[] = [
  { to: '/admin/properties', label: 'Properties' },
  { to: '/admin/investors', label: 'Investors' },
  { to: '/admin/document-categories', label: 'Document Categories', end: true },
]
const adminSecondaryNav: NavItem[] = [{ to: '/admin/settings', label: 'Site Settings', end: true }]

// Admin's read-only preview of the investor experience -- unscoped across
// every property, since an admin has no personal holdings of their own.
const portfolioNav: NavItem[] = [
  { to: '/admin/portfolio', label: 'Dashboard', end: true },
  { to: '/admin/portfolio/investments', label: 'Investments' },
  { to: '/admin/portfolio/updates', label: 'Investor Updates', end: true },
]

export default function AppShell() {
  const { investorUser } = useAuth()
  const { data: settings } = useSiteSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isAdmin = investorUser?.role === 'admin'
  const isPortfolioMode = isAdmin && location.pathname.startsWith('/admin/portfolio')
  const nav = isPortfolioMode ? portfolioNav : isAdmin ? adminNav : investorNav
  const navSecondary = isPortfolioMode ? [] : isAdmin ? adminSecondaryNav : investorSecondaryNav
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
        <div className="portal-label">{isPortfolioMode ? 'INVESTOR VIEW' : isAdmin ? 'ADMIN PANEL' : 'INVESTOR PORTAL'}</div>
        <div className="nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
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
              end={item.end}
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
          <div className="topbar-badges">
            {isAdmin ? (
              <div className="mode-toggle">
                <button className={!isPortfolioMode ? 'active' : ''} onClick={() => navigate('/admin/properties')} type="button">
                  Admin Panel
                </button>
                <button className={isPortfolioMode ? 'active' : ''} onClick={() => navigate('/admin/portfolio')} type="button">
                  Investor View
                </button>
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div className="bell">
              <Icon name="bell" />
            </div>
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
