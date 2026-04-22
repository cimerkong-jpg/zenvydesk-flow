import { useMemo, useState } from 'react'
import { fetchPostHistory, type PostHistory } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { StatusBadge } from '../components/StatusBadge'
import { LoadingState } from '../components/LoadingState'
import { DataTable, type Column } from '../components/DataTable'
import { formatDateTime, formatRelative, truncate } from '../lib/format'

type StatusFilter = 'all' | 'success' | 'error' | 'pending'

export function PostHistoryPage() {
  const posts = useAsync(fetchPostHistory, [])
  const [filter, setFilter] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    const rows = posts.data ?? []
    if (filter === 'all') return rows
    return rows.filter((r) => r.post_status === filter)
  }, [posts.data, filter])

  const counts = useMemo(() => {
    const rows = posts.data ?? []
    return {
      all: rows.length,
      success: rows.filter((r) => r.post_status === 'success').length,
      error: rows.filter((r) => r.post_status === 'error').length,
      pending: rows.filter((r) => r.post_status === 'pending').length,
    }
  }, [posts.data])

  const columns: Column<PostHistory>[] = [
    {
      key: 'content',
      header: 'Content',
      render: (row) => (
        <div className="cell-primary">
          <div className="cell-title">{truncate(row.content, 140)}</div>
          {row.media_url && (
            <a
              className="cell-link"
              href={row.media_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {truncate(row.media_url, 60)}
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => <StatusBadge status={row.post_status} />,
    },
    {
      key: 'error',
      header: 'Error',
      render: (row) =>
        row.error_message ? (
          <span className="text-error">{truncate(row.error_message, 120)}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'posted',
      header: 'Posted',
      width: '200px',
      render: (row) => (
        <div>
          <div>{formatDateTime(row.posted_at)}</div>
          <div className="text-muted text-sm">{formatRelative(row.posted_at)}</div>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Post History"
        description="Record of every post attempt — successes and failures."
        actions={
          <button className="btn btn-ghost" onClick={() => posts.refresh()}>
            ↻ Refresh
          </button>
        }
      />

      <div className="filter-tabs">
        {(['all', 'success', 'error', 'pending'] as StatusFilter[]).map((key) => (
          <button
            key={key}
            className={`filter-tab ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
          >
            <span className="filter-tab-label">
              {key === 'all' ? 'All' : key.charAt(0).toUpperCase() + key.slice(1)}
            </span>
            <span className="filter-tab-count">{counts[key]}</span>
          </button>
        ))}
      </div>

      {posts.loading ? (
        <LoadingState />
      ) : posts.error ? (
        <div className="alert alert-error">
          <span className="alert-icon">✗</span>
          <div className="alert-content">
            <div className="alert-title">Failed to load history</div>
            <div className="alert-message">{posts.error}</div>
          </div>
        </div>
      ) : (
        <div className="card card-table">
          <DataTable
            columns={columns}
            rows={filtered}
            getRowKey={(row) => row.id}
            emptyTitle={filter === 'all' ? 'No posts yet' : `No ${filter} posts`}
            emptyDescription={
              filter === 'all'
                ? 'Once you publish drafts, they will appear here.'
                : 'Try another filter or publish more content.'
            }
          />
        </div>
      )}
    </div>
  )
}
