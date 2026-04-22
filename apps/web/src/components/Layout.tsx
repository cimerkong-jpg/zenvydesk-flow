import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchHealth } from '../lib/api'

type BackendStatus = 'loading' | 'ok' | 'down'

const NAV_MAIN = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/drafts', label: 'Drafts', icon: '📝' },
  { to: '/schedule', label: 'Schedule', icon: '📅' },
  { to: '/post-history', label: 'Post History', icon: '📜' },
]

const NAV_CONTENT = [
  { to: '/products', label: 'Products', icon: '🛍️' },
  { to: '/content-library', label: 'Content Library', icon: '📚' },
]

const NAV_AUTOMATION = [
  { to: '/automation-rules', label: 'Automation Rules', icon: '⚙️' },
]

const NAV_SETTINGS = [
  { to: '/connections', label: 'Connections', icon: '🔗' },
  { to: '/settings', label: 'Settings', icon: '🧰' },
]

export function Layout() {
  const [status, setStatus] = useState<BackendStatus>('loading')

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

  const renderNavGroup = (title: string, items: typeof NAV_MAIN) => (
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
              {status === 'loading' && 'Checking backend…'}
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
