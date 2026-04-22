import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchDrafts,
  fetchPostHistory,
  fetchProducts,
  fetchContentLibrary,
  fetchAutomationRules,
  runScheduledPost,
  type Draft,
  type PostHistory,
  type ScheduledRunResponse,
} from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { useSelectedPage } from '../hooks/useSelectedPage'
import { useToast } from '../components/Toast'
import { formatDateTime, formatRelative, truncate } from '../lib/format'
import { StatusBadge } from '../components/StatusBadge'

type DashboardStats = {
  drafts: number
  scheduled: number
  posted: number
  products: number
  contentItems: number
  rules: number
}

export function DashboardPage() {
  const toast = useToast()
  const { pages, selectedPage, setSelectedPage } = useSelectedPage()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentDrafts, setRecentDrafts] = useState<Draft[]>([])
  const [recentPosts, setRecentPosts] = useState<PostHistory[]>([])
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<ScheduledRunResponse | null>(null)
  const [showPageSelector, setShowPageSelector] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchDrafts().catch(() => [] as Draft[]),
      fetchPostHistory().catch(() => [] as PostHistory[]),
      fetchProducts().catch(() => []),
      fetchContentLibrary().catch(() => []),
      fetchAutomationRules().catch(() => []),
    ]).then(([drafts, posts, products, content, rules]) => {
      setStats({
        drafts: drafts.filter((d) => d.status === 'draft').length,
        scheduled: drafts.filter((d) => d.status === 'scheduled').length,
        posted: posts.filter((p) => p.post_status === 'success').length,
        products: products.length,
        contentItems: content.length,
        rules: rules.length,
      })
      setRecentDrafts(
        [...drafts]
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
          .slice(0, 5),
      )
      setRecentPosts(
        [...posts]
          .sort((a, b) => (a.posted_at < b.posted_at ? 1 : -1))
          .slice(0, 5),
      )
    })
  }, [])

  const handleRun = async (mockMode: boolean) => {
    setRunning(true)
    setRunResult(null)
    try {
      const result = await runScheduledPost(mockMode)
      setRunResult(result)
      toast.success(
        `Posted ${result.posted_count} of ${result.processed_count} scheduled drafts`,
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        description="Overview of your content pipeline and scheduled activity."
      />

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
            {pages.length > 1 && (
              <button
                className="btn btn-on-gradient"
                onClick={() => setShowPageSelector((v) => !v)}
              >
                Change Page ({pages.length})
              </button>
            )}
          </div>
          {showPageSelector && pages.length > 1 && (
            <div className="page-selector-dropdown">
              <div className="page-selector-title">Select Facebook Page</div>
              {pages.map((page) => {
                const active = page.page_id === selectedPage.page_id
                return (
                  <button
                    key={page.page_id}
                    className={`page-option ${active ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedPage(page)
                      setShowPageSelector(false)
                    }}
                  >
                    <div className="page-option-avatar">{active ? '✓' : 'f'}</div>
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
      ) : (
        <div className="connection-card">
          <div className="connection-icon">f</div>
          <div className="connection-info">
            <div className="connection-title">No Facebook Page Connected</div>
            <div className="connection-subtitle">
              Connect a Facebook page to start posting and automating content.
            </div>
          </div>
          <Link to="/connections" className="btn btn-primary btn-lg">
            Go to Connections
          </Link>
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="Drafts" value={stats?.drafts} icon="📝" to="/drafts" />
        <StatCard label="Scheduled" value={stats?.scheduled} icon="📅" to="/schedule" />
        <StatCard label="Posted" value={stats?.posted} icon="✅" to="/post-history" />
        <StatCard label="Products" value={stats?.products} icon="🛍️" to="/products" />
        <StatCard label="Content Items" value={stats?.contentItems} icon="📚" to="/content-library" />
        <StatCard label="Automations" value={stats?.rules} icon="⚙️" to="/automation-rules" />
      </div>

      <div className="action-panel">
        <h2 className="action-panel-title">
          <span>🚀</span>
          Run Scheduled Posts
        </h2>
        <p className="action-panel-description">
          Execute all due scheduled drafts now. Start with mock mode to verify before posting live.
        </p>
        <div className="action-panel-buttons">
          <button
            className="btn btn-lg"
            onClick={() => handleRun(true)}
            disabled={running || !selectedPage}
          >
            {running ? (
              <>
                <span className="spinner"></span>
                Running…
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
            onClick={() => handleRun(false)}
            disabled={running || !selectedPage}
          >
            {running ? (
              <>
                <span className="spinner"></span>
                Posting…
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
            Connect a Facebook page to enable posting.
          </div>
        )}
      </div>

      {runResult && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <span>📊</span>
              Last Execution Result
            </h3>
            <span className="result-timestamp">{formatDateTime(new Date().toISOString())}</span>
          </div>
          <div className="result-metrics">
            <div className="metric-item">
              <div className="metric-value">{runResult.processed_count}</div>
              <div className="metric-label">Processed</div>
            </div>
            <div className="metric-item">
              <div className="metric-value success">{runResult.posted_count}</div>
              <div className="metric-label">Posted</div>
            </div>
            <div className="metric-item">
              <div className="metric-value error">{runResult.failed_count}</div>
              <div className="metric-label">Failed</div>
            </div>
            <div className="metric-item">
              <div className="metric-value warning">{runResult.skipped_count}</div>
              <div className="metric-label">Skipped</div>
            </div>
          </div>
          {runResult.errors.length > 0 && (
            <div className="result-errors">
              <div className="result-errors-title">Errors ({runResult.errors.length})</div>
              {runResult.errors.map((err, i) => (
                <div key={i} className="result-error-item">
                  {err.draft_id && <strong>Draft {err.draft_id}: </strong>}
                  {err.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="two-column">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <span>📝</span>
              Recent Drafts
            </h3>
            <Link to="/drafts" className="btn btn-ghost btn-sm">
              View all
            </Link>
          </div>
          {recentDrafts.length === 0 ? (
            <EmptyState
              icon="✏️"
              title="No drafts yet"
              description="Create your first draft to get started."
              action={
                <Link to="/drafts" className="btn btn-primary btn-sm">
                  Create Draft
                </Link>
              }
            />
          ) : (
            <ul className="list">
              {recentDrafts.map((d) => (
                <li key={d.id} className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-title">{truncate(d.content, 80)}</div>
                    <div className="list-item-meta">
                      {formatRelative(d.created_at)}
                      {d.scheduled_time && <> · Scheduled {formatDateTime(d.scheduled_time)}</>}
                    </div>
                  </div>
                  <StatusBadge status={d.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <span>📜</span>
              Recent Post History
            </h3>
            <Link to="/post-history" className="btn btn-ghost btn-sm">
              View all
            </Link>
          </div>
          {recentPosts.length === 0 ? (
            <EmptyState
              icon="📮"
              title="No posts yet"
              description="Once you post, history will appear here."
            />
          ) : (
            <ul className="list">
              {recentPosts.map((p) => (
                <li key={p.id} className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-title">{truncate(p.content, 80)}</div>
                    <div className="list-item-meta">{formatRelative(p.posted_at)}</div>
                  </div>
                  <StatusBadge status={p.post_status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  to,
}: {
  label: string
  value: number | undefined
  icon: string
  to: string
}) {
  return (
    <Link to={to} className="stat-card">
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-body">
        <div className="stat-card-value">{value ?? '—'}</div>
        <div className="stat-card-label">{label}</div>
      </div>
    </Link>
  )
}
