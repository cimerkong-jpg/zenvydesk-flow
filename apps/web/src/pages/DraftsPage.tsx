import { useEffect, useState } from 'react'
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
import { formatDateTime, formatMediaUrlDisplay, formatRelative, fromDateTimeLocalValue, toDateTimeLocalValue, truncate } from '../lib/format'
import { loadAiPreferences } from '../lib/aiPreferences'
import { MARKET_DEFAULT_LANGUAGE, MARKET_OPTIONS, type MarketCode } from '../lib/markets'
import {
  createDraft,
  deleteDraft,
  fetchContentLibrary,
  fetchDrafts,
  fetchProducts,
  generateDraft,
  generateDraftImage,
  postFromDraft,
  scheduleDraft,
  type ContentLibraryItem,
  type Draft,
  type Product,
  updateDraft,
} from '../lib/api'

export function DraftsPage() {
  const { t } = useTranslation()
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
      header: t('draftsPage.table.content'),
      render: (row) => (
        <div className="cell-primary">
          <div className="cell-title">{truncate(row.content, 120)}</div>
          {row.media_url ? (
            <a className="cell-link" href={row.media_url} target="_blank" rel="noopener noreferrer" title={row.media_url}>
              {formatMediaUrlDisplay(row.media_url)}
            </a>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('draftsPage.table.status'),
      width: '120px',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'scheduled',
      header: t('draftsPage.table.scheduled'),
      width: '180px',
      render: (row) =>
        row.scheduled_time ? <span title={formatDateTime(row.scheduled_time)}>{formatDateTime(row.scheduled_time)}</span> : <span className="text-muted">-</span>,
    },
    {
      key: 'created',
      header: t('draftsPage.table.created'),
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
            onClick={(event) => {
              event.stopPropagation()
              setEditingDraft(row)
            }}
            disabled={row.status === 'posted'}
          >
            {t('common.edit')}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={(event) => {
              event.stopPropagation()
              setScheduleFor(row)
            }}
            disabled={row.status === 'posted'}
          >
            {t('draftsPage.actions.schedule')}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={async (event) => {
              event.stopPropagation()
              try {
                await postFromDraft(row.id)
                toast.success(t('draftsPage.draftPosted', { id: row.id }))
                refreshAll()
              } catch (err) {
                toast.error(err instanceof Error ? err.message : String(err))
              }
            }}
            disabled={row.status === 'posted' || !selectedPage}
          >
            {t('draftsPage.actions.post')}
          </button>
          <button
            className="btn btn-ghost btn-sm text-danger"
            onClick={(event) => {
              event.stopPropagation()
              setDeletingDraft(row)
            }}
          >
            {t('common.delete')}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title={t('draftsPage.title')}
        description={t('draftsPage.description')}
        actions={
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            {t('draftsPage.newDraft')}
          </button>
        }
      />

      {!selectedPage ? (
        <div className="alert alert-warning">
          <div className="alert-content">
            <div className="alert-title">{t('draftsPage.noPageTitle')}</div>
            <div className="alert-message">{t('draftsPage.noPageDescription')}</div>
          </div>
        </div>
      ) : null}

      {drafts.loading ? (
        <LoadingState />
      ) : drafts.error ? (
        <div className="alert alert-error">
          <div className="alert-content">
            <div className="alert-title">{t('draftsPage.failedLoad')}</div>
            <div className="alert-message">{drafts.error}</div>
          </div>
        </div>
      ) : (
        <div className="card card-table">
          <DataTable
            columns={columns}
            rows={drafts.data ?? []}
            getRowKey={(row) => row.id}
            emptyTitle={t('draftsPage.emptyTitle')}
            emptyDescription={t('draftsPage.emptyDescription')}
            emptyAction={
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                {t('draftsPage.createDraft')}
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
          toast.success(t('draftsPage.created'))
        }}
        onError={(message) => toast.error(message)}
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
          toast.success(t('draftsPage.updated'))
        }}
        onError={(message) => toast.error(message)}
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
            toast.success(t('draftsPage.deleted'))
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
          toast.success(t('draftsPage.scheduled'))
        }}
        onError={(message) => toast.error(message)}
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
  setSubmitting: (value: boolean) => void
}) {
  const { t } = useTranslation()
  const isEdit = !!draft
  const defaults = loadAiPreferences()
  const [productId, setProductId] = useState(draft?.product_id?.toString() ?? '')
  const [contentLibraryId, setContentLibraryId] = useState(draft?.content_library_id?.toString() ?? '')
  const [market, setMarket] = useState<MarketCode>(defaults.market)
  const [tone, setTone] = useState('marketing')
  const [language, setLanguage] = useState(MARKET_DEFAULT_LANGUAGE[defaults.market])
  const [style, setStyle] = useState('social ad creative')
  const [content, setContent] = useState(draft?.content ?? '')
  const [mediaUrl, setMediaUrl] = useState(draft?.media_url ?? '')
  const [scheduledTime, setScheduledTime] = useState(draft?.scheduled_time ? toDateTimeLocalValue(draft.scheduled_time) : '')
  const [generating, setGenerating] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)

  useEffect(() => {
    setProductId(draft?.product_id?.toString() ?? '')
    setContentLibraryId(draft?.content_library_id?.toString() ?? '')
    setMarket(defaults.market)
    setTone('marketing')
    setLanguage(MARKET_DEFAULT_LANGUAGE[defaults.market])
    setStyle('social ad creative')
    setContent(draft?.content ?? '')
    setMediaUrl(draft?.media_url ?? '')
    setScheduledTime(draft?.scheduled_time ? toDateTimeLocalValue(draft.scheduled_time) : '')
  }, [draft, open])

  const reset = () => {
    setProductId('')
    setContentLibraryId('')
    setMarket(defaults.market)
    setTone('marketing')
    setLanguage(MARKET_DEFAULT_LANGUAGE[defaults.market])
    setStyle('social ad creative')
    setContent('')
    setMediaUrl('')
    setScheduledTime('')
  }

  const handleGenerate = async () => {
    if (!productId) {
      onError(t('draftsPage.form.productRequired'))
      return
    }

    setGenerating(true)
    try {
      const preferences = loadAiPreferences()
      const result = await generateDraft({
        product_id: Number(productId),
        content_library_id: contentLibraryId ? Number(contentLibraryId) : null,
        market,
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
      onError(t('draftsPage.form.imageProductRequired'))
      return
    }

    setGeneratingImage(true)
    try {
      const preferences = loadAiPreferences()
      const result = await generateDraftImage({
        product_id: Number(productId),
        content_library_id: contentLibraryId ? Number(contentLibraryId) : null,
        market,
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
    if (!file) return
    if (!file.type.startsWith('image/')) {
      onError(t('draftsPage.form.selectImage'))
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      onError(t('draftsPage.form.imageTooLarge'))
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
      onError(t('draftsPage.form.contentRequired'))
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
      title={isEdit ? t('draftsPage.form.editTitle') : t('draftsPage.form.newTitle')}
      description={isEdit ? t('draftsPage.form.editDescription') : t('draftsPage.form.newDescription')}
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
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !content.trim()}>
            {submitting ? (isEdit ? t('draftsPage.form.updating') : t('draftsPage.form.creating')) : isEdit ? t('draftsPage.form.update') : t('draftsPage.form.create')}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <FormField
          label={t('draftsPage.form.product')}
          as="select"
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          hint={t('draftsPage.form.productHint')}
        >
          <option value="">{t('draftsPage.form.noneOption')}</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </FormField>

        <FormField
          label={t('draftsPage.form.market')}
          as="select"
          value={market}
          onChange={(event) => {
            const nextMarket = event.target.value as MarketCode
            setMarket(nextMarket)
            setLanguage(MARKET_DEFAULT_LANGUAGE[nextMarket])
          }}
          hint={t('draftsPage.form.marketHint')}
        >
          {MARKET_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(`common.markets.${option}`)}
            </option>
          ))}
        </FormField>

        <FormField
          label={t('draftsPage.form.contentLibrary')}
          as="select"
          value={contentLibraryId}
          onChange={(event) => setContentLibraryId(event.target.value)}
          hint={t('draftsPage.form.contentLibraryHint')}
        >
          <option value="">{t('draftsPage.form.noneOption')}</option>
          {contentLibrary.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title || truncate(item.content, 50)}
            </option>
          ))}
        </FormField>

        <FormField label={t('draftsPage.form.tone')} as="select" value={tone} onChange={(event) => setTone(event.target.value)} hint={t('draftsPage.form.toneHint')}>
          <option value="marketing">{t('automationPage.options.marketing')}</option>
          <option value="friendly">{t('automationPage.options.friendly')}</option>
          <option value="professional">{t('automationPage.options.professional')}</option>
          <option value="playful">{t('automationPage.options.playful')}</option>
        </FormField>

        <FormField
          label={t('draftsPage.form.visualStyle')}
          as="select"
          value={style}
          onChange={(event) => setStyle(event.target.value)}
          hint={t('draftsPage.form.visualStyleHint')}
        >
          <option value="social ad creative">{t('automationPage.options.socialAdCreative')}</option>
          <option value="product showcase">{t('automationPage.options.productShowcase')}</option>
          <option value="lifestyle photo">{t('automationPage.options.lifestylePhoto')}</option>
          <option value="clean studio shot">{t('automationPage.options.cleanStudioShot')}</option>
        </FormField>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void handleGenerateImage()}
            disabled={generatingImage || generating || submitting || !productId}
          >
            {generatingImage ? t('draftsPage.form.generatingImage') : t('draftsPage.form.generateImage')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void handleGenerate()}
            disabled={generating || submitting || !productId}
          >
            {generating ? t('draftsPage.form.generating') : t('draftsPage.form.generateWithAi')}
          </button>
        </div>

        <FormField
          label={t('draftsPage.form.content')}
          as="textarea"
          required
          rows={6}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={t('draftsPage.form.contentPlaceholder')}
          hint={t('draftsPage.form.contentHint')}
        />

        <div className="form-field">
          <span className="form-label">{t('draftsPage.form.media')}</span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input id="draft-media-upload" type="file" accept="image/*" onChange={handleMediaFileChange} />
            <span className="form-hint">{t('draftsPage.form.mediaHint')}</span>
          </div>
          <FormField
            label={t('draftsPage.form.mediaUrl')}
            type="url"
            value={mediaUrl.startsWith('data:') ? '' : mediaUrl}
            onChange={(event) => setMediaUrl(event.target.value)}
            placeholder={t('draftsPage.form.mediaUrlPlaceholder')}
            hint={t('draftsPage.form.mediaUrlHint')}
          />
          {mediaUrl ? (
            <div style={{ marginTop: '12px' }}>
              <img
                src={mediaUrl}
                alt="Draft media preview"
                style={{ maxWidth: '240px', maxHeight: '240px', borderRadius: '10px', border: '1px solid #d1d5db' }}
              />
            </div>
          ) : null}
        </div>

        <FormField
          label={t('draftsPage.form.scheduleFor')}
          type="datetime-local"
          value={scheduledTime}
          onChange={(event) => setScheduledTime(event.target.value)}
          hint={t('draftsPage.form.scheduleHint')}
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
  const { t } = useTranslation()
  const [value, setValue] = useState(() => (draft?.scheduled_time ? toDateTimeLocalValue(draft.scheduled_time) : ''))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setValue(draft?.scheduled_time ? toDateTimeLocalValue(draft.scheduled_time) : '')
  }, [draft])

  const handleSubmit = async () => {
    if (!draft || !value) {
      onError(t('draftsPage.form.pickDateTime'))
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
      title={t('draftsPage.form.scheduleModalTitle')}
      description={draft ? truncate(draft.content, 120) : ''}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !value}>
            {submitting ? t('draftsPage.form.scheduling') : t('draftsPage.actions.schedule')}
          </button>
        </>
      }
    >
      <FormField label={t('draftsPage.form.scheduledTime')} type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} required />
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
      title={t('draftsPage.deleteModal.title')}
      description={t('draftsPage.deleteModal.description')}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={deleting}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={deleting}>
            {deleting ? t('draftsPage.deleteModal.deleting') : t('draftsPage.deleteModal.confirm')}
          </button>
        </>
      }
    >
      <p>{t('draftsPage.deleteModal.question')}</p>
      <p className="text-muted text-sm" style={{ marginTop: '8px' }}>
        {truncate(draftContent, 100)}
      </p>
    </Modal>
  )
}
