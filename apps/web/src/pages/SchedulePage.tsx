import { useState } from 'react'
import {
  fetchSchedules,
  postFromDraft,
  runScheduledPost,
  scheduleDraft,
  type Draft,
  type ScheduledRunResponse,
} from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { useSelectedPage } from '../hooks/useSelectedPage'
import { StatusBadge } from '../components/StatusBadge'
import { LoadingState } from '../components/LoadingState'
import { DataTable, type Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { useToast } from '../components/Toast'
import {
  formatDateTime,
  formatRelative,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
  truncate,
} from '../lib/format'

export function SchedulePage() {
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
        `${mockMode ? 'Mock run' : 'Live run'}: posted ${result.posted_count} of ${result.processed_count}`,
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
      header: 'Content',
      render: (row) => (
        <div className="cell-primary">
          <div className="cell-title">{truncate(row.content, 120)}</div>
        </div>
      ),
    },
    {
      key: 'scheduled',
      header: 'Scheduled for',
      width: '200px',
      render: (row) => (
        <div>
          <div>{row.scheduled_time ? formatDateTime(row.scheduled_time) : '—'}</div>
          <div className="text-muted text-sm">
            {row.scheduled_time ? formatRelative(row.scheduled_time) : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
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
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setReschedule(row)}
            disabled={row.status === 'posted'}
          >
            📅 Reschedule
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={async () => {
              try {
                await postFromDraft(row.id)
                toast.success(`Draft #${row.id} posted`)
                schedules.refresh()
              } catch (err) {
                toast.error(err instanceof Error ? err.message : String(err))
              }
            }}
            disabled={row.status === 'posted'}
          >
            📤 Post now
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Schedule"
        description="All drafts with a scheduled publish time."
      />

      <div className="action-panel">
        <h2 className="action-panel-title">
          <span>🚀</span>
          Run due scheduled posts
        </h2>
        <p className="action-panel-description">
          Execute all drafts whose scheduled time is in the past.
        </p>
        <div className="action-panel-buttons">
          <button
            className="btn btn-lg"
            onClick={() => handleRun(true)}
            disabled={running || !selectedPage}
          >
            {running ? '⏳ Running…' : '🧪 Mock run'}
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => handleRun(false)}
            disabled={running || !selectedPage}
          >
            {running ? '⏳ Posting…' : '📤 Live run'}
          </button>
        </div>
      </div>

      {lastRun && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Last run</h3>
          </div>
          <div className="result-metrics">
            <div className="metric-item">
              <div className="metric-value">{lastRun.processed_count}</div>
              <div className="metric-label">Processed</div>
            </div>
            <div className="metric-item">
              <div className="metric-value success">{lastRun.posted_count}</div>
              <div className="metric-label">Posted</div>
            </div>
            <div className="metric-item">
              <div className="metric-value error">{lastRun.failed_count}</div>
              <div className="metric-label">Failed</div>
            </div>
            <div className="metric-item">
              <div className="metric-value warning">{lastRun.skipped_count}</div>
              <div className="metric-label">Skipped</div>
            </div>
          </div>
        </div>
      )}

      {schedules.loading ? (
        <LoadingState />
      ) : schedules.error ? (
        <div className="alert alert-error">
          <span className="alert-icon">✗</span>
          <div className="alert-content">
            <div className="alert-title">Failed to load</div>
            <div className="alert-message">{schedules.error}</div>
          </div>
        </div>
      ) : (
        <div className="card card-table">
          <DataTable
            columns={columns}
            rows={schedules.data ?? []}
            getRowKey={(row) => row.id}
            emptyTitle="No scheduled drafts"
            emptyDescription="Schedule drafts from the Drafts page to see them here."
          />
        </div>
      )}

      <RescheduleModal
        draft={reschedule}
        onClose={() => setReschedule(null)}
        onDone={() => {
          setReschedule(null)
          schedules.refresh()
          toast.success('Rescheduled')
        }}
        onError={(msg) => toast.error(msg)}
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
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Initialize value whenever draft opens
  if (draft && value === '' && draft.scheduled_time) {
    // only set once per open
    const v = toDateTimeLocalValue(draft.scheduled_time)
    if (v) setTimeout(() => setValue(v), 0)
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
      title="Reschedule Draft"
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
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !value}
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <FormField
        label="New scheduled time"
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required
      />
    </Modal>
  )
}
