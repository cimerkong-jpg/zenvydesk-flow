import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FormField } from '../components/FormField'
import { LoadingState } from '../components/LoadingState'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { useAsync } from '../hooks/useAsync'
import { useSelectedPage } from '../hooks/useSelectedPage'
import { fromDateTimeLocalValue } from '../lib/format'
import { loadAiPreferences } from '../lib/aiPreferences'
import { MARKET_OPTIONS, type MarketCode } from '../lib/markets'
import {
  createDraft,
  fetchContentLibrary,
  fetchProducts,
  generateContent,
  postFromDraft,
  scheduleDraft,
  type CreativeGenerateResponse,
} from '../lib/api'

export function CreativeWithAIPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { selectedPage } = useSelectedPage()
  const products = useAsync(fetchProducts, [])
  const contentLibrary = useAsync(fetchContentLibrary, [])

  const savedPreferences = loadAiPreferences()
  const [productId, setProductId] = useState('')
  const [contentLibraryId, setContentLibraryId] = useState('')
  const [market, setMarket] = useState<MarketCode>(savedPreferences.market)
  const [userPrompt, setUserPrompt] = useState('')
  const [result, setResult] = useState<CreativeGenerateResponse | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submittingAction, setSubmittingAction] = useState<string | null>(null)
  const [scheduleTime, setScheduleTime] = useState('')

  const selectedProduct = useMemo(
    () => products.data?.find((item) => item.id === Number(productId)) ?? null,
    [productId, products.data],
  )

  const selectedLibrary = useMemo(
    () => contentLibrary.data?.find((item) => item.id === Number(contentLibraryId)) ?? null,
    [contentLibrary.data, contentLibraryId],
  )

  const handleGenerate = async () => {
    if (!productId) {
      toast.error(t('creativePage.productRequired'))
      return
    }
    if (!userPrompt.trim()) {
      toast.error(t('creativePage.userPromptRequired'))
      return
    }

    setLoading(true)
    setPreviewError(null)
    try {
      const nextResult = await generateContent({
        product_id: Number(productId),
        content_library_id: contentLibraryId ? Number(contentLibraryId) : null,
        market,
        user_prompt: userPrompt.trim(),
      })
      setResult(nextResult)
      toast.success(t('creativePage.previewReady'))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setPreviewError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const createDraftFromPreview = async () => {
    if (!result) {
      throw new Error(t('creativePage.previewRequiredForAction'))
    }

    return createDraft({
      content: result.content,
      media_url: result.media_url,
      page_id: null,
      product_id: Number(productId),
      content_library_id: contentLibraryId ? Number(contentLibraryId) : null,
    })
  }

  const handleAddToDraft = async () => {
    setSubmittingAction('draft')
    try {
      const draft = await createDraftFromPreview()
      toast.success(t('creativePage.draftAdded', { id: draft.id }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmittingAction(null)
    }
  }

  const handleSchedule = async () => {
    if (!scheduleTime) {
      toast.error(t('creativePage.scheduleRequired'))
      return
    }

    setSubmittingAction('schedule')
    try {
      const draft = await createDraftFromPreview()
      await scheduleDraft(draft.id, fromDateTimeLocalValue(scheduleTime))
      toast.success(t('creativePage.draftScheduled', { id: draft.id }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmittingAction(null)
    }
  }

  const handlePostNow = async () => {
    if (!selectedPage) {
      toast.error(t('creativePage.pageRequired'))
      return
    }
    if (!result) {
      toast.error(t('creativePage.previewRequiredForPost'))
      return
    }

    setSubmittingAction('post')
    try {
      const draft = await createDraft({
        content: result.content,
        media_url: result.media_url,
        page_id: selectedPage.id,
        product_id: Number(productId),
        content_library_id: contentLibraryId ? Number(contentLibraryId) : null,
      })
      await postFromDraft(draft.id)
      toast.success(t('creativePage.draftPosted', { id: draft.id }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmittingAction(null)
    }
  }

  return (
    <div className="page">
      <PageHeader title={t('creativePage.title')} description={t('creativePage.description')} />

      <div className="creative-layout">
        <div className="card creative-controls">
          <div className="card-header">
            <h3 className="card-title">{t('creativePage.setupTitle')}</h3>
          </div>

          {products.loading || contentLibrary.loading ? (
            <LoadingState />
          ) : (
            <div className="form-stack">
              <FormField label={t('creativePage.form.product')} as="select" value={productId} onChange={(event) => setProductId(event.target.value)} required>
                <option value="">{t('creativePage.form.productPlaceholder')}</option>
                {products.data?.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </FormField>

              <FormField label={t('creativePage.form.market')} as="select" value={market} onChange={(event) => setMarket(event.target.value as MarketCode)}>
                {MARKET_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`common.markets.${option}`)}
                  </option>
                ))}
              </FormField>

              <FormField
                label={t('creativePage.form.contentLibrary')}
                as="select"
                value={contentLibraryId}
                onChange={(event) => setContentLibraryId(event.target.value)}
                hint={t('creativePage.form.contentLibraryHint')}
              >
                <option value="">{t('creativePage.form.noLibrary')}</option>
                {contentLibrary.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title || item.content}
                  </option>
                ))}
              </FormField>

              <FormField
                label={t('creativePage.form.userPrompt')}
                as="textarea"
                placeholder={t('creativePage.form.userPromptPlaceholder')}
                value={userPrompt}
                onChange={(event) => setUserPrompt(event.target.value)}
                rows={4}
              />

              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => void handleGenerate()}
                disabled={!productId || !userPrompt.trim() || loading}
              >
                {loading ? t('creativePage.generatingContent') : t('creativePage.generateContent')}
              </button>

              {previewError ? (
                <div className="alert alert-error">
                  <div className="alert-content">
                    <div className="alert-title">{t('creativePage.generationFailed')}</div>
                    <div className="alert-message">{previewError}</div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="creative-preview-stack">
          <div className="card creative-preview-card">
            <div className="card-header">
              <h3 className="card-title">{t('creativePage.previewTitle')}</h3>
            </div>

            {loading ? (
              <div className="empty-state">
                <div className="empty-state-title">{t('creativePage.loadingTitle')}</div>
                <div className="empty-state-description">{t('creativePage.loadingDescription')}</div>
              </div>
            ) : !result ? (
              <div className="empty-state">
                <div className="empty-state-title">{t('creativePage.noPreviewTitle')}</div>
                <div className="empty-state-description">{t('creativePage.noPreviewDescription')}</div>
              </div>
            ) : (
              <div className="creative-preview">
                {selectedProduct ? (
                  <div className="creative-preview-context">
                    <div className="creative-context-title">{selectedProduct.name}</div>
                    <div className="creative-context-text">{selectedProduct.description || t('creativePage.context.noDescription')}</div>
                    <div className="creative-context-text">
                      {t('creativePage.context.market')}: {t(`common.markets.${market}`)}
                    </div>
                    {selectedLibrary ? (
                      <div className="creative-context-text">
                        {t('creativePage.context.library')}: {selectedLibrary.title || selectedLibrary.content}
                      </div>
                    ) : null}
                    <div className="creative-context-text">
                      {t('creativePage.context.userPrompt')}: {userPrompt}
                    </div>
                  </div>
                ) : null}

                {result.media_url ? (
                  <div className="creative-preview-media">
                    <img src={result.media_url} alt="AI preview" className="creative-preview-image" />
                    <div className="creative-preview-caption">
                      {result.image_provider}/{result.image_model}
                    </div>
                  </div>
                ) : null}

                <div className="creative-preview-content">
                  <div className="creative-context-title">{t('creativePage.context.generatedContent')}</div>
                  <p>{result.content}</p>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{t('creativePage.actionsTitle')}</h3>
              {selectedPage ? (
                <span className="badge badge-success">{t('creativePage.pageSelected', { name: selectedPage.page_name })}</span>
              ) : (
                <span className="badge badge-warning">{t('creativePage.noPageSelected')}</span>
              )}
            </div>

            <div className="form-stack">
              <FormField
                label={t('creativePage.scheduleTime')}
                type="datetime-local"
                value={scheduleTime}
                onChange={(event) => setScheduleTime(event.target.value)}
                hint={t('creativePage.scheduleTimeHint')}
              />

              <div className="creative-action-row">
                <button type="button" className="btn btn-secondary" onClick={() => void handleAddToDraft()} disabled={!result || submittingAction !== null}>
                  {submittingAction === 'draft' ? t('creativePage.adding') : t('creativePage.addToDraft')}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => void handleSchedule()} disabled={!result || submittingAction !== null}>
                  {submittingAction === 'schedule' ? t('creativePage.scheduling') : t('creativePage.schedule')}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => void handlePostNow()} disabled={!result || !selectedPage || submittingAction !== null}>
                  {submittingAction === 'post' ? t('creativePage.posting') : t('creativePage.postNow')}
                </button>
              </div>

              {!selectedPage ? <div className="form-hint">{t('creativePage.saveWithoutPage')}</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
