import { useState } from 'react'
import {
  createDraft,
  updateDraft,
  deleteDraft,
  fetchDrafts,
  fetchProducts,
  fetchContentLibrary,
  postFromDraft,
  scheduleDraft,
  type Draft,
  type Product,
  type ContentLibraryItem,
} from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { useSelectedPage } from '../hooks/useSelectedPage'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { DataTable, type Column } from '../components/DataTable'
import { useToast } from '../components/Toast'
import {
  formatDateTime,
  formatRelative,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
  truncate,
} from '../lib/format'

export function DraftsPage() {
  const toast = useToast()
  const { selectedPage } = useSelectedPage()
  const drafts = useAsync(fetchDrafts, [])
  const products = useAsync(fetchProducts, [])

  const [showCreate, setShowCreate] = useState(false)
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null)
  const [deletingDraft, setDeletingDraft] = useState<Draft | null>(null)
  const [scheduleFor, setScheduleFor] = useState<Draft | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const refreshAll = () => {
    drafts.refresh()
  }

  const columns: Column<Draft>[] = [
    {
      key: 'content',
      header: 'Content',
      render: (row) => (
        <div className="cell-primary">
          <div className="cell-title">{truncate(row.content, 120)}</div>
          {row.media_url && (
            <a
              className="cell-link"
              href={row.media_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {row.media_url}
            </a>
          )}
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
      key: 'scheduled',
      header: 'Scheduled',
      width: '180px',
      render: (row) =>
        row.scheduled_time ? (
          <span title={formatDateTime(row.scheduled_time)}>
            {formatDateTime(row.scheduled_time)}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'created',
      header: 'Created',
      width: '140px',
      render: (row) => formatRelative(row.created_at),
    },
    {
      key: 'actions',
      header: '',
      width: '360px',
      align: 'right',
      render: (row) => (
        <div className="row-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation()
              setEditingDraft(row)
            }}
            disabled={row.status === 'posted'}
          >
            Edit
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation()
              setScheduleFor(row)
            }}
            disabled={row.status === 'posted'}
          >
            📅 Schedule
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={async (e) => {
              e.stopPropagation()
              try {
                await postFromDraft(row.id)
                toast.success(`Draft #${row.id} posted`)
                refreshAll()
              } catch (err) {
                toast.error(err instanceof Error ? err.message : String(err))
              }
            }}
            disabled={row.status === 'posted'}
          >
            📤 Post
          </button>
          <button
            className="btn btn-ghost btn-sm text-danger"
            onClick={(e) => {
              e.stopPropagation()
              setDeletingDraft(row)
            }}
          >
            Delete
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Drafts"
        description="Write, schedule, and publish posts to your Facebook page."
        actions={
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
            disabled={!selectedPage}
          >
            + New Draft
          </button>
        }
      />

      {!selectedPage && (
        <div className="alert alert-warning">
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <div className="alert-title">No page selected</div>
            <div className="alert-message">Connect a Facebook page before creating drafts.</div>
          </div>
        </div>
      )}

      {drafts.loading ? (
        <LoadingState />
      ) : drafts.error ? (
        <div className="alert alert-error">
          <span className="alert-icon">✗</span>
          <div className="alert-content">
            <div className="alert-title">Failed to load drafts</div>
            <div className="alert-message">{drafts.error}</div>
          </div>
        </div>
      ) : (
        <div className="card card-table">
          <DataTable
            columns={columns}
            rows={drafts.data ?? []}
            getRowKey={(row) => row.id}
            emptyTitle="No drafts yet"
            emptyDescription="Create your first draft to start building content."
            emptyAction={
              <button
                className="btn btn-primary"
                onClick={() => setShowCreate(true)}
                disabled={!selectedPage}
              >
                + Create Draft
              </button>
            }
          />
        </div>
      )}

      <CreateDraftModal
        open={showCreate}
        products={products.data ?? []}
        pageId={selectedPage ? Number(selectedPage.page_id) : null}
        onClose={() => setShowCreate(false)}
        submitting={submitting}
        setSubmitting={setSubmitting}
        onCreated={() => {
          setShowCreate(false)
          refreshAll()
          toast.success('Draft created')
        }}
        onError={(msg) => toast.error(msg)}
      />

      <ScheduleModal
        draft={scheduleFor}
        onClose={() => setScheduleFor(null)}
        onScheduled={() => {
          setScheduleFor(null)
          refreshAll()
          toast.success('Draft scheduled')
        }}
        onError={(msg) => toast.error(msg)}
      />
    </div>
  )
}

function CreateDraftModal({
  open,
  products,
  pageId,
  onClose,
  onCreated,
  onError,
  submitting,
  setSubmitting,
}: {
  open: boolean
  products: Product[]
  pageId: number | null
  onClose: () => void
  onCreated: () => void
  onError: (msg: string) => void
  submitting: boolean
  setSubmitting: (v: boolean) => void
}) {
  const [content, setContent] = useState('')
  const [productId, setProductId] = useState<string>('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  const reset = () => {
    setContent('')
    setProductId('')
    setMediaUrl('')
    setScheduledTime('')
  }

  const handleSubmit = async () => {
    if (!pageId) {
      onError('Connect a Facebook page first.')
      return
    }
    if (!content.trim()) {
      onError('Content is required.')
      return
    }
    setSubmitting(true)
    try {
      await createDraft({
        content: content.trim(),
        page_id: pageId,
        product_id: productId ? Number(productId) : null,
        media_url: mediaUrl.trim() || null,
        scheduled_time: scheduledTime ? fromDateTimeLocalValue(scheduledTime) : null,
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
      title="New Draft"
      description="Compose post content and attach an optional product or media."
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
            disabled={submitting || !content.trim()}
          >
            {submitting ? 'Creating…' : 'Create Draft'}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <FormField
          label="Content"
          as="textarea"
          required
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What do you want to post?"
        />
        <FormField
          label="Product"
          as="select"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          hint="Optional — link this draft to a product."
        >
          <option value="">(none)</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </FormField>
        <FormField
          label="Media URL"
          type="url"
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          placeholder="https://…"
          hint="Optional image or video URL."
        />
        <FormField
          label="Schedule for"
          type="datetime-local"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          hint="Leave empty to keep as draft."
        />
      </div>
    </Modal>
  )
}

function ScheduleModal({
  draft,
  onClose,
  onScheduled,
  onError,
}: {
  draft: Draft | null
  onClose: () => void
  onScheduled: () => void
  onError: (msg: string) => void
}) {
  const [value, setValue] = useState<string>(() =>
    draft?.scheduled_time ? toDateTimeLocalValue(draft.scheduled_time) : '',
  )
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!draft || !value) {
      onError('Pick a date and time.')
      return
    }
    setSubmitting(true)
    try {
      await scheduleDraft(draft.id, fromDateTimeLocalValue(value))
      onScheduled()
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={!!draft}
      title="Schedule Draft"
      description={draft ? truncate(draft.content, 120) : ''}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
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
            {submitting ? 'Scheduling…' : 'Schedule'}
          </button>
        </>
      }
    >
      <FormField
        label="Scheduled time"
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required
      />
    </Modal>
  )
}

// Keep imports tidy — EmptyState is used indirectly via DataTable.
void EmptyState
