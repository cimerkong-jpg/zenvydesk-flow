import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DataTable, type Column } from '../components/DataTable'
import { LoadingState } from '../components/LoadingState'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useAsync } from '../hooks/useAsync'
import { formatDateTime, formatRelative, truncate } from '../lib/format'
import { fetchPostHistory, type PostHistory } from '../lib/api'

type StatusFilter = 'all' | 'success' | 'error' | 'pending'

export function PostHistoryPage() {
  const { t } = useTranslation()
  const posts = useAsync(fetchPostHistory, [])
  const [filter, setFilter] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    const rows = posts.data ?? []
    if (filter === 'all') return rows
    return rows.filter((row) => row.post_status === filter)
  }, [filter, posts.data])

  const counts = useMemo(() => {
    const rows = posts.data ?? []
    return {
      all: rows.length,
      success: rows.filter((row) => row.post_status === 'success').length,
      error: rows.filter((row) => row.post_status === 'error').length,
      pending: rows.filter((row) => row.post_status === 'pending').length,
    }
  }, [posts.data])

  const columns: Column<PostHistory>[] = [
    {
      key: 'content',
      header: t('postHistoryPage.table.content'),
      render: (row) => (
        <div className="cell-primary">
          <div className="cell-title">{truncate(row.content, 140)}</div>
          {row.media_url ? (
            <a className="cell-link" href={row.media_url} target="_blank" rel="noopener noreferrer">
              {truncate(row.media_url, 60)}
            </a>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('postHistoryPage.table.status'),
      width: '120px',
      render: (row) => <StatusBadge status={row.post_status} />,
    },
    {
      key: 'error',
      header: t('postHistoryPage.table.error'),
      render: (row) =>
        row.error_message ? <span className="text-error">{truncate(row.error_message, 120)}</span> : <span className="text-muted">-</span>,
    },
    {
      key: 'posted',
      header: t('postHistoryPage.table.posted'),
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
        title={t('postHistoryPage.title')}
        description={t('postHistoryPage.description')}
        actions={
          <button className="btn btn-ghost" onClick={() => posts.refresh()}>
            {t('postHistoryPage.refresh')}
          </button>
        }
      />

      <div className="filter-tabs">
        {(['all', 'success', 'error', 'pending'] as StatusFilter[]).map((key) => (
          <button key={key} className={`filter-tab ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>
            <span className="filter-tab-label">{t(`postHistoryPage.filters.${key}`)}</span>
            <span className="filter-tab-count">{counts[key]}</span>
          </button>
        ))}
      </div>

      {posts.loading ? (
        <LoadingState />
      ) : posts.error ? (
        <div className="alert alert-error">
          <div className="alert-content">
            <div className="alert-title">{t('postHistoryPage.failedLoad')}</div>
            <div className="alert-message">{posts.error}</div>
          </div>
        </div>
      ) : (
        <div className="card card-table">
          <DataTable
            columns={columns}
            rows={filtered}
            getRowKey={(row) => row.id}
            emptyTitle={
              filter === 'all'
                ? t('postHistoryPage.emptyTitle')
                : t('postHistoryPage.emptyFilteredTitle', {
                    filter: t(`postHistoryPage.filters.${filter}`).toLowerCase(),
                  })
            }
            emptyDescription={
              filter === 'all' ? t('postHistoryPage.emptyDescription') : t('postHistoryPage.emptyFilteredDescription')
            }
          />
        </div>
      )}
    </div>
  )
}
