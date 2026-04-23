import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DataTable, type Column } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { LoadingState } from '../components/LoadingState'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../components/Toast'
import { useAsync } from '../hooks/useAsync'
import { useSelectedPage } from '../hooks/useSelectedPage'
import {
  formatDateTime,
  formatRelative,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
  truncate,
} from '../lib/format'
import {
  fetchSchedules,
  postFromDraft,
  runScheduledPost,
  scheduleDraft,
  type Draft,
  type ScheduledRunResponse,
} from '../lib/api'

export function SchedulePage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { selectedPage } = useSelectedPage()
  const schedules = useAsync(fetchSchedules, [])
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<ScheduledRunResponse | null>(null)
  const [reschedule, setReschedule] = useState<Draft | null>(null)

  const handleRun = async (mockMode: boolean) => {
    setRunning(true)
    try {
      const result = await runScheduledPost(mockMode)
      setLastRun(result)
      toast.success(
        t('schedulePage.runSuccess', {
          mode: mockMode ? t('schedulePage.mockRun') : t('schedulePage.liveRun'),
          posted: result.posted_count,
          processed: result.processed_count,
        }),
      )
      schedules.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }

  const columns: Column<Draft>[] = [
    {
      key: 'content',
      header: t('schedulePage.table.content'),
      render: (row) => (
        <div className="cell-primary">
          <div className="cell-title">{truncate(row.content, 120)}</div>
        </div>
      ),
    },
    {
      key: 'scheduled',
      header: t('schedulePage.table.scheduledFor'),
      width: '200px',
      render: (row) => (
        <div>
          <div>{row.scheduled_time ? formatDateTime(row.scheduled_time) : '-'}</div>
          <div className="text-muted text-sm">{row.scheduled_time ? formatRelative(row.scheduled_time) : ''}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('schedulePage.table.status'),
      width: '120px',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      width: '260px',
      align: 'right',
      render: (row) => (
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setReschedule(row)} disabled={row.status === 'posted'}>
            {t('schedulePage.actions.reschedule')}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={async () => {
              try {
                await postFromDraft(row.id)
                toast.success(t('schedulePage.draftPosted', { id: row.id }))
                schedules.refresh()
              } catch (err) {
                toast.error(err instanceof Error ? err.message : String(err))
              }
            }}
            disabled={row.status === 'posted' || !selectedPage}
          >
            {t('schedulePage.actions.postNow')}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader title={t('schedulePage.title')} description={t('schedulePage.description')} />

      <div className="action-panel">
        <h2 className="action-panel-title">{t('schedulePage.runTitle')}</h2>
        <p className="action-panel-description">{t('schedulePage.runDescription')}</p>
        <div className="action-panel-buttons">
          <button className="btn btn-lg" onClick={() => handleRun(true)} disabled={running || !selectedPage}>
            {running ? t('schedulePage.running') : t('schedulePage.mockRun')}
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => handleRun(false)} disabled={running || !selectedPage}>
            {running ? t('schedulePage.posting') : t('schedulePage.liveRun')}
          </button>
        </div>
      </div>

      {lastRun ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('schedulePage.lastRun')}</h3>
          </div>
          <div className="result-metrics">
            <div className="metric-item">
              <div className="metric-value">{lastRun.processed_count}</div>
              <div className="metric-label">{t('schedulePage.processed')}</div>
            </div>
            <div className="metric-item">
              <div className="metric-value success">{lastRun.posted_count}</div>
              <div className="metric-label">{t('schedulePage.posted')}</div>
            </div>
            <div className="metric-item">
              <div className="metric-value error">{lastRun.failed_count}</div>
              <div className="metric-label">{t('schedulePage.failed')}</div>
            </div>
            <div className="metric-item">
              <div className="metric-value warning">{lastRun.skipped_count}</div>
              <div className="metric-label">{t('schedulePage.skipped')}</div>
            </div>
          </div>
        </div>
      ) : null}

      {schedules.loading ? (
        <LoadingState />
      ) : schedules.error ? (
        <div className="alert alert-error">
          <div className="alert-content">
            <div className="alert-title">{t('schedulePage.failedLoad')}</div>
            <div className="alert-message">{schedules.error}</div>
          </div>
        </div>
      ) : (
        <div className="card card-table">
          <DataTable
            columns={columns}
            rows={schedules.data ?? []}
            getRowKey={(row) => row.id}
            emptyTitle={t('schedulePage.emptyTitle')}
            emptyDescription={t('schedulePage.emptyDescription')}
          />
        </div>
      )}

      <RescheduleModal
        draft={reschedule}
        onClose={() => setReschedule(null)}
        onDone={() => {
          setReschedule(null)
          schedules.refresh()
          toast.success(t('schedulePage.rescheduled'))
        }}
        onError={(message) => toast.error(message)}
      />
    </div>
  )
}

function RescheduleModal({
  draft,
  onClose,
  onDone,
  onError,
}: {
  draft: Draft | null
  onClose: () => void
  onDone: () => void
  onError: (msg: string) => void
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (draft && value === '' && draft.scheduled_time) {
    const nextValue = toDateTimeLocalValue(draft.scheduled_time)
    if (nextValue) setTimeout(() => setValue(nextValue), 0)
  }

  const handleSubmit = async () => {
    if (!draft || !value) return
    setSubmitting(true)
    try {
      await scheduleDraft(draft.id, fromDateTimeLocalValue(value))
      setValue('')
      onDone()
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={!!draft}
      title={t('schedulePage.rescheduleModal.title')}
      description={draft ? truncate(draft.content, 100) : ''}
      onClose={() => {
        setValue('')
        onClose()
      }}
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setValue('')
              onClose()
            }}
            disabled={submitting}
          >
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !value}>
            {submitting ? t('schedulePage.rescheduleModal.saving') : t('schedulePage.rescheduleModal.save')}
          </button>
        </>
      }
    >
      <FormField
        label={t('schedulePage.rescheduleModal.newTime')}
        type="datetime-local"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        required
      />
    </Modal>
  )
}
