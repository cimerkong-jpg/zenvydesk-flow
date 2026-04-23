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
import { formatDateTime, formatRelative, fromDateTimeLocalValue, toDateTimeLocalValue, truncate } from '../lib/format'
import {
  createAutomationRule,
  deleteAutomationRule,
  fetchAutomationRules,
  fetchContentLibrary,
  fetchProducts,
  runAutomation,
  type AutomationRule,
  type AutomationRunResult,
  type ContentLibraryItem,
  type Product,
  updateAutomationRule,
} from '../lib/api'

export function AutomationRulesPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { selectedPage } = useSelectedPage()
  const rules = useAsync(fetchAutomationRules, [])
  const products = useAsync(fetchProducts, [])
  const contentLibrary = useAsync(fetchContentLibrary, [])
  const [showCreate, setShowCreate] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [deletingRule, setDeletingRule] = useState<AutomationRule | null>(null)
  const [runningId, setRunningId] = useState<number | null>(null)
  const [lastResult, setLastResult] = useState<AutomationRunResult | null>(null)

  const handleRun = async (ruleId: number) => {
    setRunningId(ruleId)
    setLastResult(null)
    try {
      const result = await runAutomation(ruleId)
      setLastResult(result)
      rules.refresh()
      toast.success(t('automationPage.runSuccess', { id: ruleId, status: result.status }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setRunningId(null)
    }
  }

  const columns: Column<AutomationRule>[] = [
    {
      key: 'name',
      header: t('automationPage.table.rule'),
      render: (row) => (
        <div className="cell-primary">
          <div className="cell-title">{row.name}</div>
          <div className="cell-subtitle text-muted text-sm">
            Page #{row.page_id}
            {row.product_id ? ` | Product #${row.product_id}` : ''}
            {row.content_library_id ? ` | Library #${row.content_library_id}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'scheduled',
      header: t('automationPage.table.schedule'),
      width: '180px',
      render: (row) => (
        <div>
          <div>{formatDateTime(row.scheduled_time)}</div>
          <div className="text-muted text-sm">{formatRelative(row.scheduled_time)}</div>
        </div>
      ),
    },
    {
      key: 'strategy',
      header: t('automationPage.table.generation'),
      width: '200px',
      render: (row) => (
        <div className="text-sm">
          <div>{row.tone || row.content_type || t('automationPage.options.marketing')}</div>
          <div className="text-muted">
            {row.language || 'th'} | {row.style || t('automationPage.options.socialAdCreative')}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('automationPage.table.autoPost'),
      width: '110px',
      render: (row) => <StatusBadge status={row.auto_post ? 'active' : 'inactive'} />,
    },
    {
      key: 'actions',
      header: '',
      width: '220px',
      align: 'right',
      render: (row) => (
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setEditingRule(row)}>
            {t('common.edit')}
          </button>
          <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeletingRule(row)}>
            {t('common.delete')}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => void handleRun(row.id)} disabled={runningId !== null}>
            {runningId === row.id ? t('automationPage.actions.running') : t('automationPage.actions.runNow')}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title={t('automationPage.title')}
        description={t('automationPage.description')}
        actions={
          <button className="btn btn-primary" onClick={() => setShowCreate(true)} disabled={!selectedPage}>
            {t('automationPage.newRule')}
          </button>
        }
      />

      {!selectedPage ? (
        <div className="alert alert-warning">
          <div className="alert-content">
            <div className="alert-title">{t('automationPage.noPageTitle')}</div>
            <div className="alert-message">{t('automationPage.noPageDescription')}</div>
          </div>
        </div>
      ) : null}

      {lastResult ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('automationPage.lastRun')}</h3>
          </div>
          <div className="info-grid">
            <div className="info-row">
              <div className="info-label">{t('automationPage.table.rule')}</div>
              <div className="info-value">{lastResult.rule_id}</div>
            </div>
            <div className="info-row">
              <div className="info-label">{t('automationPage.table.status')}</div>
              <div className="info-value">{lastResult.status}</div>
            </div>
            <div className="info-row">
              <div className="info-label">{t('automationPage.table.draft')}</div>
              <div className="info-value">{lastResult.draft_id ?? '-'}</div>
            </div>
            <div className="info-row">
              <div className="info-label">{t('automationPage.table.postHistory')}</div>
              <div className="info-value">{lastResult.post_history_id ?? '-'}</div>
            </div>
          </div>
          {lastResult.error ? <div className="alert-message">{lastResult.error}</div> : null}
        </div>
      ) : null}

      {rules.loading ? (
        <LoadingState />
      ) : rules.error ? (
        <div className="alert alert-error">
          <div className="alert-content">
            <div className="alert-title">{t('automationPage.failedLoad')}</div>
            <div className="alert-message">{rules.error}</div>
          </div>
        </div>
      ) : (
        <div className="card card-table">
          <DataTable
            columns={columns}
            rows={rules.data ?? []}
            getRowKey={(row) => row.id}
            emptyTitle={t('automationPage.emptyTitle')}
            emptyDescription={t('automationPage.emptyDescription')}
            emptyAction={
              <button className="btn btn-primary" onClick={() => setShowCreate(true)} disabled={!selectedPage}>
                {t('automationPage.createRule')}
              </button>
            }
          />
        </div>
      )}

      <RuleModal
        open={showCreate}
        pageId={selectedPage?.id ?? null}
        products={products.data ?? []}
        contentLibrary={contentLibrary.data ?? []}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false)
          rules.refresh()
          toast.success(t('automationPage.created'))
        }}
        onError={(message) => toast.error(message)}
      />

      <RuleModal
        open={!!editingRule}
        pageId={selectedPage?.id ?? editingRule?.page_id ?? null}
        rule={editingRule}
        products={products.data ?? []}
        contentLibrary={contentLibrary.data ?? []}
        onClose={() => setEditingRule(null)}
        onSuccess={() => {
          setEditingRule(null)
          rules.refresh()
          toast.success(t('automationPage.updated'))
        }}
        onError={(message) => toast.error(message)}
      />

      <DeleteRuleModal
        open={!!deletingRule}
        ruleName={deletingRule?.name || ''}
        onClose={() => setDeletingRule(null)}
        onConfirm={async () => {
          if (!deletingRule) return
          await deleteAutomationRule(deletingRule.id)
          setDeletingRule(null)
          rules.refresh()
          toast.success(t('automationPage.deleted'))
        }}
      />
    </div>
  )
}

function RuleModal({
  open,
  pageId,
  rule,
  products,
  contentLibrary,
  onClose,
  onSuccess,
  onError,
}: {
  open: boolean
  pageId: number | null
  rule?: AutomationRule | null
  products: Product[]
  contentLibrary: ContentLibraryItem[]
  onClose: () => void
  onSuccess: () => void
  onError: (message: string) => void
}) {
  const { t } = useTranslation()
  const isEdit = !!rule
  const [name, setName] = useState('')
  const [productId, setProductId] = useState('')
  const [contentLibraryId, setContentLibraryId] = useState('')
  const [contentType, setContentType] = useState('')
  const [tone, setTone] = useState('marketing')
  const [language, setLanguage] = useState('th')
  const [style, setStyle] = useState('social ad creative')
  const [autoPost, setAutoPost] = useState(false)
  const [scheduledTime, setScheduledTime] = useState('')
  const [selectionMode, setSelectionMode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setName(rule?.name ?? '')
    setProductId(rule?.product_id ? String(rule.product_id) : '')
    setContentLibraryId(rule?.content_library_id ? String(rule.content_library_id) : '')
    setContentType(rule?.content_type ?? '')
    setTone(rule?.tone ?? 'marketing')
    setLanguage(rule?.language ?? 'th')
    setStyle(rule?.style ?? 'social ad creative')
    setAutoPost(rule?.auto_post ?? false)
    setSelectionMode(rule?.product_selection_mode ?? '')
    setScheduledTime(rule?.scheduled_time ? toDateTimeLocalValue(rule.scheduled_time) : '')
  }, [open, rule])

  const reset = () => {
    setName('')
    setProductId('')
    setContentLibraryId('')
    setContentType('')
    setTone('marketing')
    setLanguage('th')
    setStyle('social ad creative')
    setAutoPost(false)
    setScheduledTime('')
    setSelectionMode('')
  }

  const handleSubmit = async () => {
    if (!pageId) {
      onError(t('automationPage.form.selectPageFirst'))
      return
    }
    if (!name.trim()) {
      onError(t('automationPage.form.ruleNameRequired'))
      return
    }
    if (!scheduledTime) {
      onError(t('automationPage.form.timeRequired'))
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        page_id: pageId,
        product_id: productId ? Number(productId) : null,
        content_library_id: contentLibraryId ? Number(contentLibraryId) : null,
        name: name.trim(),
        content_type: contentType.trim() || null,
        tone: tone || null,
        language: language || null,
        style: style || null,
        auto_post: autoPost,
        scheduled_time: fromDateTimeLocalValue(scheduledTime),
        product_selection_mode: selectionMode.trim() || null,
      }
      if (isEdit && rule) {
        await updateAutomationRule(rule.id, payload)
      } else {
        await createAutomationRule(payload)
      }
      reset()
      onSuccess()
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? t('automationPage.form.editTitle') : t('automationPage.form.newTitle')}
      description={t('automationPage.form.description')}
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
            {submitting ? t('automationPage.form.saving') : isEdit ? t('automationPage.form.update') : t('automationPage.form.create')}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <FormField label={t('automationPage.form.ruleName')} required value={name} onChange={(event) => setName(event.target.value)} placeholder={t('automationPage.form.ruleNamePlaceholder')} />

        <FormField label={t('automationPage.form.product')} as="select" value={productId} onChange={(event) => setProductId(event.target.value)}>
          <option value="">{t('automationPage.options.autoSelection')}</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </FormField>

        <FormField label={t('automationPage.form.contentLibrary')} as="select" value={contentLibraryId} onChange={(event) => setContentLibraryId(event.target.value)}>
          <option value="">{t('automationPage.options.none')}</option>
          {contentLibrary.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title || truncate(item.content, 50)}
            </option>
          ))}
        </FormField>

        <FormField label={t('automationPage.form.contentType')} as="select" value={contentType} onChange={(event) => setContentType(event.target.value)}>
          <option value="">{t('automationPage.options.auto')}</option>
          <option value="promotion">{t('automationPage.options.promotion')}</option>
          <option value="product_intro">{t('automationPage.options.productIntro')}</option>
          <option value="engagement">{t('automationPage.options.engagement')}</option>
          <option value="general_post">{t('automationPage.options.generalPost')}</option>
        </FormField>

        <FormField label={t('automationPage.form.tone')} as="select" value={tone} onChange={(event) => setTone(event.target.value)}>
          <option value="marketing">{t('automationPage.options.marketing')}</option>
          <option value="friendly">{t('automationPage.options.friendly')}</option>
          <option value="professional">{t('automationPage.options.professional')}</option>
          <option value="playful">{t('automationPage.options.playful')}</option>
        </FormField>

        <FormField label={t('automationPage.form.language')} as="select" value={language} onChange={(event) => setLanguage(event.target.value)}>
          <option value="th">{t('automationPage.options.thai')}</option>
          <option value="en">{t('automationPage.options.english')}</option>
        </FormField>

        <FormField label={t('automationPage.form.visualStyle')} as="select" value={style} onChange={(event) => setStyle(event.target.value)}>
          <option value="social ad creative">{t('automationPage.options.socialAdCreative')}</option>
          <option value="product showcase">{t('automationPage.options.productShowcase')}</option>
          <option value="lifestyle photo">{t('automationPage.options.lifestylePhoto')}</option>
          <option value="clean studio shot">{t('automationPage.options.cleanStudioShot')}</option>
        </FormField>

        <FormField label={t('automationPage.form.scheduledTime')} type="datetime-local" required value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} />

        <FormField
          label={t('automationPage.form.selectionMode')}
          as="select"
          value={selectionMode}
          onChange={(event) => setSelectionMode(event.target.value)}
          hint={t('automationPage.form.selectionModeHint')}
        >
          <option value="">{t('automationPage.options.defaultFirstProduct')}</option>
          <option value="newest">{t('automationPage.options.newest')}</option>
          <option value="oldest">{t('automationPage.options.oldest')}</option>
          <option value="random">{t('automationPage.options.random')}</option>
          <option value="round_robin">{t('automationPage.options.roundRobin')}</option>
        </FormField>

        <label className="checkbox-field">
          <input type="checkbox" checked={autoPost} onChange={(event) => setAutoPost(event.target.checked)} />
          <span>{t('automationPage.form.autoPost')}</span>
        </label>
      </div>
    </Modal>
  )
}

function DeleteRuleModal({
  open,
  ruleName,
  onClose,
  onConfirm,
}: {
  open: boolean
  ruleName: string
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
      title={t('automationPage.deleteModal.title')}
      description={t('automationPage.deleteModal.description')}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={deleting}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={deleting}>
            {deleting ? t('automationPage.deleteModal.deleting') : t('automationPage.deleteModal.confirm')}
          </button>
        </>
      }
    >
      <p>{t('automationPage.deleteModal.question', { name: ruleName })}</p>
    </Modal>
  )
}
