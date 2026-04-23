import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../context/AuthContext'
import { fetchHealth } from '../lib/api'
import { LanguageSelector } from './LanguageSelector'


type BackendStatus = 'loading' | 'ok' | 'down'

interface NavItem {
  to: string
  label: string
  icon: string
  end?: boolean
}


export function Layout() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const [status, setStatus] = useState<BackendStatus>('loading')

  const navMain: NavItem[] = [
    { to: '/', label: t('nav.dashboard'), icon: 'D', end: true },
    { to: '/drafts', label: t('nav.drafts'), icon: 'Dr' },
    { to: '/schedule', label: t('nav.schedule'), icon: 'Sc' },
    { to: '/post-history', label: t('nav.postHistory'), icon: 'Ph' },
  ]

  const navContent: NavItem[] = [
    { to: '/products', label: t('nav.products'), icon: 'Pr' },
    { to: '/content-library', label: t('nav.contentLibrary'), icon: 'Cl' },
    { to: '/creative-ai', label: t('nav.creativeAi'), icon: 'Ai' },
  ]

  const navAutomation: NavItem[] = [
    { to: '/automation-rules', label: t('nav.automationRules'), icon: 'Au' },
  ]

  const navSettings: NavItem[] = [
    { to: '/connections', label: t('nav.connections'), icon: 'Fb' },
    { to: '/settings', label: t('nav.settings'), icon: 'St' },
  ]
  const navAdmin: NavItem[] =
    user?.role === 'admin' || user?.role === 'super_admin'
      ? [
          { to: '/users', label: 'Users', icon: 'Us' },
        ]
      : []

  useEffect(() => {
    let cancelled = false
    const check = () => {
      fetchHealth()
        .then(() => {
          if (!cancelled) setStatus('ok')
        })
        .catch(() => {
          if (!cancelled) setStatus('down')
        })
    }

    check()
    const id = window.setInterval(check, 30_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="nav-section">
      <div className="nav-section-title">{title}</div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  )

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">Z</div>
            <span>ZenvyDesk</span>
          </div>
          <div className="sidebar-user">
            <div className="sidebar-user-name">{user?.full_name ?? user?.email ?? t('layout.guest')}</div>
            <button className="btn btn-ghost btn-sm sidebar-logout" onClick={() => void logout()}>
              {t('layout.logout')}
            </button>
          </div>
          <LanguageSelector />
        </div>

        <nav className="sidebar-nav">
          {renderNavGroup(t('layout.main'), navMain)}
          {renderNavGroup(t('layout.content'), navContent)}
          {renderNavGroup(t('layout.automation'), navAutomation)}
          {renderNavGroup(t('layout.connections'), navSettings)}
          {navAdmin.length > 0 ? renderNavGroup(t('layout.admin'), navAdmin) : null}
        </nav>

        <div className="sidebar-footer">
          <div className={`backend-status backend-status-${status}`}>
            <span className={`status-dot status-dot-${status === 'ok' ? 'success' : 'error'}`} />
            <span className="backend-status-text">
              {status === 'loading' && t('common.loading')}
              {status === 'ok' && t('layout.backendOnline')}
              {status === 'down' && t('layout.backendOffline')}
            </span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
