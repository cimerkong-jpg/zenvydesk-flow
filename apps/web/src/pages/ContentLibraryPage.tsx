import { useEffect, useState, type ChangeEvent } from 'react'
import {
  createContentLibraryItem,
  updateContentLibraryItem,
  deleteContentLibraryItem,
  fetchContentLibrary,
  type ContentLibraryItem,
} from '../lib/api'
import { DataTable, type Column } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { LoadingState } from '../components/LoadingState'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../components/Toast'
import { useAsync } from '../hooks/useAsync'
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
        <div className="cell-primary">
          <div className="cell-title">{row.title || 'Untitled'}</div>
          {row.content_type && (
            <div className="cell-subtitle text-muted text-sm">{row.content_type}</div>
          )}
        </div>
      ),
    },
    {
      key: 'content',
      header: 'Content',
      render: (row) =>
        row.content_type === 'image' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={row.content}
              alt={row.title || 'Content preview'}
              style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '10px' }}
            />
            <span className="text-muted text-sm">{truncate(row.content, 90)}</span>
          </div>
        ) : (
          <div className="cell-subtitle">{truncate(row.content, 160)}</div>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} />,
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
          <button className="btn btn-ghost btn-sm" onClick={() => setEditingItem(row)}>
            Edit
          </button>
          <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeletingItem(row)}>
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
        description="Store reusable copy, images, videos, and templates for drafts and automations."
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
          <div className="alert-content">
            <div className="alert-title">Failed to load content library</div>
            <div className="alert-message">{items.error}</div>
          </div>
        </div>
      ) : (
        <div className="card card-table">
          <DataTable
            columns={columns}
            rows={items.data ?? []}
            getRowKey={(row) => row.id}
            emptyTitle="No content items"
            emptyDescription="Create reusable snippets, image references, or template copy."
            emptyAction={
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
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
        onError={(message) => toast.error(message)}
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
        onError={(message) => toast.error(message)}
      />

      <DeleteConfirmModal
        open={!!deletingItem}
        itemTitle={deletingItem?.title || 'Untitled'}
        onClose={() => setDeletingItem(null)}
        onConfirm={async () => {
          if (!deletingItem) {
            return
          }
          await deleteContentLibraryItem(deletingItem.id)
          setDeletingItem(null)
          items.refresh()
          toast.success('Content item deleted')
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
  onError: (message: string) => void
}) {
  const isEdit = !!item
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contentType, setContentType] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setTitle(item?.title ?? '')
    setContent(item?.content ?? '')
    setContentType(item?.content_type ?? '')
  }, [item, open])

  const reset = () => {
    setTitle('')
    setContent('')
    setContentType('')
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const expectedPrefix = contentType === 'video' ? 'video/' : 'image/'
    if (!file.type.startsWith(expectedPrefix)) {
      onError(`Select a ${contentType || 'media'} file that matches the chosen type.`)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      onError('Media file must be less than 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setContent((reader.result as string) || '')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!content.trim()) {
      onError('Content is required.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        title: title.trim() || null,
        content: content.trim(),
        content_type: contentType.trim() || null,
      }
      if (isEdit && item) {
        await updateContentLibraryItem(item.id, payload)
      } else {
        await createContentLibraryItem(payload)
      }
      reset()
      onSuccess()
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmitting(false)
    }
  }

  const isImage = contentType === 'image'
  const isVideo = contentType === 'video'
  const isMediaType = isImage || isVideo

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit Content Item' : 'New Content Item'}
      description="Save reusable text, media references, or templates."
      size="lg"
      onClose={() => {
        reset()
        onClose()
      }}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Update Item' : 'Save Item'}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <FormField
          label="Content type"
          as="select"
          value={contentType}
          onChange={(event) => setContentType(event.target.value)}
          hint="Choose the type first so the form can adapt."
        >
          <option value="">(none)</option>
          <option value="text">text</option>
          <option value="snippet">snippet</option>
          <option value="template">template</option>
          <option value="image">image</option>
          <option value="video">video</option>
        </FormField>

        <FormField
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Optional title"
        />

        {isMediaType && (
          <label className="form-field">
            <span className="form-label">{isImage ? 'Upload image' : 'Upload video'}</span>
            <input type="file" accept={isImage ? 'image/*' : 'video/*'} onChange={handleFileChange} />
            <span className="form-hint">Upload a local file or paste a media URL/data URL below.</span>
          </label>
        )}

        <FormField
          label={isImage ? 'Image URL or data URL' : isVideo ? 'Video URL or data URL' : 'Content'}
          as={isMediaType ? 'textarea' : 'textarea'}
          rows={isMediaType ? 4 : 6}
          required
          value={content}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setContent(event.target.value)}
          placeholder={isImage ? 'https://example.com/image.jpg' : isVideo ? 'https://example.com/video.mp4' : 'Reusable content'}
        />

        {isImage && content && (
          <div style={{ marginTop: '8px' }}>
            <img
              src={content}
              alt="Preview"
              style={{ maxWidth: '240px', maxHeight: '240px', borderRadius: '10px', border: '1px solid #d1d5db' }}
            />
          </div>
        )}

        {isVideo && content && (
          <div style={{ marginTop: '8px' }}>
            <video
              src={content}
              controls
              style={{ maxWidth: '320px', maxHeight: '240px', borderRadius: '10px', border: '1px solid #d1d5db' }}
            />
          </div>
        )}
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
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Item'}
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
