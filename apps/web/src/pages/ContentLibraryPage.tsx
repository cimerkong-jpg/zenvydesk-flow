import { useEffect, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { DataTable, type Column } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { LoadingState } from '../components/LoadingState'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../components/Toast'
import { useAsync } from '../hooks/useAsync'
import { formatRelative, truncate } from '../lib/format'
import {
  createContentLibraryItem,
  deleteContentLibraryItem,
  fetchContentLibrary,
  type ContentLibraryItem,
  updateContentLibraryItem,
} from '../lib/api'

export function ContentLibraryPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const items = useAsync(fetchContentLibrary, [])
  const [showCreate, setShowCreate] = useState(false)
  const [editingItem, setEditingItem] = useState<ContentLibraryItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<ContentLibraryItem | null>(null)

  const columns: Column<ContentLibraryItem>[] = [
    {
      key: 'title',
      header: t('contentLibraryPage.table.title'),
      width: '220px',
      render: (row) => (
        <div className="cell-primary">
          <div className="cell-title">{row.title || t('contentLibraryPage.untitled')}</div>
          {row.content_type ? <div className="cell-subtitle text-muted text-sm">{row.content_type}</div> : null}
        </div>
      ),
    },
    {
      key: 'content',
      header: t('contentLibraryPage.table.content'),
      render: (row) =>
        row.content_type === 'image' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={row.content}
              alt={row.title || t('contentLibraryPage.untitled')}
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
      header: t('contentLibraryPage.table.status'),
      width: '120px',
      render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} />,
    },
    {
      key: 'created',
      header: t('contentLibraryPage.table.created'),
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
            {t('common.edit')}
          </button>
          <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeletingItem(row)}>
            {t('common.delete')}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title={t('contentLibraryPage.title')}
        description={t('contentLibraryPage.description')}
        actions={
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            {t('contentLibraryPage.newItem')}
          </button>
        }
      />

      {items.loading ? (
        <LoadingState />
      ) : items.error ? (
        <div className="alert alert-error">
          <div className="alert-content">
            <div className="alert-title">{t('contentLibraryPage.failedLoad')}</div>
            <div className="alert-message">{items.error}</div>
          </div>
        </div>
      ) : (
        <div className="card card-table">
          <DataTable
            columns={columns}
            rows={items.data ?? []}
            getRowKey={(row) => row.id}
            emptyTitle={t('contentLibraryPage.emptyTitle')}
            emptyDescription={t('contentLibraryPage.emptyDescription')}
            emptyAction={
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                {t('contentLibraryPage.addFirstItem')}
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
          toast.success(t('contentLibraryPage.created'))
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
          toast.success(t('contentLibraryPage.updated'))
        }}
        onError={(message) => toast.error(message)}
      />

      <DeleteConfirmModal
        open={!!deletingItem}
        itemTitle={deletingItem?.title || t('contentLibraryPage.untitled')}
        onClose={() => setDeletingItem(null)}
        onConfirm={async () => {
          if (!deletingItem) return
          await deleteContentLibraryItem(deletingItem.id)
          setDeletingItem(null)
          items.refresh()
          toast.success(t('contentLibraryPage.deleted'))
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
  const { t } = useTranslation()
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
    if (!file) return

    const expectedPrefix = contentType === 'video' ? 'video/' : 'image/'
    if (!file.type.startsWith(expectedPrefix)) {
      onError(t('contentLibraryPage.form.invalidFileType', { type: contentType || 'media' }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      onError(t('contentLibraryPage.form.mediaTooLarge'))
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
      onError(t('contentLibraryPage.form.contentRequired'))
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
      title={isEdit ? t('contentLibraryPage.form.editTitle') : t('contentLibraryPage.form.newTitle')}
      description={t('contentLibraryPage.form.description')}
      size="lg"
      onClose={() => {
        reset()
        onClose()
      }}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('contentLibraryPage.form.saving') : isEdit ? t('contentLibraryPage.form.update') : t('contentLibraryPage.form.save')}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <FormField
          label={t('contentLibraryPage.form.contentType')}
          as="select"
          value={contentType}
          onChange={(event) => setContentType(event.target.value)}
          hint={t('contentLibraryPage.form.typeHint')}
        >
          <option value="">{t('automationPage.options.none')}</option>
          <option value="text">{t('contentLibraryPage.types.text')}</option>
          <option value="snippet">{t('contentLibraryPage.types.snippet')}</option>
          <option value="template">{t('contentLibraryPage.types.template')}</option>
          <option value="image">{t('contentLibraryPage.types.image')}</option>
          <option value="video">{t('contentLibraryPage.types.video')}</option>
        </FormField>

        <FormField
          label={t('contentLibraryPage.form.title')}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t('contentLibraryPage.form.titlePlaceholder')}
        />

        {isMediaType ? (
          <label className="form-field">
            <span className="form-label">{isImage ? t('contentLibraryPage.form.uploadImage') : t('contentLibraryPage.form.uploadVideo')}</span>
            <input type="file" accept={isImage ? 'image/*' : 'video/*'} onChange={handleFileChange} />
            <span className="form-hint">{t('contentLibraryPage.form.mediaUploadHint')}</span>
          </label>
        ) : null}

        <FormField
          label={isImage ? t('contentLibraryPage.form.imageUrl') : isVideo ? t('contentLibraryPage.form.videoUrl') : t('contentLibraryPage.form.content')}
          as="textarea"
          rows={isMediaType ? 4 : 6}
          required
          value={content}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setContent(event.target.value)}
          placeholder={
            isImage
              ? t('contentLibraryPage.form.imagePlaceholder')
              : isVideo
                ? t('contentLibraryPage.form.videoPlaceholder')
                : t('contentLibraryPage.form.contentPlaceholder')
          }
        />

        {isImage && content ? (
          <div style={{ marginTop: '8px' }}>
            <img src={content} alt="Preview" style={{ maxWidth: '240px', maxHeight: '240px', borderRadius: '10px', border: '1px solid #d1d5db' }} />
          </div>
        ) : null}

        {isVideo && content ? (
          <div style={{ marginTop: '8px' }}>
            <video src={content} controls style={{ maxWidth: '320px', maxHeight: '240px', borderRadius: '10px', border: '1px solid #d1d5db' }} />
          </div>
        ) : null}
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
  const { t } = useTranslation()
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
      title={t('contentLibraryPage.deleteModal.title')}
      description={t('contentLibraryPage.deleteModal.description')}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={deleting}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={deleting}>
            {deleting ? t('contentLibraryPage.deleteModal.deleting') : t('contentLibraryPage.deleteModal.confirm')}
          </button>
        </>
      }
    >
      <p>{t('contentLibraryPage.deleteModal.question', { name: itemTitle })}</p>
    </Modal>
  )
}
