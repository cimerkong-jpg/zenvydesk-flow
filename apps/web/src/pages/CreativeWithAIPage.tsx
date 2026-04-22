import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { FormField } from '../components/FormField'
import { LoadingState } from '../components/LoadingState'
import { useAsync } from '../hooks/useAsync'
import { useSelectedPage } from '../hooks/useSelectedPage'
import { useToast } from '../components/Toast'
import {
  createDraft,
  creativeGenerate,
  fetchContentLibrary,
  fetchProducts,
  postFromDraft,
  scheduleDraft,
  type CreativeGenerateResponse,
} from '../lib/api'
import { fromDateTimeLocalValue } from '../lib/format'
import {
  CONTENT_MODELS,
  CONTENT_PROVIDER_OPTIONS,
  IMAGE_MODELS,
  IMAGE_PROVIDER_OPTIONS,
  getProviderKey,
  loadAiPreferences,
} from '../lib/aiPreferences'

type GenerationMode = 'post' | 'image' | 'content'

export function CreativeWithAIPage() {
  const toast = useToast()
  const { selectedPage } = useSelectedPage()
  const products = useAsync(fetchProducts, [])
  const contentLibrary = useAsync(fetchContentLibrary, [])

  const [mode, setMode] = useState<GenerationMode>('post')
  const [productId, setProductId] = useState('')
  const [contentLibraryId, setContentLibraryId] = useState('')
  const [tone, setTone] = useState('marketing')
  const [language, setLanguage] = useState('th')
  const [style, setStyle] = useState('social ad creative')
  const [contentProvider, setContentProvider] = useState(loadAiPreferences().contentProvider)
  const [contentModel, setContentModel] = useState(loadAiPreferences().contentModel)
  const [imageProvider, setImageProvider] = useState(loadAiPreferences().imageProvider)
  const [imageModel, setImageModel] = useState(loadAiPreferences().imageModel)
  const [preview, setPreview] = useState<CreativeGenerateResponse | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [submittingAction, setSubmittingAction] = useState<string | null>(null)
  const [scheduleTime, setScheduleTime] = useState('')

  useEffect(() => {
    const saved = loadAiPreferences()
    setContentProvider(saved.contentProvider)
    setContentModel(saved.contentModel)
    setImageProvider(saved.imageProvider)
    setImageModel(saved.imageModel)
  }, [])

  useEffect(() => {
    if (!CONTENT_MODELS[contentProvider]?.includes(contentModel)) {
      setContentModel(CONTENT_MODELS[contentProvider][0])
    }
  }, [contentProvider, contentModel])

  useEffect(() => {
    if (!IMAGE_MODELS[imageProvider]?.includes(imageModel)) {
      setImageModel(IMAGE_MODELS[imageProvider][0])
    }
  }, [imageProvider, imageModel])

  const selectedProduct = useMemo(
    () => products.data?.find((item) => item.id === Number(productId)) ?? null,
    [products.data, productId],
  )

  const selectedLibrary = useMemo(
    () => contentLibrary.data?.find((item) => item.id === Number(contentLibraryId)) ?? null,
    [contentLibrary.data, contentLibraryId],
  )

  const handleGenerate = async () => {
    if (!productId) {
      toast.error('Chọn product trước khi generate.')
      return
    }

    setGenerating(true)
    setPreviewError(null)
    try {
      const preferences = loadAiPreferences()
      const result = await creativeGenerate({
        generation_type: mode,
        product_id: Number(productId),
        content_library_id: contentLibraryId ? Number(contentLibraryId) : null,
        tone,
        language,
        style,
        ai_provider: contentProvider,
        ai_model: contentModel,
        ai_api_key: getProviderKey(preferences, contentProvider),
        image_provider: imageProvider,
        image_model: imageModel,
        image_api_key: getProviderKey(preferences, imageProvider),
      })
      setPreview(result)
      toast.success('Preview AI đã sẵn sàng.')
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
      throw new Error('Generate preview trước khi thực hiện action.')
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
      toast.success(`Đã thêm vào draft #${draft.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmittingAction(null)
    }
  }

  const handleSchedule = async () => {
    if (!scheduleTime) {
      toast.error('Chọn thời gian trước khi đặt lịch.')
      return
    }

    setSubmittingAction('schedule')
    try {
      const draft = await createDraftFromPreview()
      await scheduleDraft(draft.id, fromDateTimeLocalValue(scheduleTime))
      toast.success(`Đã đặt lịch draft #${draft.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmittingAction(null)
    }
  }

  const handlePostNow = async () => {
    if (!selectedPage) {
      toast.error('Chọn Facebook page trước khi post.')
      return
    }
    if (!preview) {
      toast.error('Generate preview trước khi post.')
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
      toast.success(`Đã post draft #${draft.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmittingAction(null)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Creative with AI"
        description="Generate a full post, image-only creative, or content-only copy with a complete preview."
      />

      <div className="creative-layout">
        <div className="card creative-controls">
          <div className="card-header">
            <h3 className="card-title">Creative setup</h3>
          </div>

          {products.loading || contentLibrary.loading ? (
            <LoadingState />
          ) : (
            <div className="form-stack">
              <div className="creative-mode-switch">
                {(['post', 'image', 'content'] as GenerationMode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`filter-tab ${mode === item ? 'active' : ''}`}
                    onClick={() => setMode(item)}
                  >
                    {item === 'post' ? 'Tạo Post' : item === 'image' ? 'Tạo Ảnh' : 'Tạo Content'}
                  </button>
                ))}
              </div>

              <FormField
                label="Product"
                as="select"
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                required
              >
                <option value="">Chọn product</option>
                {products.data?.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </FormField>

              <FormField
                label="Content Library"
                as="select"
                value={contentLibraryId}
                onChange={(event) => setContentLibraryId(event.target.value)}
                hint="Optional context for AI."
              >
                <option value="">Không dùng</option>
                {contentLibrary.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title || item.content}
                  </option>
                ))}
              </FormField>

              <div className="creative-grid-2">
                <FormField label="Tone" as="select" value={tone} onChange={(e) => setTone(e.target.value)}>
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
                >
                  <option value="th">Thai</option>
                  <option value="en">English</option>
                  <option value="vi">Vietnamese</option>
                </FormField>
              </div>

              <FormField
                label="Style"
                as="select"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                <option value="social ad creative">Social ad creative</option>
                <option value="product showcase">Product showcase</option>
                <option value="lifestyle photo">Lifestyle photo</option>
                <option value="minimal clean">Minimal clean</option>
                <option value="luxury premium">Luxury premium</option>
              </FormField>

              <div className="creative-grid-2">
                <FormField
                  label="Content AI"
                  as="select"
                  value={contentProvider}
                  onChange={(e) => setContentProvider(e.target.value as typeof contentProvider)}
                >
                  {CONTENT_PROVIDER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </FormField>
                <FormField
                  label="Content model"
                  as="select"
                  value={contentModel}
                  onChange={(e) => setContentModel(e.target.value)}
                >
                  {CONTENT_MODELS[contentProvider].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </FormField>
              </div>

              <div className="creative-grid-2">
                <FormField
                  label="Image AI"
                  as="select"
                  value={imageProvider}
                  onChange={(e) => setImageProvider(e.target.value as typeof imageProvider)}
                >
                  {IMAGE_PROVIDER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </FormField>
                <FormField
                  label="Image model"
                  as="select"
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                >
                  {IMAGE_MODELS[imageProvider].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </FormField>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleGenerate}
                disabled={!productId || generating}
              >
                {generating ? 'Generating preview...' : 'Generate preview'}
              </button>

              {previewError && (
                <div className="alert alert-error">
                  <span className="alert-icon">x</span>
                  <div className="alert-content">
                    <div className="alert-title">Generation failed</div>
                    <div className="alert-message">{previewError}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="creative-preview-stack">
          <div className="card creative-preview-card">
            <div className="card-header">
              <h3 className="card-title">Preview</h3>
              {preview && (
                <span className="badge badge-info">
                  {preview.ai_provider}/{preview.ai_model}
                </span>
              )}
            </div>

            {!preview ? (
              <div className="empty-state">
                <div className="empty-state-icon">✨</div>
                <div className="empty-state-title">No preview yet</div>
                <div className="empty-state-description">
                  Chọn product, style, AI provider, model rồi generate để xem bản creative hoàn chỉnh.
                </div>
              </div>
            ) : (
              <div className="creative-preview">
                <div className="creative-preview-meta">
                  <span className="badge badge-neutral">Mode: {preview.generation_type}</span>
                  <span className="badge badge-neutral">Tone: {tone}</span>
                  <span className="badge badge-neutral">Language: {language}</span>
                  <span className="badge badge-neutral">Style: {style}</span>
                </div>

                {selectedProduct && (
                  <div className="creative-preview-context">
                    <div className="creative-context-title">{selectedProduct.name}</div>
                    <div className="creative-context-text">{selectedProduct.description || 'No description'}</div>
                    {selectedLibrary && (
                      <div className="creative-context-text">
                        Library: {selectedLibrary.title || selectedLibrary.content}
                      </div>
                    )}
                  </div>
                )}

                {mode !== 'content' && (
                  <div className="creative-preview-media">
                    {preview.media_url ? (
                      <img src={preview.media_url} alt="AI preview" className="creative-preview-image" />
                    ) : (
                      <div className="creative-preview-placeholder">No image generated</div>
                    )}
                    <div className="creative-preview-caption">
                      {preview.image_provider}/{preview.image_model}
                    </div>
                  </div>
                )}

                {(mode !== 'image' || Boolean(preview.content)) && (
                  <div className="creative-preview-content">
                    <div className="creative-context-title">Generated content</div>
                    <p>{preview.content}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Actions</h3>
              {selectedPage ? (
                <span className="badge badge-success">Page: {selectedPage.page_name}</span>
              ) : (
                <span className="badge badge-warning">No page selected</span>
              )}
            </div>

            <div className="form-stack">
              <FormField
                label="Schedule time"
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                hint="Used only for Schedule."
              />

              <div className="creative-action-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddToDraft}
                  disabled={!preview || submittingAction !== null}
                >
                  {submittingAction === 'draft' ? 'Adding...' : 'Add to Draft'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSchedule}
                  disabled={!preview || submittingAction !== null}
                >
                  {submittingAction === 'schedule' ? 'Scheduling...' : 'Schedule'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handlePostNow}
                  disabled={!preview || !selectedPage || submittingAction !== null}
                >
                  {submittingAction === 'post' ? 'Posting...' : 'Post now'}
                </button>
              </div>

              {!selectedPage && (
                <div className="form-hint">
                  You can still generate and save drafts without a page. Only posting is blocked.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
