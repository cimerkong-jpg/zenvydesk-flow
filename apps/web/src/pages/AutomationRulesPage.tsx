import { useState } from 'react'
import {
  createAutomationRule,
  fetchAutomationRules,
  runAutomation,
  type AutomationRule,
  type AutomationRunResult,
} from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { useSelectedPage } from '../hooks/useSelectedPage'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { StatusBadge } from '../components/StatusBadge'
import { LoadingState } from '../components/LoadingState'
import { DataTable, type Column } from '../components/DataTable'
import { useToast } from '../components/Toast'
import {
  formatDateTime,
  formatRelative,
  fromDateTimeLocalValue,
} from '../lib/format'

export function AutomationRulesPage() {
  const toast = useToast()
  const { selectedPage } = useSelectedPage()
  const rules = useAsync(fetchAutomationRules, [])
  const [showCreate, setShowCreate] = useState(false)
  const [runningId, setRunningId] = useState<number | null>(null)
  const [lastResult, setLastResult] = useState<AutomationRunResult | null>(null)

  const handleRun = async (ruleId: number) => {
    setRunningId(ruleId)
    setLastResult(null)
    try {
      const result = await runAutomation(ruleId)
      setLastResult(result)
      toast.success(`Rule ${ruleId}: ${result.status}`)
      rules.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setRunningId(null)
    }
  }

  const columns: Column<AutomationRule>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div className="cell-primary">
          <div className="cell-title">{row.name}</div>
          <div className="cell-subtitle text-muted text-sm">
            Page #{row.page_id}
            {row.content_type ? ` · ${row.content_type}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'scheduled',
      header: 'Scheduled',
      width: '180px',
      render: (row) => (
        <div>
          <div>{formatDateTime(row.scheduled_time)}</div>
          <div className="text-muted text-sm">{formatRelative(row.scheduled_time)}</div>
        </div>
      ),
    },
    {
      key: 'auto',
      header: 'Auto-post',
      width: '110px',
      render: (row) => (
        <StatusBadge status={row.auto_post ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'selection',
      header: 'Selection',
      width: '140px',
      render: (row) =>
        row.product_selection_mode ? (
          <span className="badge badge-info">{row.product_selection_mode}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      width: '140px',
      align: 'right',
      render: (row) => (
        <button
          className="btn btn-primary btn-sm"
          onClick={() => handleRun(row.id)}
          disabled={runningId !== null}
        >
          {runningId === row.id ? '⏳ Running…' : '▶ Run now'}
        </button>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Automation Rules"
        description="Rules that generate and optionally publish drafts automatically."
        actions={
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
            disabled={!selectedPage}
          >
            + New Rule
          </button>
        }
      />

      {!selectedPage && (
        <div className="alert alert-warning">
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <div className="alert-title">No page selected</div>
            <div className="alert-message">Connect a Facebook page before creating rules.</div>
          </div>
        </div>
      )}

      {lastResult && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Last run</h3>
          </div>
          <div className="result-metrics">
            <div className="metric-item">
              <div className="metric-value">{lastResult.rule_id}</div>
              <div className="metric-label">Rule ID</div>
            </div>
            <div className="metric-item">
              <div className="metric-value success">{lastResult.status}</div>
              <div className="metric-label">Status</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">{lastResult.provider}</div>
              <div className="metric-label">Provider</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">{lastResult.model}</div>
              <div className="metric-label">Model</div>
            </div>
          </div>
          {lastResult.error && (
            <div className="result-errors">
              <div className="result-errors-title">Error</div>
              <div className="result-error-item">{lastResult.error}</div>
            </div>
          )}
        </div>
      )}

      {rules.loading ? (
        <LoadingState />
      ) : rules.error ? (
        <div className="alert alert-error">
          <span className="alert-icon">✗</span>
          <div className="alert-content">
            <div className="alert-title">Failed to load rules</div>
            <div className="alert-message">{rules.error}</div>
          </div>
        </div>
      ) : (
        <div className="card card-table">
          <DataTable
            columns={columns}
            rows={rules.data ?? []}
            getRowKey={(row) => row.id}
            emptyTitle="No automation rules"
            emptyDescription="Create rules to auto-generate drafts on a schedule."
            emptyAction={
              <button
                className="btn btn-primary"
                onClick={() => setShowCreate(true)}
                disabled={!selectedPage}
              >
                + Create Rule
              </button>
            }
          />
        </div>
      )}

      <CreateRuleModal
        open={showCreate}
        pageId={selectedPage ? Number(selectedPage.page_id) : null}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false)
          rules.refresh()
          toast.success('Automation rule created')
        }}
        onError={(msg) => toast.error(msg)}
      />
    </div>
  )
}

function CreateRuleModal({
  open,
  pageId,
  onClose,
  onCreated,
  onError,
}: {
  open: boolean
  pageId: number | null
  onClose: () => void
  onCreated: () => void
  onError: (msg: string) => void
}) {
  const [name, setName] = useState('')
  const [contentType, setContentType] = useState('')
  const [autoPost, setAutoPost] = useState(false)
  const [scheduledTime, setScheduledTime] = useState('')
  const [selectionMode, setSelectionMode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setName('')
    setContentType('')
    setAutoPost(false)
    setScheduledTime('')
    setSelectionMode('')
  }

  const handleSubmit = async () => {
    if (!pageId) {
      onError('Connect a Facebook page first.')
      return
    }
    if (!name.trim()) {
      onError('Name is required.')
      return
    }
    if (!scheduledTime) {
      onError('Scheduled time is required.')
      return
    }
    setSubmitting(true)
    try {
      await createAutomationRule({
        page_id: pageId,
        name: name.trim(),
        content_type: contentType.trim() || null,
        auto_post: autoPost,
        scheduled_time: fromDateTimeLocalValue(scheduledTime),
        product_selection_mode: selectionMode.trim() || null,
      })
      reset()
      onCreated()
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title="New Automation Rule"
      description="Configure how and when to generate drafts automatically."
      size="lg"
      onClose={() => {
        reset()
        onClose()
      }}
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              reset()
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
            disabled={submitting || !name.trim() || !scheduledTime}
          >
            {submitting ? 'Creating…' : 'Create Rule'}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <FormField
          label="Rule name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Daily product spotlight"
        />
        <FormField
          label="Content type"
          as="select"
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          hint="What kind of content should this rule generate?"
        >
          <option value="">(auto)</option>
          <option value="text">text</option>
          <option value="product">product</option>
          <option value="promotional">promotional</option>
          <option value="educational">educational</option>
        </FormField>
        <FormField
          label="Scheduled time"
          type="datetime-local"
          required
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
        />
        <FormField
          label="Product selection mode"
          as="select"
          value={selectionMode}
          onChange={(e) => setSelectionMode(e.target.value)}
          hint="How to pick a product if any."
        >
          <option value="">(none)</option>
          <option value="random">random</option>
          <option value="round_robin">round_robin</option>
          <option value="newest">newest</option>
          <option value="oldest">oldest</option>
        </FormField>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={autoPost}
            onChange={(e) => setAutoPost(e.target.checked)}
          />
          <span>
            <strong>Auto-post</strong> — publish immediately instead of just creating a draft.
          </span>
        </label>
      </div>
    </Modal>
  )
}
