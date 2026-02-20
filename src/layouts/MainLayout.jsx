import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './MainLayout.css'

const SIDEBAR_LINKS = [
  { to: '/dashboard', label: 'Overview', icon: 'dashboard' },
  { to: '/users', label: 'Users', icon: 'users' },
  { to: '/workers', label: 'Workers', icon: 'worker' },
  { to: '/employers', label: 'Employers', icon: 'building' },
  { to: '/categories', label: 'Categories', icon: 'category' },
  { to: '/agents', label: 'Agents', icon: 'agent' },
  { to: '/jobs', label: 'Jobs & Tasks', icon: 'briefcase' },
  { to: '/payments', label: 'Payments', icon: 'payment' },
  { to: '/analytics', label: 'Analytics', icon: 'chart' },
  { to: '/fraud', label: 'Fraud Control', icon: 'shield' },
]

const iconSvg = (name) => {
  const cls = 'sidebar-icon'
  switch (name) {
    case 'dashboard':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
      )
    case 'users':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      )
    case 'worker':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M12 11v4M10 13h4"/></svg>
      )
    case 'building':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/><path d="M9 17h6"/></svg>
      )
    case 'agent':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      )
    case 'briefcase':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
      )
    case 'payment':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      )
    case 'chart':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      )
    case 'shield':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      )
    case 'category':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h6v6H4z"/><path d="M14 4h6v6h-6z"/><path d="M4 14h6v6H4z"/><path d="M14 14h6v6h-6z"/></svg>
      )
    default:
      return <span className={cls}>•</span>
  }
}

export default function MainLayout() {
  const [profileOpen, setProfileOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const closeSidebar = () => setSidebarOpen(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
    setProfileOpen(false)
  }

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'SA'
  const displayName = user?.email ? 'Super Admin' : 'Admin'
  const displayEmail = user?.email || 'admin@perday.com'

  return (
    <div className="admin-layout">
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={sidebarOpen}
      >
        <span className="sidebar-toggle-bar" />
        <span className="sidebar-toggle-bar" />
        <span className="sidebar-toggle-bar" />
      </button>
      <div
        className="sidebar-backdrop"
        aria-hidden="true"
        onClick={closeSidebar}
        data-open={sidebarOpen}
      />
      <aside className="admin-sidebar" data-open={sidebarOpen}>
        <div className="sidebar-brand">
          <div className="sidebar-logo" aria-hidden="true" />
          <span className="sidebar-brand-text">Perday CLICK</span>
        </div>
        <p className="sidebar-subtitle">Super Admin Dashboard</p>
        <nav className="sidebar-nav">
          {SIDEBAR_LINKS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeSidebar}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              {iconSvg(icon)}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p className="sidebar-version">v2.4.1 (Build 1024)</p>
          <p className="sidebar-copy">© 2026 Perday Click</p>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <div className="header-search">
            <svg className="header-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="search" placeholder="Search users, jobs, transactions..." className="header-search-input" />
          </div>
          <div className="header-actions">
            <button type="button" className="header-icon-btn" aria-label="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span className="header-badge">1</span>
            </button>
            <div className="header-profile-wrap">
              <button
                type="button"
                className="header-profile-btn"
                onClick={() => setProfileOpen((o) => !o)}
                aria-expanded={profileOpen}
                aria-haspopup="true"
              >
                <span className="header-avatar">{initials}</span>
                <div className="header-profile-text">
                  <span className="header-profile-name">{displayName}</span>
                  <span className="header-profile-email">{displayEmail}</span>
                </div>
                <svg className="header-profile-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {profileOpen && (
                <>
                  <div className="header-profile-backdrop" onClick={() => setProfileOpen(false)} aria-hidden="true" />
                  <div className="header-profile-dropdown">
                    <button type="button" className="header-dropdown-item" onClick={handleLogout}>
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
