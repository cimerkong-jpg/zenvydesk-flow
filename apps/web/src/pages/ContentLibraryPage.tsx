import { useState } from 'react'
import {
  createContentLibraryItem,
  updateContentLibraryItem,
  deleteContentLibraryItem,
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
  const [editingItem, setEditingItem] = useState<ContentLibraryItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<ContentLibraryItem | null>(null)

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
    {
      key: 'actions',
      header: '',
      width: '180px',
      render: (row) => (
        <div className="row-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setEditingItem(row)}
          >
            Edit
          </button>
          <button
            className="btn btn-ghost btn-sm text-danger"
            onClick={() => setDeletingItem(row)}
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

      <ContentFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false)
          items.refresh()
          toast.success('Content item created')
        }}
        onError={(msg) => toast.error(msg)}
      />

      <ContentFormModal
        open={!!editingItem}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSuccess={() => {
          setEditingItem(null)
          items.refresh()
          toast.success('Content item updated')
        }}
        onError={(msg) => toast.error(msg)}
      />

      <DeleteConfirmModal
        open={!!deletingItem}
        itemTitle={deletingItem?.title || 'Untitled'}
        onClose={() => setDeletingItem(null)}
        onConfirm={async () => {
          if (!deletingItem) return
          try {
            await deleteContentLibraryItem(deletingItem.id)
            setDeletingItem(null)
            items.refresh()
            toast.success('Content item deleted')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err))
          }
        }}
      />
    </div>
  )
}

function ContentFormModal({
  open,
  item,
  onClose,
  onSuccess,
  onError,
}: {
  open: boolean
  item?: ContentLibraryItem | null
  onClose: () => void
  onSuccess: () => void
  onError: (msg: string) => void
}) {
  const isEdit = !!item
  const [title, setTitle] = useState(item?.title ?? '')
  const [content, setContent] = useState(item?.content ?? '')
  const [contentType, setContentType] = useState(item?.content_type ?? '')
  const [submitting, setSubmitting] = useState(false)

  // Update form when item changes
  useState(() => {
    if (item) {
      setTitle(item.title ?? '')
      setContent(item.content)
      setContentType(item.content_type ?? '')
    }
  })

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
      const input = {
        title: title.trim() || null,
        content: content.trim(),
        content_type: contentType.trim() || null,
      }

      if (isEdit && item) {
        await updateContentLibraryItem(item.id, input)
      } else {
        await createContentLibraryItem(input)
      }

      reset()
      onSuccess()
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit Content Item' : 'New Content Item'}
      description={isEdit ? 'Update content details.' : 'Save snippet or template for reuse.'}
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
            {submitting ? (isEdit ? 'Updating…' : 'Saving…') : (isEdit ? 'Update Item' : 'Save Item')}
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

function DeleteConfirmModal({
  open,
  itemTitle,
  onClose,
  onConfirm,
}: {
  open: boolean
  itemTitle: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    setDeleting(true)
    try {
      await onConfirm()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Delete Content Item"
      description="This action cannot be undone."
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete Item'}
          </button>
        </>
      }
    >
      <p>
        Are you sure you want to delete <strong>{itemTitle}</strong>?
      </p>
    </Modal>
  )
}
