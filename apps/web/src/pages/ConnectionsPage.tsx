import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { PageHeader } from '../components/PageHeader'
import { useSelectedPage } from '../hooks/useSelectedPage'
import { disconnectFacebook, startFacebookConnection } from '../lib/api'


export function ConnectionsPage() {
  const { pages, selectedPage, setSelectedPage, loading, error, refresh } = useSelectedPage()
  const [disconnecting, setDisconnecting] = useState(false)
  const [searchParams] = useSearchParams()

  const oauthState = useMemo(() => {
    const fbConnected = searchParams.get('fb_connected')
    const pagesSaved = searchParams.get('pages_saved')
    const fbError = searchParams.get('fb_error')

    if (fbError) {
      return {
        tone: 'error' as const,
        title: 'Facebook connection failed',
        message: `Facebook returned: ${fbError}`,
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

  const handleConnect = async () => {
    const result = await startFacebookConnection()
    window.location.href = result.authorization_url
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await disconnectFacebook()
      await refresh()
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Connections"
        description="Connect Facebook only after you are signed into ZenvyDesk."
        actions={
          <div className="row-actions">
            <button className="btn btn-ghost" onClick={() => void refresh()} disabled={loading}>
              Refresh
            </button>
            <button className="btn btn-primary" onClick={() => void handleConnect()}>
              {pages.length > 0 ? 'Reconnect Facebook' : 'Connect Facebook'}
            </button>
            {pages.length > 0 ? (
              <button className="btn btn-secondary" onClick={() => void handleDisconnect()} disabled={disconnecting}>
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            ) : null}
          </div>
        }
      />

      {oauthState ? (
        <div className={`alert ${oauthState.tone === 'error' ? 'alert-error' : 'alert-success'}`}>
          <div className="alert-content">
            <div className="alert-title">{oauthState.title}</div>
            <div className="alert-message">{oauthState.message}</div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="alert alert-error">
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
            description="Authorize Facebook to import the pages managed by the current app user."
            action={
              <button className="btn btn-primary" onClick={() => void handleConnect()}>
                Connect Facebook
              </button>
            }
          />
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Connected Pages ({pages.length})</h3>
            {selectedPage ? <span className="badge badge-success">Selected: {selectedPage.page_name}</span> : null}
          </div>
          <ul className="list">
            {pages.map((page) => {
              const active = selectedPage?.facebook_page_id === page.facebook_page_id
              return (
                <li key={page.facebook_page_id} className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-title">{page.page_name}</div>
                    <div className="list-item-meta">
                      ID: {page.facebook_page_id}
                      {page.is_active ? ' · Active' : ' · Inactive'}
                      {page.has_access_token ? ' · Token ready' : ' · Needs reconnect'}
                    </div>
                  </div>
                  {active ? (
                    <span className="badge badge-success">Selected</span>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => void setSelectedPage(page)}>
                      Use this page
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
