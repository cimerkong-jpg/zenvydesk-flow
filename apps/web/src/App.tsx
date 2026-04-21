import { useEffect, useState } from 'react'
import {
  fetchHealth,
  getFacebookLoginUrl,
  runScheduledPost,
  fetchPages,
  type ScheduledRunResponse,
  type PageResponse,
} from './lib/api'

type StatusState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; detail: string }
  | { kind: 'error'; detail: string }

type PostResult = {
  timestamp: string
  result: ScheduledRunResponse
  pageName: string
}

const SELECTED_PAGE_KEY = 'zenvydesk_selected_page'

function App() {
  const [backendStatus, setBackendStatus] = useState<StatusState>({ kind: 'idle' })
  const [postingStatus, setPostingStatus] = useState<StatusState>({ kind: 'idle' })
  const [pages, setPages] = useState<PageResponse[]>([])
  const [selectedPage, setSelectedPage] = useState<PageResponse | null>(null)
  const [lastResult, setLastResult] = useState<PostResult | null>(null)
  const [showPageSelector, setShowPageSelector] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      try {
        const response = await fetchHealth()
        if (!cancelled) {
          setBackendStatus({ kind: 'ok', detail: response.status })
        }
      } catch (error) {
        if (!cancelled) {
          const detail = error instanceof Error ? error.message : 'Unknown error'
          setBackendStatus({ kind: 'error', detail })
        }
      }

      try {
        const pagesData = await fetchPages()
        if (!cancelled && pagesData.length > 0) {
          setPages(pagesData)
          
          const savedPageId = localStorage.getItem(SELECTED_PAGE_KEY)
          if (savedPageId) {
            const savedPage = pagesData.find((p: PageResponse) => p.id.toString() === savedPageId)
            if (savedPage) {
              setSelectedPage(savedPage)
            } else {
              setSelectedPage(pagesData[0])
              localStorage.setItem(SELECTED_PAGE_KEY, pagesData[0].id.toString())
            }
          } else {
            setSelectedPage(pagesData[0])
            localStorage.setItem(SELECTED_PAGE_KEY, pagesData[0].id.toString())
          }
        }
      } catch (error) {
        console.error('Failed to load pages:', error)
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [])

  const handlePageSelect = (page: PageResponse) => {
    setSelectedPage(page)
    localStorage.setItem(SELECTED_PAGE_KEY, page.id.toString())
    setShowPageSelector(false)
  }

  const handleFacebookLogin = () => {
    window.location.href = getFacebookLoginUrl()
  }

  const handleRunScheduledPost = async (mockMode: boolean) => {
    if (!selectedPage) return

    setPostingStatus({ kind: 'loading' })

    try {
      const result = await runScheduledPost(mockMode)
      const postResult: PostResult = {
        timestamp: new Date().toISOString(),
        result,
        pageName: selectedPage.page_name
      }
      
      setLastResult(postResult)
      setPostingStatus({
        kind: 'ok',
        detail: `Successfully posted ${result.posted_count} of ${result.processed_count} drafts`,
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error'
      setPostingStatus({ kind: 'error', detail })
    }
  }

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

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
          <div className="nav-section">
            <div className="nav-section-title">Main</div>
            <button className="nav-item active">
              <span>📊</span>
              <span>Dashboard</span>
            </button>
            <button className="nav-item">
              <span>📝</span>
              <span>Drafts</span>
            </button>
            <button className="nav-item">
              <span>📅</span>
              <span>Schedule</span>
            </button>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Settings</div>
            <button className="nav-item">
              <span>🔗</span>
              <span>Connections</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <h1 className="page-title">Dashboard</h1>
          <div className="badge badge-neutral">
            <span className={`status-dot ${backendStatus.kind === 'ok' ? 'status-dot-success' : 'status-dot-error'}`}></span>
            {backendStatus.kind === 'ok' ? 'Backend Online' : 'Backend Offline'}
          </div>
        </div>

        <div className="content-area">
          {selectedPage ? (
            <div className="selected-page-section">
              <div className="selected-page-header">
                <div className="page-avatar">f</div>
                <div className="page-info">
                  <div className="page-name">{selectedPage.page_name}</div>
                  <div className="page-meta">ID: {selectedPage.page_id} • Ready to post</div>
                </div>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowPageSelector(!showPageSelector)}
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
                >
                  {pages.length > 1 ? `Change Page (${pages.length})` : 'Selected'}
                </button>
              </div>

              {showPageSelector && pages.length > 1 && (
                <div style={{
                  marginTop: 'var(--space-4)',
                  background: 'rgba(255,255,255,0.95)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)',
                  color: 'var(--gray-900)'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 'var(--space-3)', fontSize: '0.875rem' }}>
                    Select Facebook Page:
                  </div>
                  {pages.map(page => (
                    <button
                      key={page.id}
                      onClick={() => handlePageSelect(page)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-3)',
                        width: '100%',
                        background: page.id === selectedPage.id ? 'var(--primary-light)' : 'transparent',
                        border: page.id === selectedPage.id ? '2px solid var(--primary)' : '1px solid var(--gray-200)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-2)',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        background: page.id === selectedPage.id ? 'var(--primary)' : 'var(--gray-200)',
                        color: page.id === selectedPage.id ? 'white' : 'var(--gray-600)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem'
                      }}>
                        {page.id === selectedPage.id ? '✓' : 'f'}
                      </div>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{page.page_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>ID: {page.page_id}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : pages.length === 0 ? (
            <div className="connection-card">
              <div className="connection-icon">f</div>
              <div className="connection-info">
                <div className="connection-title">Connect Your Facebook Page</div>
                <div className="connection-subtitle">
                  Connect your Facebook account to start posting to your pages
                </div>
              </div>
              <button className="btn btn-primary btn-lg" onClick={handleFacebookLogin}>
                Connect Facebook
              </button>
            </div>
          ) : null}

          <div className="action-panel">
            <h2 className="action-panel-title">🚀 Run Scheduled Posts</h2>
            <p className="action-panel-description">
              Execute your scheduled posts now. Test with mock mode or post to Facebook.
            </p>
            <div className="flex gap-4">
              <button
                className="btn btn-lg"
                onClick={() => handleRunScheduledPost(true)}
                disabled={postingStatus.kind === 'loading' || !selectedPage}
              >
                {postingStatus.kind === 'loading' ? (
                  <>
                    <span className="spinner"></span>
                    Running...
                  </>
                ) : (
                  <>
                    <span>🧪</span>
                    Test Run (Mock)
                  </>
                )}
              </button>
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => handleRunScheduledPost(false)}
                disabled={postingStatus.kind === 'loading' || !selectedPage}
              >
                {postingStatus.kind === 'loading' ? (
                  <>
                    <span className="spinner"></span>
                    Posting...
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    Post to Facebook
                  </>
                )}
              </button>
            </div>
            {!selectedPage && (
              <div style={{ marginTop: 'var(--space-4)', opacity: 0.9, fontSize: '0.875rem' }}>
                ⚠️ Please connect a Facebook page first
              </div>
            )}
          </div>

          {postingStatus.kind !== 'idle' && postingStatus.kind !== 'loading' && (
            <div className={`alert ${postingStatus.kind === 'ok' ? 'alert-success' : 'alert-error'}`}>
              <div className="alert-icon">
                {postingStatus.kind === 'ok' ? '✓' : '✗'}
              </div>
              <div className="alert-content">
                <div className="alert-title">
                  {postingStatus.kind === 'ok' ? 'Success!' : 'Error Occurred'}
                </div>
                <div className="alert-message">{postingStatus.detail}</div>
              </div>
            </div>
          )}

          {lastResult ? (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <span>📊</span>
                  Last Execution Result
                </h3>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                  Page: {lastResult.pageName}
                </div>
              </div>

              <div className="result-card">
                <div className="result-card-header">
                  <div className={`result-status ${lastResult.result.success ? 'success' : 'error'}`}>
                    <span>{lastResult.result.success ? '✓' : '✗'}</span>
                    <span>{lastResult.result.success ? 'Completed Successfully' : 'Completed with Errors'}</span>
                  </div>
                  <div className="result-timestamp">
                    {formatTimestamp(lastResult.timestamp)}
                  </div>
                </div>

                <div className="result-metrics">
                  <div className="metric-item">
                    <div className="metric-value">{lastResult.result.processed_count}</div>
                    <div className="metric-label">Processed</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-value" style={{ color: 'var(--success)' }}>
                      {lastResult.result.posted_count}
                    </div>
                    <div className="metric-label">Posted</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-value" style={{ color: 'var(--error)' }}>
                      {lastResult.result.failed_count}
                    </div>
                    <div className="metric-label">Failed</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-value" style={{ color: 'var(--warning)' }}>
                      {lastResult.result.skipped_count}
                    </div>
                    <div className="metric-label">Skipped</div>
                  </div>
                </div>

                {lastResult.result.errors.length > 0 && (
                  <div className="mt-4">
                    <div style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      color: 'var(--error)',
                      marginBottom: 'var(--space-2)'
                    }}>
                      Errors ({lastResult.result.errors.length}):
                    </div>
                    {lastResult.result.errors.map((error: Record<string, string>, index: number) => (
                      <div key={index} style={{
                        padding: 'var(--space-3)',
                        background: 'var(--error-light)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-2)',
                        fontSize: '0.875rem'
                      }}>
                        {error.draft_id && <strong>Draft {error.draft_id}:</strong>} {error.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <h3 className="empty-state-title">No Results Yet</h3>
                <p className="empty-state-description">
                  Run your first scheduled post to see results here. {selectedPage ? 'Start with a test run to verify everything works.' : 'Connect a Facebook page first.'}
                </p>
                {selectedPage && (
                  <button 
                    className="btn btn-primary btn-lg"
                    onClick={() => handleRunScheduledPost(true)}
                    disabled={postingStatus.kind === 'loading'}
                  >
                    <span>🧪</span>
                    Run First Test
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="card mt-6">
            <div className="card-header">
              <h3 className="card-title">
                <span>⚡</span>
                System Status
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="flex justify-between items-center">
                <span style={{ fontSize: '0.875rem' }}>Backend API</span>
                <span className={`badge ${backendStatus.kind === 'ok' ? 'badge-success' : 'badge-error'}`}>
                  {backendStatus.kind === 'ok' ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ fontSize: '0.875rem' }}>Connected Pages</span>
                <span className="badge badge-neutral">{pages.length} page{pages.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ fontSize: '0.875rem' }}>Selected Page</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  {selectedPage ? selectedPage.page_name : 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
