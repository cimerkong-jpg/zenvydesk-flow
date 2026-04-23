import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { FormField } from '../components/FormField'
import { useToast } from '../components/Toast'
import { apiBaseUrl } from '../config'
import { useAuth } from '../context/AuthContext'
import { useSelectedPage } from '../hooks/useSelectedPage'
import {
  deleteUserAiKey,
  fetchHealth,
  fetchRuntimeSettings,
  fetchUserAiKeys,
  type RuntimeSettings,
  type UserAiKeyStatus,
  upsertUserAiKey,
} from '../lib/api'
import {
  AI_MODELS,
  AI_PROVIDER_OPTIONS,
  type AIProvider,
  type AiPreferences,
  loadAiPreferences,
  saveAiPreferences,
} from '../lib/aiPreferences'

type HealthState = 'loading' | 'ok' | 'down'

const PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: 'OpenAI / GPT',
  gemini: 'Google Gemini',
  claude: 'Anthropic Claude',
  grok: 'xAI Grok',
}

const PROVIDER_PLACEHOLDERS: Record<AIProvider, string> = {
  openai: 'sk-...',
  gemini: 'AIza...',
  claude: 'sk-ant-...',
  grok: 'xai-...',
}

export function SettingsPage() {
  const toast = useToast()
  const { user } = useAuth()
  const { pages, selectedPage, setSelectedPage } = useSelectedPage()
  const [health, setHealth] = useState<HealthState>('loading')
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  const [runtime, setRuntime] = useState<RuntimeSettings | null>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<AiPreferences>(() => loadAiPreferences())
  const [aiKeys, setAiKeys] = useState<UserAiKeyStatus[]>([])
  const [keysLoading, setKeysLoading] = useState(true)
  const [activeEditor, setActiveEditor] = useState<AIProvider | null>(null)
  const [draftKey, setDraftKey] = useState('')
  const [savingProvider, setSavingProvider] = useState<AIProvider | null>(null)
  const [deletingProvider, setDeletingProvider] = useState<AIProvider | null>(null)

  const aiKeyMap = useMemo(
    () => Object.fromEntries(aiKeys.map((item) => [item.provider, item])) as Partial<Record<AIProvider, UserAiKeyStatus>>,
    [aiKeys],
  )

  const runHealthCheck = () => {
    setHealth('loading')
    fetchHealth()
      .then(() => {
        setHealth('ok')
        setCheckedAt(new Date())
      })
      .catch(() => {
        setHealth('down')
        setCheckedAt(new Date())
      })
  }

  const loadRuntime = () => {
    setRuntimeError(null)
    fetchRuntimeSettings()
      .then(setRuntime)
      .catch((error) => {
        setRuntimeError(error instanceof Error ? error.message : String(error))
      })
  }

  const loadAiKeys = () => {
    setKeysLoading(true)
    fetchUserAiKeys()
      .then((response) => setAiKeys(response.items))
      .catch((error) => toast.error(error instanceof Error ? error.message : String(error)))
      .finally(() => setKeysLoading(false))
  }

  useEffect(() => {
    runHealthCheck()
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      loadRuntime()
    }
    loadAiKeys()
  }, [user?.role])

  useEffect(() => {
    saveAiPreferences(preferences)
  }, [preferences])

  const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(`${label} copied`))
      .catch((error) => toast.error(error instanceof Error ? error.message : String(error)))
  }

  const updatePreferences = (patch: Partial<AiPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch }
      const model = AI_MODELS[next.provider].includes(next.model) ? next.model : AI_MODELS[next.provider][0]
      return { ...next, model }
    })
  }

  const saveProviderKey = async () => {
    if (!activeEditor) return
    setSavingProvider(activeEditor)
    try {
      await upsertUserAiKey(activeEditor, draftKey)
      toast.success(`${PROVIDER_LABELS[activeEditor]} key saved`)
      setDraftKey('')
      setActiveEditor(null)
      loadAiKeys()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setSavingProvider(null)
    }
  }

  const removeProviderKey = async (provider: AIProvider) => {
    setDeletingProvider(provider)
    try {
      await deleteUserAiKey(provider)
      toast.success(`${PROVIDER_LABELS[provider]} key removed`)
      if (activeEditor === provider) {
        setActiveEditor(null)
        setDraftKey('')
      }
      loadAiKeys()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setDeletingProvider(null)
    }
  }

  return (
    <div className="page">
      <PageHeader title="Settings" description="Runtime status, AI preferences, personal AI keys, and page defaults." />

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Backend</h3>
          <button className="btn btn-ghost btn-sm" onClick={runHealthCheck}>
            Refresh
          </button>
        </div>
        <div className="info-grid">
          <div className="info-row">
            <div className="info-label">API base URL</div>
            <div className="info-value">
              <code>{apiBaseUrl}</code>
              <button className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(apiBaseUrl, 'API URL')}>
                Copy
              </button>
            </div>
          </div>
          <div className="info-row">
            <div className="info-label">Health</div>
            <div className="info-value">
              {health === 'loading' && 'Checking...'}
              {health === 'ok' && 'Online'}
              {health === 'down' && 'Offline'}
            </div>
          </div>
          {checkedAt && (
            <div className="info-row">
              <div className="info-label">Last checked</div>
              <div className="info-value">{checkedAt.toLocaleTimeString()}</div>
            </div>
          )}
        </div>
      </div>

      {(user?.role === 'admin' || user?.role === 'super_admin') && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">AI Configuration</h3>
            <button className="btn btn-ghost btn-sm" onClick={loadRuntime}>
              Reload
            </button>
          </div>
          {runtimeError ? (
            <div className="alert alert-error">
              <div className="alert-content">
                <div className="alert-title">Failed to load runtime settings</div>
                <div className="alert-message">{runtimeError}</div>
              </div>
            </div>
          ) : runtime ? (
            <div className="info-grid">
              <div className="info-row">
                <div className="info-label">Environment</div>
                <div className="info-value">{runtime.app_env}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Frontend target</div>
                <div className="info-value">{runtime.frontend_base_url}</div>
              </div>
              <div className="info-row">
                <div className="info-label">AI provider</div>
                <div className="info-value">
                  {runtime.ai_provider} / {runtime.ai_model}
                </div>
              </div>
              <div className="info-row">
                <div className="info-label">AI status</div>
                <div className="info-value">{runtime.ai_configured ? 'Configured' : 'Missing key/config'}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Image provider</div>
                <div className="info-value">
                  {runtime.image_provider} / {runtime.image_model}
                </div>
              </div>
              <div className="info-row">
                <div className="info-label">Image status</div>
                <div className="info-value">{runtime.image_configured ? 'Configured' : 'Missing key/config'}</div>
              </div>
            </div>
          ) : (
            <div className="text-muted">Loading runtime settings...</div>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">AI Preferences</h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              saveAiPreferences(preferences)
              toast.success('AI preferences saved in browser storage')
            }}
          >
            Save
          </button>
        </div>
        <div className="form-stack">
          <div className="creative-grid-2">
            <FormField
              label="Default AI provider"
              as="select"
              value={preferences.provider}
              onChange={(event) => updatePreferences({ provider: event.target.value as AIProvider })}
            >
              {AI_PROVIDER_OPTIONS.map((provider) => (
                <option key={provider} value={provider}>
                  {PROVIDER_LABELS[provider]}
                </option>
              ))}
            </FormField>
            <FormField
              label="Default AI model"
              as="select"
              value={preferences.model}
              onChange={(event) => updatePreferences({ model: event.target.value })}
            >
              {AI_MODELS[preferences.provider].map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </FormField>
          </div>
          <div className="form-hint">
            Provider and model stay in this browser. API keys are stored on your account and used server-side.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">AI API Keys</h3>
        </div>
        <div className="form-stack">
          <div className="form-hint">
            Your personal key is used first. If not configured, ZenvyDesk may use the system fallback key.
          </div>

          {keysLoading ? (
            <div className="text-muted">Loading AI key status...</div>
          ) : (
            <ul className="list">
              {AI_PROVIDER_OPTIONS.map((provider) => {
                const item = aiKeyMap[provider]
                const isEditing = activeEditor === provider
                return (
                  <li key={provider} className="list-item" style={{ alignItems: 'stretch' }}>
                    <div className="list-item-main">
                      <div className="list-item-title">{PROVIDER_LABELS[provider]}</div>
                      <div className="list-item-meta">
                        Source: {item?.source ?? 'missing'} | Status: {item?.validation_status ?? 'not configured'} |{' '}
                        {item?.key_hint ?? 'No key saved'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className={`badge ${item?.is_configured ? 'badge-success' : 'badge-warning'}`}>
                        {item?.is_configured ? 'Configured' : 'Not configured'}
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setActiveEditor(provider)
                          setDraftKey('')
                        }}
                      >
                        {item?.source === 'user' ? 'Update' : 'Add key'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => void removeProviderKey(provider)}
                        disabled={deletingProvider === provider || item?.source !== 'user'}
                      >
                        {deletingProvider === provider ? 'Removing...' : 'Delete'}
                      </button>
                    </div>
                    {isEditing && (
                      <div style={{ width: '100%', marginTop: '12px' }}>
                        <FormField
                          label={`${PROVIDER_LABELS[provider]} API key`}
                          type="password"
                          value={draftKey}
                          onChange={(event) => setDraftKey(event.target.value)}
                          placeholder={PROVIDER_PLACEHOLDERS[provider]}
                          hint="Saved keys are encrypted at rest and never shown back in full."
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => void saveProviderKey()}
                            disabled={savingProvider === provider || !draftKey.trim()}
                          >
                            {savingProvider === provider ? 'Saving...' : 'Save key'}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setActiveEditor(null)
                              setDraftKey('')
                            }}
                            disabled={savingProvider === provider}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Default Facebook Page</h3>
        </div>
        {pages.length === 0 ? (
          <div className="info-row">
            <div className="info-label">No pages connected</div>
            <div className="info-value text-muted">Go to Connections to connect and select a page.</div>
          </div>
        ) : (
          <ul className="list">
            {pages.map((page) => {
              const active = selectedPage?.facebook_page_id === page.facebook_page_id
              return (
                <li key={page.facebook_page_id} className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-title">{page.page_name}</div>
                    <div className="list-item-meta">
                      ID: {page.facebook_page_id} | {page.connection_status} | token {page.has_access_token ? 'ready' : 'missing'}
                    </div>
                  </div>
                  {active ? (
                    <span className="badge badge-success">Selected</span>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        void setSelectedPage(page).then(() => {
                          toast.success(`${page.page_name} set as default`)
                        })
                      }}
                    >
                      Make default
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
