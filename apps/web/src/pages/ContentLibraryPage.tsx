import { useState } from 'react'
import {
  createContentLibraryItem,
  fetchContentLibrary,
  type ContentLibraryItem,
} from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { StatusBadge } from '../components/StatusBadge'
import { LoadingState } from '../components/LoadingState'
import { DataTable, type Column } from '../components/DataTable'
import { useToast } from '../components/Toast'
import { formatRelative, truncate } from '../lib/format'

export function ContentLibraryPage() {
  const toast = useToast()
  const items = useAsync(fetchContentLibrary, [])
  const [showCreate, setShowCreate] = useState(false)

  const columns: Column<ContentLibraryItem>[] = [
    {
      key: 'title',
      header: 'Title',
      width: '220px',
      render: (row) => (
        <div className="cell-title">{row.title || <span className="text-muted">Untitled</span>}</div>
      ),
    },
    {
      key: 'content',
      header: 'Content',
      render: (row) => (
        <div className="cell-primary">
          <div className="cell-subtitle">{truncate(row.content, 160)}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: '140px',
      render: (row) =>
        row.content_type ? (
          <span className="badge badge-info">{row.content_type}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => (
        <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'created',
      header: 'Created',
      width: '140px',
      render: (row) => formatRelative(row.created_at),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Content Library"
        description="Reusable snippets and templates for drafts and automations."
        actions={
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Item
          </button>
        }
      />

      {items.loading ? (
        <LoadingState />
      ) : items.error ? (
        <div className="alert alert-error">
          <span className="alert-icon">✗</span>
          <div className="alert-content">
            <div className="alert-title">Failed to load library</div>
            <div className="alert-message">{items.error}</div>
          </div>
        </div>
      ) : (
        <div className="card card-table">
          <DataTable
            columns={columns}
            rows={items.data ?? []}
            getRowKey={(row) => row.id}
            emptyTitle="Library is empty"
            emptyDescription="Save reusable content to speed up drafting."
            emptyAction={
              <button
                className="btn btn-primary"
                onClick={() => setShowCreate(true)}
              >
                + Add First Item
              </button>
            }
          />
        </div>
      )}

      <CreateItemModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false)
          items.refresh()
          toast.success('Content item created')
        }}
        onError={(msg) => toast.error(msg)}
      />
    </div>
  )
}

function CreateItemModal({
  open,
  onClose,
  onCreated,
  onError,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  onError: (msg: string) => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contentType, setContentType] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setTitle('')
    setContent('')
    setContentType('')
  }

  const handleSubmit = async () => {
    if (!content.trim()) {
      onError('Content is required.')
      return
    }
    setSubmitting(true)
    try {
      await createContentLibraryItem({
        title: title.trim() || null,
        content: content.trim(),
        content_type: contentType.trim() || null,
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
      title="New Content Item"
      description="Save snippet or template for reuse."
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
            {submitting ? 'Saving…' : 'Save Item'}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <FormField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Optional title"
        />
        <FormField
          label="Content"
          as="textarea"
          required
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="The content body"
        />
        <FormField
          label="Content type"
          as="select"
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          hint="Optional label for grouping."
        >
          <option value="">(none)</option>
          <option value="text">text</option>
          <option value="image">image</option>
          <option value="video">video</option>
          <option value="template">template</option>
          <option value="snippet">snippet</option>
        </FormField>
      </div>
    </Modal>
  )
}
