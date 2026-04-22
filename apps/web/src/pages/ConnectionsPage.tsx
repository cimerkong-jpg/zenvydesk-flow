import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getFacebookLoginUrl } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { useSelectedPage } from '../hooks/useSelectedPage'
import { LoadingState } from '../components/LoadingState'
import { EmptyState } from '../components/EmptyState'

export function ConnectionsPage() {
  const { pages, selectedPage, setSelectedPage, loading, error, refresh } =
    useSelectedPage()
  const [searchParams] = useSearchParams()

  const oauthState = useMemo(() => {
    const fbConnected = searchParams.get('fb_connected')
    const pagesSaved = searchParams.get('pages_saved')
    const fbError = searchParams.get('fb_error')

    if (fbError) {
      return {
        tone: 'error' as const,
        title: 'Facebook connection failed',
        message:
          fbError === 'missing_oauth_config'
            ? 'Facebook OAuth is not configured on the backend yet.'
            : `Facebook returned: ${fbError}`,
      }
    }

    if (fbConnected === '1') {
      return {
        tone: 'success' as const,
        title: 'Facebook connected',
        message: `Saved ${pagesSaved ?? '0'} page(s) from Facebook.`,
      }
    }

    return null
  }, [searchParams])

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
            <button className="btn btn-ghost" onClick={() => void refresh()} disabled={loading}>
              Refresh
            </button>
            <button className="btn btn-primary" onClick={handleConnect}>
              <span>f</span>
              {pages.length > 0 ? 'Reconnect Facebook' : 'Connect Facebook'}
            </button>
          </div>
        }
      />

      {oauthState && (
        <div className={`alert ${oauthState.tone === 'error' ? 'alert-error' : 'alert-success'}`}>
          <span className="alert-icon">{oauthState.tone === 'error' ? 'x' : 'ok'}</span>
          <div className="alert-content">
            <div className="alert-title">{oauthState.title}</div>
            <div className="alert-message">{oauthState.message}</div>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="alert alert-error">
          <span className="alert-icon">x</span>
          <div className="alert-content">
            <div className="alert-title">Failed to load pages</div>
            <div className="alert-message">{error}</div>
          </div>
        </div>
      ) : pages.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="link"
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
              <span>fb</span>
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
                      {page.has_access_token ? ' · Token ready' : ' · Needs reconnect'}
                    </div>
                  </div>
                  {active ? (
                    <span className="badge badge-success">Selected</span>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => void setSelectedPage(page)}
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
            <span>Info</span>
            How it works
          </h3>
        </div>
        <ul className="info-list">
          <li>
            <strong>Connect Facebook</strong> - authorize ZenvyDesk to read your pages and post on
            your behalf via Facebook Login.
          </li>
          <li>
            <strong>Pick a page</strong> - the selected page is persisted and used across the app
            for posting.
          </li>
          <li>
            <strong>Reconnect</strong> - if a page loses its token or access, reconnect Facebook to
            refresh the page list.
          </li>
        </ul>
      </div>
    </div>
  )
}
