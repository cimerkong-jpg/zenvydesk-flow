import { getFacebookLoginUrl } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { useSelectedPage } from '../hooks/useSelectedPage'
import { LoadingState } from '../components/LoadingState'
import { EmptyState } from '../components/EmptyState'

export function ConnectionsPage() {
  const { pages, selectedPage, setSelectedPage, loading, error, refresh } =
    useSelectedPage()

  const handleConnect = () => {
    window.location.href = getFacebookLoginUrl()
  }

  return (
    <div className="page">
      <PageHeader
        title="Connections"
        description="Link Facebook pages so ZenvyDesk can post on your behalf."
        actions={
          <div className="row-actions">
            <button className="btn btn-ghost" onClick={refresh} disabled={loading}>
              ↻ Refresh
            </button>
            <button className="btn btn-primary" onClick={handleConnect}>
              <span>f</span>
              Connect Facebook
            </button>
          </div>
        }
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="alert alert-error">
          <span className="alert-icon">✗</span>
          <div className="alert-content">
            <div className="alert-title">Failed to load pages</div>
            <div className="alert-message">{error}</div>
          </div>
        </div>
      ) : pages.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🔗"
            title="No Facebook pages connected"
            description="Connect Facebook to pick the pages you manage with ZenvyDesk."
            action={
              <button className="btn btn-primary" onClick={handleConnect}>
                Connect Facebook
              </button>
            }
          />
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <span>📘</span>
              Connected Pages ({pages.length})
            </h3>
          </div>
          <ul className="list">
            {pages.map((page) => {
              const active = selectedPage?.page_id === page.page_id
              return (
                <li key={page.page_id} className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-title">
                      <span className="page-avatar page-avatar-sm">f</span>
                      {page.page_name}
                    </div>
                    <div className="list-item-meta">
                      ID: {page.page_id}
                      {page.is_active ? ' · Active' : ' · Inactive'}
                    </div>
                  </div>
                  {active ? (
                    <span className="badge badge-success">Selected</span>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setSelectedPage(page)}
                    >
                      Use this page
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <span>ℹ️</span>
            How it works
          </h3>
        </div>
        <ul className="info-list">
          <li>
            <strong>Connect Facebook</strong> — authorize ZenvyDesk to read your pages and post on
            your behalf via Facebook Login.
          </li>
          <li>
            <strong>Pick a page</strong> — the selected page is used for creating drafts, running
            schedules, and executing automation rules.
          </li>
          <li>
            <strong>Revoke access</strong> at any time from your Facebook app settings. ZenvyDesk
            stores only the page access token needed to post.
          </li>
        </ul>
      </div>
    </div>
  )
}
