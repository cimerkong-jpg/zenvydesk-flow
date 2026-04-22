import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchHealth } from '../lib/api'
import { LanguageSelector } from './LanguageSelector'

type BackendStatus = 'loading' | 'ok' | 'down'

interface NavItem {
  to: string
  labelKey: string
  icon: string
  end?: boolean
}

export function Layout() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<BackendStatus>('loading')

  const NAV_MAIN: NavItem[] = [
    { to: '/', labelKey: 'nav.dashboard', icon: '📊', end: true },
    { to: '/drafts', labelKey: 'nav.drafts', icon: '📝' },
    { to: '/schedule', labelKey: 'nav.schedule', icon: '📅' },
    { to: '/post-history', labelKey: 'nav.postHistory', icon: '📜' },
  ]

  const NAV_CONTENT: NavItem[] = [
    { to: '/products', labelKey: 'nav.products', icon: '🛍️' },
    { to: '/content-library', labelKey: 'nav.contentLibrary', icon: '📚' },
  ]

  const NAV_AUTOMATION: NavItem[] = [
    { to: '/automation-rules', labelKey: 'nav.automationRules', icon: '⚙️' },
  ]

  const NAV_SETTINGS: NavItem[] = [
    { to: '/connections', labelKey: 'nav.connections', icon: '🔗' },
    { to: '/settings', labelKey: 'nav.settings', icon: '🧰' },
  ]

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
          <span>{t(item.labelKey)}</span>
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
          <LanguageSelector />
        </div>

        <nav className="sidebar-nav">
          {renderNavGroup('Main', NAV_MAIN)}
          {renderNavGroup('Content', NAV_CONTENT)}
          {renderNavGroup('Automation', NAV_AUTOMATION)}
          {renderNavGroup('Settings', NAV_SETTINGS)}
        </nav>

        <div className="sidebar-footer">
          <div className={`backend-status backend-status-${status}`}>
            <span className={`status-dot status-dot-${status === 'ok' ? 'success' : 'error'}`} />
            <span className="backend-status-text">
              {status === 'loading' && t('common.loading')}
              {status === 'ok' && 'Backend online'}
              {status === 'down' && 'Backend offline'}
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
