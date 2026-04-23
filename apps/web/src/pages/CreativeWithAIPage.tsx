import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FormField } from '../components/FormField'
import { LoadingState } from '../components/LoadingState'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { useAsync } from '../hooks/useAsync'
import { useSelectedPage } from '../hooks/useSelectedPage'
import { fromDateTimeLocalValue } from '../lib/format'
import { AI_MODELS, AI_PROVIDER_OPTIONS, type AIProvider, loadAiPreferences } from '../lib/aiPreferences'
import { MARKET_DEFAULT_LANGUAGE, MARKET_OPTIONS, type MarketCode } from '../lib/markets'
import {
  createDraft,
  creativeGenerate,
  fetchContentLibrary,
  fetchProducts,
  postFromDraft,
  scheduleDraft,
  type CreativeGenerateResponse,
} from '../lib/api'

type GenerationMode = 'post' | 'image' | 'content'

export function CreativeWithAIPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { selectedPage } = useSelectedPage()
  const products = useAsync(fetchProducts, [])
  const contentLibrary = useAsync(fetchContentLibrary, [])

  const [mode, setMode] = useState<GenerationMode>('post')
  const savedPreferences = loadAiPreferences()
  const [productId, setProductId] = useState('')
  const [contentLibraryId, setContentLibraryId] = useState('')
  const [market, setMarket] = useState<MarketCode>(savedPreferences.market)
  const [tone, setTone] = useState('marketing')
  const [language, setLanguage] = useState(MARKET_DEFAULT_LANGUAGE[savedPreferences.market])
  const [style, setStyle] = useState('social ad creative')
  const [provider, setProvider] = useState(savedPreferences.provider)
  const [model, setModel] = useState(savedPreferences.model)
  const [preview, setPreview] = useState<CreativeGenerateResponse | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [submittingAction, setSubmittingAction] = useState<string | null>(null)
  const [scheduleTime, setScheduleTime] = useState('')

  useEffect(() => {
    const saved = loadAiPreferences()
    setMarket(saved.market)
    setLanguage(MARKET_DEFAULT_LANGUAGE[saved.market])
    setProvider(saved.provider)
    setModel(saved.model)
  }, [])

  useEffect(() => {
    if (!AI_MODELS[provider]?.includes(model)) {
      setModel(AI_MODELS[provider][0])
    }
  }, [provider, model])

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

    setGenerating(true)
    setPreviewError(null)
    try {
      const result = await creativeGenerate({
        generation_type: mode,
        product_id: Number(productId),
        content_library_id: contentLibraryId ? Number(contentLibraryId) : null,
        market,
        tone,
        language,
        style,
        ai_provider: provider,
        ai_model: model,
      })
      setPreview(result)
      toast.success(t('creativePage.previewReady'))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setPreviewError(message)
      toast.error(message)
    } finally {
      setGenerating(false)
    }
  }

  const createDraftFromPreview = async () => {
    if (!preview) {
      throw new Error(t('creativePage.previewRequiredForAction'))
    }

    return createDraft({
      content: preview.content,
      media_url: preview.media_url,
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
    if (!preview) {
      toast.error(t('creativePage.previewRequiredForPost'))
      return
    }

    setSubmittingAction('post')
    try {
      const draft = await createDraft({
        content: preview.content,
        media_url: preview.media_url,
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
              <div className="creative-mode-switch">
                {(['post', 'image', 'content'] as GenerationMode[]).map((item) => (
                  <button key={item} type="button" className={`filter-tab ${mode === item ? 'active' : ''}`} onClick={() => setMode(item)}>
                    {t(`creativePage.mode.${item}`)}
                  </button>
                ))}
              </div>

              <FormField label={t('creativePage.form.product')} as="select" value={productId} onChange={(event) => setProductId(event.target.value)} required>
                <option value="">{t('creativePage.form.productPlaceholder')}</option>
                {products.data?.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </FormField>

              <FormField
                label={t('creativePage.form.market')}
                as="select"
                value={market}
                onChange={(event) => {
                  const nextMarket = event.target.value as MarketCode
                  setMarket(nextMarket)
                  setLanguage(MARKET_DEFAULT_LANGUAGE[nextMarket])
                }}
              >
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

              <div className="creative-grid-2">
                <FormField label={t('creativePage.form.tone')} as="select" value={tone} onChange={(event) => setTone(event.target.value)}>
                  <option value="marketing">{t('automationPage.options.marketing')}</option>
                  <option value="friendly">{t('automationPage.options.friendly')}</option>
                  <option value="professional">{t('automationPage.options.professional')}</option>
                  <option value="playful">{t('automationPage.options.playful')}</option>
                </FormField>
              </div>

              <FormField label={t('creativePage.form.style')} as="select" value={style} onChange={(event) => setStyle(event.target.value)}>
                <option value="social ad creative">{t('automationPage.options.socialAdCreative')}</option>
                <option value="product showcase">{t('automationPage.options.productShowcase')}</option>
                <option value="lifestyle photo">{t('automationPage.options.lifestylePhoto')}</option>
                <option value="minimal clean">Minimal clean</option>
                <option value="luxury premium">Luxury premium</option>
              </FormField>

              <div className="creative-grid-2">
                <FormField label={t('creativePage.form.aiProvider')} as="select" value={provider} onChange={(event) => setProvider(event.target.value as AIProvider)}>
                  {AI_PROVIDER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </FormField>
                <FormField label={t('creativePage.form.aiModel')} as="select" value={model} onChange={(event) => setModel(event.target.value)}>
                  {AI_MODELS[provider].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </FormField>
              </div>

              <button type="button" className="btn btn-primary btn-lg" onClick={() => void handleGenerate()} disabled={!productId || generating}>
                {generating ? t('creativePage.generatingPreview') : t('creativePage.generatePreview')}
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
              {preview ? <span className="badge badge-info">{preview.ai_provider}/{preview.ai_model}</span> : null}
            </div>

            {!preview ? (
              <div className="empty-state">
                <div className="empty-state-title">{t('creativePage.noPreviewTitle')}</div>
                <div className="empty-state-description">{t('creativePage.noPreviewDescription')}</div>
              </div>
            ) : (
              <div className="creative-preview">
                <div className="creative-preview-meta">
                  <span className="badge badge-neutral">{t(`creativePage.mode.${preview.generation_type}`)}</span>
                  <span className="badge badge-neutral">{t('creativePage.form.tone')}: {tone}</span>
                  <span className="badge badge-neutral">{t('creativePage.form.language')}: {language}</span>
                  <span className="badge badge-neutral">{t('creativePage.form.style')}: {style}</span>
                </div>

                {selectedProduct ? (
                  <div className="creative-preview-context">
                    <div className="creative-context-title">{selectedProduct.name}</div>
                    <div className="creative-context-text">{selectedProduct.description || t('creativePage.context.noDescription')}</div>
                    {selectedLibrary ? (
                      <div className="creative-context-text">
                        {t('creativePage.context.library')}: {selectedLibrary.title || selectedLibrary.content}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {mode !== 'content' ? (
                  <div className="creative-preview-media">
                    {preview.media_url ? (
                      <img src={preview.media_url} alt="AI preview" className="creative-preview-image" />
                    ) : (
                      <div className="creative-preview-placeholder">{t('creativePage.context.noImageGenerated')}</div>
                    )}
                    <div className="creative-preview-caption">
                      {preview.image_provider}/{preview.image_model}
                    </div>
                  </div>
                ) : null}

                {mode !== 'image' || Boolean(preview.content) ? (
                  <div className="creative-preview-content">
                    <div className="creative-context-title">{t('creativePage.context.generatedContent')}</div>
                    <p>{preview.content}</p>
                  </div>
                ) : null}
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
                <button type="button" className="btn btn-secondary" onClick={() => void handleAddToDraft()} disabled={!preview || submittingAction !== null}>
                  {submittingAction === 'draft' ? t('creativePage.adding') : t('creativePage.addToDraft')}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => void handleSchedule()} disabled={!preview || submittingAction !== null}>
                  {submittingAction === 'schedule' ? t('creativePage.scheduling') : t('creativePage.schedule')}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => void handlePostNow()} disabled={!preview || !selectedPage || submittingAction !== null}>
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
