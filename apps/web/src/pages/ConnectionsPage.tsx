import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { PageHeader } from '../components/PageHeader'
import { useSelectedPage } from '../hooks/useSelectedPage'
import { disconnectFacebook, startFacebookConnection } from '../lib/api'

export function ConnectionsPage() {
  const { t } = useTranslation()
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
        title: t('connectionsPage.facebookConnectionFailed'),
        message: t('connectionsPage.facebookReturned', { message: fbError }),
      }
    }

    if (fbConnected === '1') {
      return {
        tone: 'success' as const,
        title: t('connectionsPage.facebookConnected'),
        message: t('connectionsPage.pagesSaved', { count: pagesSaved ?? '0' }),
      }
    }

    return null
  }, [searchParams, t])

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
        title={t('connectionsPage.title')}
        description={t('connectionsPage.description')}
        actions={
          <div className="row-actions">
            <button className="btn btn-ghost" onClick={() => void refresh()} disabled={loading}>
              {t('connectionsPage.refresh')}
            </button>
            <button className="btn btn-primary" onClick={() => void handleConnect()}>
              {pages.length > 0 ? t('connectionsPage.reconnectFacebook') : t('connectionsPage.connectFacebook')}
            </button>
            {pages.length > 0 ? (
              <button className="btn btn-secondary" onClick={() => void handleDisconnect()} disabled={disconnecting}>
                {disconnecting ? t('connectionsPage.disconnecting') : t('connectionsPage.disconnect')}
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
            <div className="alert-title">{t('connectionsPage.failedLoadPages')}</div>
            <div className="alert-message">{error}</div>
          </div>
        </div>
      ) : pages.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="link"
            title={t('connectionsPage.noPagesTitle')}
            description={t('connectionsPage.noPagesDescription')}
            action={
              <button className="btn btn-primary" onClick={() => void handleConnect()}>
                {t('connectionsPage.connectFacebook')}
              </button>
            }
          />
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('connectionsPage.connectedPages', { count: pages.length })}</h3>
            {selectedPage ? <span className="badge badge-success">{t('connectionsPage.selectedPage', { name: selectedPage.page_name })}</span> : null}
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
                      {page.is_active ? ` · ${t('connectionsPage.active')}` : ` · ${t('connectionsPage.inactive')}`}
                      {page.has_access_token ? ` · ${t('connectionsPage.tokenReady')}` : ` · ${t('connectionsPage.needsReconnect')}`}
                    </div>
                  </div>
                  {active ? (
                    <span className="badge badge-success">{t('connectionsPage.selected')}</span>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => void setSelectedPage(page)}>
                      {t('connectionsPage.useThisPage')}
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
