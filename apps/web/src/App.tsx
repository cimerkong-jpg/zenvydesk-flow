import { useEffect, useState } from 'react'
import { apiBaseUrl } from './config'
import {
  fetchHealth,
  getFacebookLoginUrl,
  runScheduledPost,
  type ScheduledRunResponse,
} from './lib/api'

type StatusState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; detail: string }
  | { kind: 'error'; detail: string }

type PostResult = {
  timestamp: string
  result: ScheduledRunResponse
}

function App() {
  const [backendStatus, setBackendStatus] = useState<StatusState>({ kind: 'idle' })
  const [postingStatus, setPostingStatus] = useState<StatusState>({ kind: 'idle' })
  const [lastResult, setLastResult] = useState<PostResult | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Check backend health on mount
  useEffect(() => {
    let cancelled = false

    const loadHealth = async () => {
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
    }

    void loadHealth()

    return () => {
      cancelled = true
    }
  }, [])

  const handleFacebookLogin = () => {
    window.location.href = getFacebookLoginUrl()
  }

  const handleRunScheduledPost = async (mockMode: boolean) => {
    setPostingStatus({ kind: 'loading' })

    try {
      const result = await runScheduledPost(mockMode)
      const postResult: PostResult = {
        timestamp: new Date().toISOString(),
        result,
      }
      
      setLastResult(postResult)
      setPostingStatus({
        kind: 'ok',
        detail: `Posted ${result.posted_count} of ${result.processed_count} drafts`,
      })
      
      if (result.posted_count > 0) {
        setIsConnected(true)
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error'
      setPostingStatus({ kind: 'error', detail })
    }
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
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
              <span className="nav-icon">📊</span>
              <span>Dashboard</span>
            </button>
            <button className="nav-item">
              <span className="nav-icon">📝</span>
              <span>Drafts</span>
            </button>
            <button className="nav-item">
              <span className="nav-icon">📅</span>
              <span>Schedule</span>
            </button>
            <button className="nav-item">
              <span className="nav-icon">📈</span>
              <span>Analytics</span>
            </button>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Settings</div>
            <button className="nav-item">
              <span className="nav-icon">🔗</span>
              <span>Connections</span>
            </button>
            <button className="nav-item">
              <span className="nav-icon">⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Bar */}
        <div className="top-bar">
          <h1 className="page-title">Dashboard</h1>
          <div className="top-bar-actions">
            <div className="badge badge-neutral">
              <span className={`status-dot ${backendStatus.kind === 'ok' ? 'status-dot-success' : 'status-dot-error'}`}></span>
              {backendStatus.kind === 'ok' ? 'Backend Online' : 'Backend Offline'}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="content-area">
          {/* Stats Grid */}
          <div className="stat-grid mb-6">
            <div className="stat-card">
              <div className="stat-label">Total Posts</div>
              <div className="stat-value">{lastResult?.result.posted_count || 0}</div>
              <div className="stat-change stat-change-positive">
                {lastResult ? 'Last run' : 'No posts yet'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Processed</div>
              <div className="stat-value">{lastResult?.result.processed_count || 0}</div>
              <div className="stat-change">
                {lastResult ? 'Last run' : 'Waiting'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Failed</div>
              <div className="stat-value">{lastResult?.result.failed_count || 0}</div>
              <div className="stat-change stat-change-negative">
                {lastResult?.result.failed_count ? 'Check errors' : 'All good'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Skipped</div>
              <div className="stat-value">{lastResult?.result.skipped_count || 0}</div>
              <div className="stat-change">
                {lastResult ? 'Last run' : 'None'}
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-2">
            {/* Facebook Connection Card */}
            <div className={`connection-card ${isConnected ? 'connected' : ''}`}>
              <div className="connection-icon">
                {isConnected ? '✓' : 'f'}
              </div>
              <div className="connection-info">
                <div className="connection-title">
                  {isConnected ? 'Facebook Connected' : 'Facebook Not Connected'}
                </div>
                <div className="connection-subtitle">
                  {isConnected 
                    ? 'Ready to post to your pages' 
                    : 'Connect your Facebook account to start posting'}
                </div>
              </div>
              {!isConnected && (
                <button 
                  className="btn btn-primary"
                  onClick={handleFacebookLogin}
                >
                  Connect Facebook
                </button>
              )}
              {isConnected && (
                <div className="badge badge-success">
                  <span className="status-dot status-dot-success"></span>
                  Active
                </div>
              )}
            </div>

            {/* System Status Card */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <span>⚡</span>
                  System Status
                </h3>
              </div>
              <div className="card-body">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Backend API</span>
                    <span className={`badge ${backendStatus.kind === 'ok' ? 'badge-success' : 'badge-error'}`}>
                      {backendStatus.kind === 'ok' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Worker Service</span>
                    <span className="badge badge-success">Ready</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Database</span>
                    <span className="badge badge-success">Connected</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">API Base URL</span>
                    <span className="text-sm font-semibold">{apiBaseUrl}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Panel */}
          <div className="action-panel mt-6">
            <h2 className="action-panel-title">🚀 Run Scheduled Posts</h2>
            <p className="action-panel-description">
              Execute scheduled posts now. Choose mock mode for testing or real mode to post to Facebook.
            </p>
            <div className="flex gap-4">
              <button
                className="btn btn-lg"
                onClick={() => handleRunScheduledPost(true)}
                disabled={postingStatus.kind === 'loading'}
              >
                {postingStatus.kind === 'loading' ? (
                  <>
                    <span className="spinner"></span>
                    Running...
                  </>
                ) : (
                  <>
                    <span>🧪</span>
                    Run Mock Mode
                  </>
                )}
              </button>
              <button
                className="btn btn-lg btn-success"
                onClick={() => handleRunScheduledPost(false)}
                disabled={postingStatus.kind === 'loading' || !isConnected}
              >
                {postingStatus.kind === 'loading' ? (
                  <>
                    <span className="spinner"></span>
                    Posting...
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    Run Real Post
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Status Alert */}
          {postingStatus.kind !== 'idle' && postingStatus.kind !== 'loading' && (
            <div className={`alert mt-6 ${postingStatus.kind === 'ok' ? 'alert-success' : 'alert-error'}`}>
              <span>{postingStatus.kind === 'ok' ? '✓' : '✗'}</span>
              <div>
                <div className="font-semibold">
                  {postingStatus.kind === 'ok' ? 'Success!' : 'Error'}
                </div>
                <div className="text-sm">{postingStatus.detail}</div>
              </div>
            </div>
          )}

          {/* Last Result Card */}
          {lastResult ? (
            <div className="card mt-6">
              <div className="card-header">
                <h3 className="card-title">
                  <span>📊</span>
                  Last Execution Result
                </h3>
                <span className="badge badge-neutral">
                  {new Date(lastResult.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="card-body">
                <div className="result-display">
                  <pre>{JSON.stringify(lastResult.result, null, 2)}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="card mt-6">
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <h3 className="empty-state-title">No Results Yet</h3>
                <p className="empty-state-description">
                  Run your first scheduled post to see results here. Connect Facebook and click "Run Mock Mode" to test.
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={() => handleRunScheduledPost(true)}
                >
                  Run First Test
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
