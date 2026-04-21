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
            const savedPage = pagesData.find((p: PageResponse) => p.page_id === savedPageId)
            if (savedPage) {
              setSelectedPage(savedPage)
            } else {
              setSelectedPage(pagesData[0])
              localStorage.setItem(SELECTED_PAGE_KEY, pagesData[0].page_id)
            }
          } else {
            setSelectedPage(pagesData[0])
            localStorage.setItem(SELECTED_PAGE_KEY, pagesData[0].page_id)
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
    localStorage.setItem(SELECTED_PAGE_KEY, page.page_id)
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
        pageName: selectedPage.page_name,
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
      minute: '2-digit',
    })
  }

  const isPosting = postingStatus.kind === 'loading'
  const backendOnline = backendStatus.kind === 'ok'

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
          <div className={`badge ${backendOnline ? 'badge-success' : 'badge-error'}`}>
            <span
              className={`status-dot ${backendOnline ? 'status-dot-success' : 'status-dot-error'}`}
            ></span>
            {backendOnline ? 'Backend Online' : 'Backend Offline'}
          </div>
        </div>

        <div className="content-area">
          {selectedPage ? (
            <div className="selected-page-section">
              <div className="selected-page-header">
                <div className="page-avatar">f</div>
                <div className="page-info">
                  <div className="page-name">{selectedPage.page_name}</div>
                  <div className="page-meta">
                    ID: {selectedPage.page_id} • Ready to post
                  </div>
                </div>
                <button
                  className="btn btn-on-gradient"
                  onClick={() => setShowPageSelector(!showPageSelector)}
                >
                  {pages.length > 1 ? `Change Page (${pages.length})` : 'Selected'}
                </button>
              </div>

              {showPageSelector && pages.length > 1 && (
                <div className="page-selector-dropdown">
                  <div className="page-selector-title">Select Facebook Page</div>
                  {pages.map((page) => {
                    const isSelected = page.page_id === selectedPage.page_id
                    return (
                      <button
                        key={page.page_id}
                        onClick={() => handlePageSelect(page)}
                        className={`page-option ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="page-option-avatar">{isSelected ? '✓' : 'f'}</div>
                        <div className="page-option-info">
                          <div className="page-option-name">{page.page_name}</div>
                          <div className="page-option-id">ID: {page.page_id}</div>
                        </div>
                      </button>
                    )
                  })}
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
            <h2 className="action-panel-title">
              <span>🚀</span>
              Run Scheduled Posts
            </h2>
            <p className="action-panel-description">
              Execute your scheduled posts now. Test with mock mode or post to Facebook.
            </p>
            <div className="action-panel-buttons">
              <button
                className="btn btn-lg"
                onClick={() => handleRunScheduledPost(true)}
                disabled={isPosting || !selectedPage}
              >
                {isPosting ? (
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
                disabled={isPosting || !selectedPage}
              >
                {isPosting ? (
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
              <div className="action-panel-warning">
                <span>⚠️</span>
                Please connect a Facebook page first
              </div>
            )}
          </div>

          {postingStatus.kind !== 'idle' && postingStatus.kind !== 'loading' && (
            <div className={`alert ${postingStatus.kind === 'ok' ? 'alert-success' : 'alert-error'}`}>
              <div className="alert-icon">{postingStatus.kind === 'ok' ? '✓' : '✗'}</div>
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
                <div className="result-timestamp">Page: {lastResult.pageName}</div>
              </div>

              <div className="result-card">
                <div className="result-card-header">
                  <div
                    className={`result-status ${lastResult.result.success ? 'success' : 'error'}`}
                  >
                    <span>{lastResult.result.success ? '✓' : '✗'}</span>
                    <span>
                      {lastResult.result.success
                        ? 'Completed Successfully'
                        : 'Completed with Errors'}
                    </span>
                  </div>
                  <div className="result-timestamp">{formatTimestamp(lastResult.timestamp)}</div>
                </div>

                <div className="result-metrics">
                  <div className="metric-item">
                    <div className="metric-value">{lastResult.result.processed_count}</div>
                    <div className="metric-label">Processed</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-value success">{lastResult.result.posted_count}</div>
                    <div className="metric-label">Posted</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-value error">{lastResult.result.failed_count}</div>
                    <div className="metric-label">Failed</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-value warning">{lastResult.result.skipped_count}</div>
                    <div className="metric-label">Skipped</div>
                  </div>
                </div>

                {lastResult.result.errors.length > 0 && (
                  <div className="result-errors">
                    <div className="result-errors-title">
                      Errors ({lastResult.result.errors.length})
                    </div>
                    {lastResult.result.errors.map(
                      (error: Record<string, string>, index: number) => (
                        <div key={index} className="result-error-item">
                          {error.draft_id && <strong>Draft {error.draft_id}: </strong>}
                          {error.error}
                        </div>
                      ),
                    )}
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
                  Run your first scheduled post to see results here.{' '}
                  {selectedPage
                    ? 'Start with a test run to verify everything works.'
                    : 'Connect a Facebook page first.'}
                </p>
                {selectedPage && (
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={() => handleRunScheduledPost(true)}
                    disabled={isPosting}
                  >
                    <span>🧪</span>
                    Run First Test
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <span>⚡</span>
                System Status
              </h3>
            </div>
            <div className="status-list">
              <div className="status-row">
                <span className="status-row-label">Backend API</span>
                <span className={`badge ${backendOnline ? 'badge-success' : 'badge-error'}`}>
                  {backendOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="status-row">
                <span className="status-row-label">Connected Pages</span>
                <span className="badge badge-neutral">
                  {pages.length} page{pages.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="status-row">
                <span className="status-row-label">Selected Page</span>
                <span className="status-row-value">
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
