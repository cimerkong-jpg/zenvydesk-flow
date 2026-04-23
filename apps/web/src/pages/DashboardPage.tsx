import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  fetchAutomationRules,
  fetchContentLibrary,
  fetchDrafts,
  fetchPostHistory,
  fetchProducts,
  runScheduledPost,
  type Draft,
  type PostHistory,
  type ScheduledRunResponse,
} from '../lib/api'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useSelectedPage } from '../hooks/useSelectedPage'
import { useToast } from '../components/Toast'
import { formatDateTime, formatRelative, truncate } from '../lib/format'

type DashboardStats = {
  drafts: number
  scheduled: number
  posted: number
  products: number
  contentItems: number
  rules: number
}

export function DashboardPage() {
  const { t } = useTranslation()
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
      setRecentDrafts([...drafts].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 5))
      setRecentPosts([...posts].sort((a, b) => (a.posted_at < b.posted_at ? 1 : -1)).slice(0, 5))
    })
  }, [])

  const handleRun = async (mockMode: boolean) => {
    setRunning(true)
    setRunResult(null)
    try {
      const result = await runScheduledPost(mockMode)
      setRunResult(result)
      toast.success(t('dashboard.runSuccess', { posted: result.posted_count, processed: result.processed_count }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="page">
      <PageHeader title={t('dashboard.title')} description={t('dashboard.description')} />

      {selectedPage ? (
        <div className="selected-page-section">
          <div className="selected-page-header">
            <div className="page-avatar">f</div>
            <div className="page-info">
              <div className="page-name">{selectedPage.page_name}</div>
              <div className="page-meta">
                ID: {selectedPage.facebook_page_id} • {t('dashboard.selectedPageReady')}
              </div>
            </div>
            {pages.length > 1 && (
              <button className="btn btn-on-gradient" onClick={() => setShowPageSelector((v) => !v)}>
                {t('dashboard.changePage', { count: pages.length })}
              </button>
            )}
          </div>
          {showPageSelector && pages.length > 1 && (
            <div className="page-selector-dropdown">
              <div className="page-selector-title">{t('dashboard.selectFacebookPage')}</div>
              {pages.map((page) => {
                const active = page.facebook_page_id === selectedPage.facebook_page_id
                return (
                  <button
                    key={page.facebook_page_id}
                    className={`page-option ${active ? 'selected' : ''}`}
                    onClick={() => {
                      void setSelectedPage(page)
                      setShowPageSelector(false)
                    }}
                  >
                    <div className="page-option-avatar">{active ? '✓' : 'f'}</div>
                    <div className="page-option-info">
                      <div className="page-option-name">{page.page_name}</div>
                      <div className="page-option-id">ID: {page.facebook_page_id}</div>
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
            <div className="connection-title">{t('dashboard.noFacebookPage')}</div>
            <div className="connection-subtitle">{t('dashboard.noFacebookPageDescription')}</div>
          </div>
          <Link to="/connections" className="btn btn-primary btn-lg">
            {t('dashboard.goToConnections')}
          </Link>
        </div>
      )}

      <div className="stat-grid">
        <StatCard label={t('dashboard.stats.drafts')} value={stats?.drafts} icon="📝" to="/drafts" />
        <StatCard label={t('dashboard.stats.scheduled')} value={stats?.scheduled} icon="📅" to="/schedule" />
        <StatCard label={t('dashboard.stats.posted')} value={stats?.posted} icon="✅" to="/post-history" />
        <StatCard label={t('dashboard.stats.products')} value={stats?.products} icon="🛍️" to="/products" />
        <StatCard label={t('dashboard.stats.contentItems')} value={stats?.contentItems} icon="📚" to="/content-library" />
        <StatCard label={t('dashboard.stats.automations')} value={stats?.rules} icon="⚙️" to="/automation-rules" />
      </div>

      <div className="action-panel">
        <h2 className="action-panel-title">
          <span>🚀</span>
          {t('dashboard.runTitle')}
        </h2>
        <p className="action-panel-description">{t('dashboard.runDescription')}</p>
        <div className="action-panel-buttons">
          <button className="btn btn-lg" onClick={() => handleRun(true)} disabled={running || !selectedPage}>
            {running ? (
              <>
                <span className="spinner"></span>
                {t('dashboard.running')}
              </>
            ) : (
              <>
                <span>🧪</span>
                {t('dashboard.testRun')}
              </>
            )}
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => handleRun(false)} disabled={running || !selectedPage}>
            {running ? (
              <>
                <span className="spinner"></span>
                {t('dashboard.posting')}
              </>
            ) : (
              <>
                <span>📤</span>
                {t('dashboard.postToFacebook')}
              </>
            )}
          </button>
        </div>
        {!selectedPage && (
          <div className="action-panel-warning">
            <span>⚠️</span>
            {t('dashboard.postingDisabled')}
          </div>
        )}
      </div>

      {runResult && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <span>📊</span>
              {t('dashboard.lastExecutionResult')}
            </h3>
            <span className="result-timestamp">{formatDateTime(new Date().toISOString())}</span>
          </div>
          <div className="result-metrics">
            <Metric value={runResult.processed_count} label={t('dashboard.result.processed')} />
            <Metric value={runResult.posted_count} label={t('dashboard.result.posted')} tone="success" />
            <Metric value={runResult.failed_count} label={t('dashboard.result.failed')} tone="error" />
            <Metric value={runResult.skipped_count} label={t('dashboard.result.skipped')} tone="warning" />
          </div>
          {runResult.errors.length > 0 && (
            <div className="result-errors">
              <div className="result-errors-title">{t('dashboard.result.errors', { count: runResult.errors.length })}</div>
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
              {t('dashboard.recentDrafts')}
            </h3>
            <Link to="/drafts" className="btn btn-ghost btn-sm">
              {t('common.viewAll')}
            </Link>
          </div>
          {recentDrafts.length === 0 ? (
            <EmptyState
              icon="✏️"
              title={t('dashboard.noDrafts')}
              description={t('dashboard.noDraftsDescription')}
              action={<Link to="/drafts" className="btn btn-primary btn-sm">{t('dashboard.createDraft')}</Link>}
            />
          ) : (
            <ul className="list">
              {recentDrafts.map((d) => (
                <li key={d.id} className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-title">{truncate(d.content, 80)}</div>
                    <div className="list-item-meta">
                      {formatRelative(d.created_at)}
                      {d.scheduled_time && <> · {t('dashboard.scheduledAt', { time: formatDateTime(d.scheduled_time) })}</>}
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
              {t('dashboard.recentPostHistory')}
            </h3>
            <Link to="/post-history" className="btn btn-ghost btn-sm">
              {t('common.viewAll')}
            </Link>
          </div>
          {recentPosts.length === 0 ? (
            <EmptyState icon="📮" title={t('dashboard.noPosts')} description={t('dashboard.noPostsDescription')} />
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

function StatCard({ label, value, icon, to }: { label: string; value: number | undefined; icon: string; to: string }) {
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

function Metric({ value, label, tone }: { value: number; label: string; tone?: 'success' | 'error' | 'warning' }) {
  return (
    <div className="metric-item">
      <div className={`metric-value ${tone ?? ''}`.trim()}>{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  )
}
