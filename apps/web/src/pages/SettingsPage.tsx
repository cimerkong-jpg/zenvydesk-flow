import { useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { FormField } from '../components/FormField'
import { useToast } from '../components/Toast'
import { apiBaseUrl } from '../config'
import { useSelectedPage } from '../hooks/useSelectedPage'
import { fetchHealth, fetchRuntimeSettings, type RuntimeSettings } from '../lib/api'
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
  openai: 'OpenAI',
  gemini: 'Gemini',
  claude: 'Claude',
  grok: 'Grok',
}

const PROVIDER_PLACEHOLDERS: Record<AIProvider, string> = {
  openai: 'sk-...',
  gemini: 'AIza...',
  claude: 'sk-ant-...',
  grok: 'xai-...',
}

export function SettingsPage() {
  const toast = useToast()
  const { pages, selectedPage, setSelectedPage } = useSelectedPage()
  const [health, setHealth] = useState<HealthState>('loading')
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  const [runtime, setRuntime] = useState<RuntimeSettings | null>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<AiPreferences>(() => loadAiPreferences())

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

  useEffect(() => {
    runHealthCheck()
    loadRuntime()
  }, [])

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

  const updateProviderKey = (provider: AIProvider, value: string) => {
    setPreferences((current) => ({
      ...current,
      providerKeys: {
        ...current.providerKeys,
        [provider]: value,
      },
    }))
  }

  const maskKey = (value?: string) => (value ? `${value.slice(0, 4)}......${value.slice(-4)}` : 'Not saved')

  return (
    <div className="page">
      <PageHeader title="Settings" description="Runtime status, AI configuration, and page defaults." />

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

          <FormField
            label={`${PROVIDER_LABELS[preferences.provider]} API key`}
            type="password"
            value={preferences.providerKeys[preferences.provider] ?? ''}
            onChange={(event) => updateProviderKey(preferences.provider, event.target.value)}
            placeholder={PROVIDER_PLACEHOLDERS[preferences.provider]}
            hint={`Saved locally: ${maskKey(preferences.providerKeys[preferences.provider])}`}
          />

          <div className="form-hint">
            Content and image preferences now share one AI selection. Each provider key is still stored separately in this browser, so switching back to a previous AI restores the key you entered before.
          </div>
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
