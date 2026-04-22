import { useEffect, useState } from 'react'
import { apiBaseUrl } from '../config'
import { fetchHealth } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { useSelectedPage } from '../hooks/useSelectedPage'
import { useToast } from '../components/Toast'

type HealthState = 'loading' | 'ok' | 'down'

export function SettingsPage() {
  const toast = useToast()
  const { pages, selectedPage, setSelectedPage } = useSelectedPage()
  const [health, setHealth] = useState<HealthState>('loading')
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)

  const runHealthCheck = () => {
    setHealth('loading')
    fetchHealth()
      .then(() => {
        setHealth('ok')
        setCheckedAt(new Date())
      })
      .catch(() => {
        setHealth('down')
        setCheckedAt(new Date())
      })
  }

  useEffect(() => {
    runHealthCheck()
  }, [])

  const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(`${label} copied`))
      .catch((err) => toast.error(err instanceof Error ? err.message : String(err)))
  }

  return (
    <div className="page">
      <PageHeader
        title="Settings"
        description="App configuration, backend status, and page preferences."
      />

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <span>🛰️</span>
            Backend
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={runHealthCheck}>
            ↻ Check now
          </button>
        </div>
        <div className="info-grid">
          <div className="info-row">
            <div className="info-label">API base URL</div>
            <div className="info-value">
              <code>{apiBaseUrl}</code>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => copyToClipboard(apiBaseUrl, 'API URL')}
              >
                Copy
              </button>
            </div>
          </div>
          <div className="info-row">
            <div className="info-label">Health status</div>
            <div className="info-value">
              <span className={`status-dot status-dot-${health === 'ok' ? 'success' : 'error'}`} />
              {health === 'loading' && 'Checking…'}
              {health === 'ok' && 'Online'}
              {health === 'down' && 'Offline'}
            </div>
          </div>
          {checkedAt && (
            <div className="info-row">
              <div className="info-label">Last checked</div>
              <div className="info-value">{checkedAt.toLocaleTimeString()}</div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <span>📘</span>
            Default Facebook page
          </h3>
        </div>
        {pages.length === 0 ? (
          <div className="info-row">
            <div className="info-label">No pages connected</div>
            <div className="info-value text-muted">Go to Connections to link a Facebook page.</div>
          </div>
        ) : (
          <ul className="list">
            {pages.map((page) => {
              const active = selectedPage?.page_id === page.page_id
              return (
                <li key={page.page_id} className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-title">{page.page_name}</div>
                    <div className="list-item-meta">ID: {page.page_id}</div>
                  </div>
                  {active ? (
                    <span className="badge badge-success">Default</span>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setSelectedPage(page)
                        toast.success(`${page.page_name} set as default`)
                      }}
                    >
                      Make default
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <span>📦</span>
            About ZenvyDesk
          </h3>
        </div>
        <ul className="info-list">
          <li>
            <strong>ZenvyDesk</strong> is a Facebook content scheduler and automation workspace.
          </li>
          <li>
            Compose drafts, schedule posts, maintain a content library, and let automation rules
            auto-generate content on your behalf.
          </li>
          <li>
            Frontend: React + Vite · Backend: FastAPI · Hosted on Render.
          </li>
        </ul>
      </div>
    </div>
  )
}
