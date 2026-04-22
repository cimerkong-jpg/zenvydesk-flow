import { useEffect, useState } from 'react'
import {
  createAutomationRule,
  deleteAutomationRule,
  fetchAutomationRules,
  fetchContentLibrary,
  fetchProducts,
  runAutomation,
  updateAutomationRule,
  type AutomationRule,
  type AutomationRunResult,
  type ContentLibraryItem,
  type Product,
} from '../lib/api'
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

export function AutomationRulesPage() {
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
      toast.success(`Rule ${ruleId}: ${result.status}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setRunningId(null)
    }
  }

  const columns: Column<AutomationRule>[] = [
    {
      key: 'name',
      header: 'Rule',
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
      header: 'Schedule',
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
      header: 'Generation',
      width: '200px',
      render: (row) => (
        <div className="text-sm">
          <div>{row.tone || row.content_type || 'marketing'}</div>
          <div className="text-muted">{row.language || 'th'} | {row.style || 'social ad creative'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Auto-post',
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
            Edit
          </button>
          <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeletingRule(row)}>
            Delete
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => handleRun(row.id)} disabled={runningId !== null}>
            {runningId === row.id ? 'Running...' : 'Run now'}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Automation Rules"
        description="Generate drafts automatically from selected products, content, and page context."
        actions={
          <button className="btn btn-primary" onClick={() => setShowCreate(true)} disabled={!selectedPage}>
            + New Rule
          </button>
        }
      />

      {!selectedPage && (
        <div className="alert alert-warning">
          <div className="alert-content">
            <div className="alert-title">No page selected</div>
            <div className="alert-message">Select a Facebook page before creating or running automation rules.</div>
          </div>
        </div>
      )}

      {lastResult && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Last run</h3>
          </div>
          <div className="info-grid">
            <div className="info-row">
              <div className="info-label">Rule</div>
              <div className="info-value">{lastResult.rule_id}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Status</div>
              <div className="info-value">{lastResult.status}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Draft</div>
              <div className="info-value">{lastResult.draft_id ?? '-'}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Post history</div>
              <div className="info-value">{lastResult.post_history_id ?? '-'}</div>
            </div>
          </div>
          {lastResult.error && <div className="alert-message">{lastResult.error}</div>}
        </div>
      )}

      {rules.loading ? (
        <LoadingState />
      ) : rules.error ? (
        <div className="alert alert-error">
          <div className="alert-content">
            <div className="alert-title">Failed to load automation rules</div>
            <div className="alert-message">{rules.error}</div>
          </div>
        </div>
      ) : (
        <div className="card card-table">
          <DataTable
            columns={columns}
            rows={rules.data ?? []}
            getRowKey={(row) => row.id}
            emptyTitle="No automation rules"
            emptyDescription="Create a rule to generate a draft or auto-post from a selected product."
            emptyAction={
              <button className="btn btn-primary" onClick={() => setShowCreate(true)} disabled={!selectedPage}>
                + Create Rule
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
          toast.success('Automation rule created')
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
          toast.success('Automation rule updated')
        }}
        onError={(message) => toast.error(message)}
      />

      <DeleteRuleModal
        open={!!deletingRule}
        ruleName={deletingRule?.name || ''}
        onClose={() => setDeletingRule(null)}
        onConfirm={async () => {
          if (!deletingRule) {
            return
          }
          await deleteAutomationRule(deletingRule.id)
          setDeletingRule(null)
          rules.refresh()
          toast.success('Automation rule deleted')
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
  }, [rule, open])

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
      onError('Select a Facebook page first.')
      return
    }
    if (!name.trim()) {
      onError('Rule name is required.')
      return
    }
    if (!scheduledTime) {
      onError('Scheduled time is required.')
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
      title={isEdit ? 'Edit Automation Rule' : 'New Automation Rule'}
      description="Choose page, product context, and generation settings for automated draft creation."
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
            {submitting ? 'Saving...' : isEdit ? 'Update Rule' : 'Create Rule'}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <FormField label="Rule name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Daily product spotlight" />

        <FormField label="Product" as="select" value={productId} onChange={(event) => setProductId(event.target.value)}>
          <option value="">(auto by selection mode)</option>
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
          onChange={(event) => setContentLibraryId(event.target.value)}
        >
          <option value="">(none)</option>
          {contentLibrary.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title || truncate(item.content, 50)}
            </option>
          ))}
        </FormField>

        <FormField label="Content type" as="select" value={contentType} onChange={(event) => setContentType(event.target.value)}>
          <option value="">(auto)</option>
          <option value="promotion">promotion</option>
          <option value="product_intro">product_intro</option>
          <option value="engagement">engagement</option>
          <option value="general_post">general_post</option>
        </FormField>

        <FormField label="Tone" as="select" value={tone} onChange={(event) => setTone(event.target.value)}>
          <option value="marketing">marketing</option>
          <option value="friendly">friendly</option>
          <option value="professional">professional</option>
          <option value="playful">playful</option>
        </FormField>

        <FormField label="Language" as="select" value={language} onChange={(event) => setLanguage(event.target.value)}>
          <option value="th">Thai</option>
          <option value="en">English</option>
        </FormField>

        <FormField label="Visual style" as="select" value={style} onChange={(event) => setStyle(event.target.value)}>
          <option value="social ad creative">social ad creative</option>
          <option value="product showcase">product showcase</option>
          <option value="lifestyle photo">lifestyle photo</option>
          <option value="clean studio shot">clean studio shot</option>
        </FormField>

        <FormField
          label="Scheduled time"
          type="datetime-local"
          required
          value={scheduledTime}
          onChange={(event) => setScheduledTime(event.target.value)}
        />

        <FormField
          label="Product selection mode"
          as="select"
          value={selectionMode}
          onChange={(event) => setSelectionMode(event.target.value)}
          hint="Used when no specific product is selected."
        >
          <option value="">(default first product)</option>
          <option value="newest">newest</option>
          <option value="oldest">oldest</option>
          <option value="random">random</option>
          <option value="round_robin">round_robin</option>
        </FormField>

        <label className="checkbox-field">
          <input type="checkbox" checked={autoPost} onChange={(event) => setAutoPost(event.target.checked)} />
          <span>Auto-post immediately after draft generation.</span>
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
      title="Delete Automation Rule"
      description="This action cannot be undone."
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Rule'}
          </button>
        </>
      }
    >
      <p>
        Delete <strong>{ruleName}</strong>?
      </p>
    </Modal>
  )
}
