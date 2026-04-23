import { useEffect, useState } from 'react'
import {
  createDraft,
  updateDraft,
  deleteDraft,
  fetchDrafts,
  fetchProducts,
  fetchContentLibrary,
  postFromDraft,
  scheduleDraft,
  generateDraft,
  generateDraftImage,
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
import { loadAiPreferences } from '../lib/aiPreferences'

export function DraftsPage() {
  const toast = useToast()
  const { selectedPage } = useSelectedPage()
  const drafts = useAsync(fetchDrafts, [])
  const products = useAsync(fetchProducts, [])
  const contentLibrary = useAsync(fetchContentLibrary, [])

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
          <span className="text-muted">-</span>
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
            Schedule
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
            disabled={row.status === 'posted' || !selectedPage}
          >
            Post
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
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Draft
          </button>
        }
      />

      {!selectedPage && (
        <div className="alert alert-warning">
          <span className="alert-icon">!</span>
          <div className="alert-content">
            <div className="alert-title">No page selected</div>
            <div className="alert-message">
              You can still create, edit, delete, and schedule drafts. Select a Facebook page
              before posting.
            </div>
          </div>
        </div>
      )}

      {drafts.loading ? (
        <LoadingState />
      ) : drafts.error ? (
        <div className="alert alert-error">
          <span className="alert-icon">x</span>
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
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                + Create Draft
              </button>
            }
          />
        </div>
      )}

      <CreateDraftModal
        open={showCreate}
        products={products.data ?? []}
        contentLibrary={contentLibrary.data ?? []}
        pageId={selectedPage?.id ?? null}
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

      <CreateDraftModal
        open={!!editingDraft}
        draft={editingDraft}
        products={products.data ?? []}
        contentLibrary={contentLibrary.data ?? []}
        pageId={selectedPage?.id ?? null}
        onClose={() => setEditingDraft(null)}
        submitting={submitting}
        setSubmitting={setSubmitting}
        onCreated={() => {
          setEditingDraft(null)
          refreshAll()
          toast.success('Draft updated')
        }}
        onError={(msg) => toast.error(msg)}
      />

      <DeleteDraftModal
        open={!!deletingDraft}
        draftContent={deletingDraft?.content ?? ''}
        onClose={() => setDeletingDraft(null)}
        onConfirm={async () => {
          if (!deletingDraft) return
          try {
            await deleteDraft(deletingDraft.id)
            setDeletingDraft(null)
            refreshAll()
            toast.success('Draft deleted')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err))
          }
        }}
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
  draft,
  products,
  contentLibrary,
  pageId,
  onClose,
  onCreated,
  onError,
  submitting,
  setSubmitting,
}: {
  open: boolean
  draft?: Draft | null
  products: Product[]
  contentLibrary: ContentLibraryItem[]
  pageId: number | null
  onClose: () => void
  onCreated: () => void
  onError: (msg: string) => void
  submitting: boolean
  setSubmitting: (v: boolean) => void
}) {
  const isEdit = !!draft
  const [productId, setProductId] = useState<string>(draft?.product_id?.toString() ?? '')
  const [contentLibraryId, setContentLibraryId] = useState<string>(
    draft?.content_library_id?.toString() ?? '',
  )
  const [tone, setTone] = useState('marketing')
  const [language, setLanguage] = useState('th')
  const [style, setStyle] = useState('social ad creative')
  const [content, setContent] = useState(draft?.content ?? '')
  const [mediaUrl, setMediaUrl] = useState(draft?.media_url ?? '')
  const [scheduledTime, setScheduledTime] = useState(
    draft?.scheduled_time ? toDateTimeLocalValue(draft.scheduled_time) : '',
  )
  const [generating, setGenerating] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)

  useEffect(() => {
    setProductId(draft?.product_id?.toString() ?? '')
    setContentLibraryId(draft?.content_library_id?.toString() ?? '')
    setTone('marketing')
    setLanguage('th')
    setStyle('social ad creative')
    setContent(draft?.content ?? '')
    setMediaUrl(draft?.media_url ?? '')
    setScheduledTime(draft?.scheduled_time ? toDateTimeLocalValue(draft.scheduled_time) : '')
  }, [draft, open])

  const reset = () => {
    setProductId('')
    setContentLibraryId('')
    setTone('marketing')
    setLanguage('th')
    setStyle('social ad creative')
    setContent('')
    setMediaUrl('')
    setScheduledTime('')
  }

  const handleGenerate = async () => {
    if (!productId) {
      onError('Select a product before generating with AI.')
      return
    }

    setGenerating(true)
    try {
      const preferences = loadAiPreferences()
      const result = await generateDraft({
        product_id: Number(productId),
        content_library_id: contentLibraryId ? Number(contentLibraryId) : null,
        tone,
        language,
        style,
        ai_provider: preferences.provider,
        ai_model: preferences.model,
      })
      setContent(result.content)
      setMediaUrl(result.media_url ?? '')
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateImage = async () => {
    if (!productId) {
      onError('Select a product before generating an image.')
      return
    }

    setGeneratingImage(true)
    try {
      const preferences = loadAiPreferences()
      const result = await generateDraftImage({
        product_id: Number(productId),
        content_library_id: contentLibraryId ? Number(contentLibraryId) : null,
        tone,
        language,
        style,
        ai_provider: preferences.provider,
        ai_model: preferences.model,
      })
      if (!content.trim()) {
        setContent(result.content)
      }
      setMediaUrl(result.media_url ?? '')
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setGeneratingImage(false)
    }
  }

  const handleMediaFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      onError('Select an image file.')
      return
    }

    if (file.size > 3 * 1024 * 1024) {
      onError('Image size must be less than 3MB.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setMediaUrl((reader.result as string) || '')
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
      const input = {
        content: content.trim(),
        page_id: isEdit ? (draft?.page_id ?? null) : pageId,
        product_id: productId ? Number(productId) : null,
        content_library_id: contentLibraryId ? Number(contentLibraryId) : null,
        media_url: mediaUrl.trim() || null,
        scheduled_time: scheduledTime ? fromDateTimeLocalValue(scheduledTime) : null,
      }

      if (isEdit && draft) {
        await updateDraft(draft.id, input)
      } else {
        await createDraft(input)
      }

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
      title={isEdit ? 'Edit Draft' : 'New Draft'}
      description={
        isEdit
          ? 'Update draft content and settings.'
          : 'Compose content manually or generate it with AI.'
      }
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
            {submitting ? (isEdit ? 'Updating...' : 'Creating...') : isEdit ? 'Update Draft' : 'Create Draft'}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <FormField
          label="Product"
          as="select"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          hint="Pick a product first for stronger AI output."
        >
          <option value="">(none)</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </FormField>

        <FormField
          label="Content Library"
          as="select"
          value={contentLibraryId}
          onChange={(e) => setContentLibraryId(e.target.value)}
          hint="Optional supporting content for AI or manual drafting."
        >
          <option value="">(none)</option>
          {contentLibrary.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title || truncate(item.content, 50)}
            </option>
          ))}
        </FormField>

        <FormField
          label="Tone"
          as="select"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          hint="Used only when generating with AI."
        >
          <option value="marketing">Marketing</option>
          <option value="friendly">Friendly</option>
          <option value="professional">Professional</option>
          <option value="playful">Playful</option>
        </FormField>

        <FormField
          label="Language"
          as="select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          hint="Used only when generating with AI."
        >
          <option value="th">Thai</option>
          <option value="en">English</option>
        </FormField>

        <FormField
          label="Visual style"
          as="select"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          hint="Used for AI image generation."
        >
          <option value="social ad creative">Social ad creative</option>
          <option value="product showcase">Product showcase</option>
          <option value="lifestyle photo">Lifestyle photo</option>
          <option value="clean studio shot">Clean studio shot</option>
        </FormField>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGenerateImage}
            disabled={generatingImage || generating || submitting || !productId}
          >
            {generatingImage ? 'Generating image...' : 'Generate image'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGenerate}
            disabled={generating || submitting || !productId}
          >
            {generating ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>
        <div className="form-hint">
          AI provider, model, and API keys are taken from Settings and stored in this browser.
        </div>

        <FormField
          label="Content"
          as="textarea"
          required
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What do you want to post?"
          hint="You can always edit AI-generated content before saving."
        />

        <div className="form-field">
          <span className="form-label">Media</span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              id="draft-media-upload"
              type="file"
              accept="image/*"
              onChange={handleMediaFileChange}
            />
            <span className="form-hint">Upload an image or keep using a URL/AI image.</span>
          </div>
          <FormField
            label="Media URL"
            type="url"
            value={mediaUrl.startsWith('data:') ? '' : mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://..."
            hint="Optional image or video URL."
          />
          {mediaUrl && (
            <div style={{ marginTop: '12px' }}>
              <img
                src={mediaUrl}
                alt="Draft media preview"
                style={{ maxWidth: '240px', maxHeight: '240px', borderRadius: '10px', border: '1px solid #d1d5db' }}
              />
            </div>
          )}
        </div>

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

  useEffect(() => {
    setValue(draft?.scheduled_time ? toDateTimeLocalValue(draft.scheduled_time) : '')
  }, [draft])

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
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !value}
          >
            {submitting ? 'Scheduling...' : 'Schedule'}
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

function DeleteDraftModal({
  open,
  draftContent,
  onClose,
  onConfirm,
}: {
  open: boolean
  draftContent: string
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
      title="Delete Draft"
      description="This action cannot be undone."
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Draft'}
          </button>
        </>
      }
    >
      <p>Are you sure you want to delete this draft?</p>
      <p className="text-muted text-sm" style={{ marginTop: '8px' }}>
        {truncate(draftContent, 100)}
      </p>
    </Modal>
  )
}

void EmptyState
