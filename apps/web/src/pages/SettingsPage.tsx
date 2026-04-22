import { useEffect, useState } from 'react'
import { apiBaseUrl } from '../config'
import { fetchHealth, fetchRuntimeSettings, type RuntimeSettings } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { useSelectedPage } from '../hooks/useSelectedPage'
import { useToast } from '../components/Toast'
import {
  CONTENT_MODELS,
  CONTENT_PROVIDER_OPTIONS,
  IMAGE_MODELS,
  IMAGE_PROVIDER_OPTIONS,
  type AiPreferences,
  loadAiPreferences,
  saveAiPreferences,
} from '../lib/aiPreferences'
import { FormField } from '../components/FormField'

type HealthState = 'loading' | 'ok' | 'down'

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
      const contentModel = CONTENT_MODELS[next.contentProvider].includes(next.contentModel)
        ? next.contentModel
        : CONTENT_MODELS[next.contentProvider][0]
      const imageModel = IMAGE_MODELS[next.imageProvider].includes(next.imageModel)
        ? next.imageModel
        : IMAGE_MODELS[next.imageProvider][0]
      return { ...next, contentModel, imageModel }
    })
  }

  const updateProviderKey = (provider: keyof AiPreferences['providerKeys'], value: string) => {
    setPreferences((current) => ({
      ...current,
      providerKeys: {
        ...current.providerKeys,
        [provider]: value,
      },
    }))
  }

  const maskKey = (value?: string) =>
    value ? `${value.slice(0, 4)}••••••${value.slice(-4)}` : 'Not saved'

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
              label="Default content provider"
              as="select"
              value={preferences.contentProvider}
              onChange={(event) =>
                updatePreferences({ contentProvider: event.target.value as AiPreferences['contentProvider'] })
              }
            >
              {CONTENT_PROVIDER_OPTIONS.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </FormField>
            <FormField
              label="Default content model"
              as="select"
              value={preferences.contentModel}
              onChange={(event) => updatePreferences({ contentModel: event.target.value })}
            >
              {CONTENT_MODELS[preferences.contentProvider].map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </FormField>
          </div>

          <div className="creative-grid-2">
            <FormField
              label="Default image provider"
              as="select"
              value={preferences.imageProvider}
              onChange={(event) =>
                updatePreferences({ imageProvider: event.target.value as AiPreferences['imageProvider'] })
              }
            >
              {IMAGE_PROVIDER_OPTIONS.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </FormField>
            <FormField
              label="Default image model"
              as="select"
              value={preferences.imageModel}
              onChange={(event) => updatePreferences({ imageModel: event.target.value })}
            >
              {IMAGE_MODELS[preferences.imageProvider].map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </FormField>
          </div>

          <FormField
            label="OpenAI API key"
            type="password"
            value={preferences.providerKeys.openai ?? ''}
            onChange={(event) => updateProviderKey('openai', event.target.value)}
            placeholder="sk-..."
            hint={`Saved locally: ${maskKey(preferences.providerKeys.openai)}`}
          />

          <FormField
            label="Gemini API key"
            type="password"
            value={preferences.providerKeys.gemini ?? ''}
            onChange={(event) => updateProviderKey('gemini', event.target.value)}
            placeholder="AIza..."
            hint={`Saved locally: ${maskKey(preferences.providerKeys.gemini)}`}
          />

          <FormField
            label="Claude API key"
            type="password"
            value={preferences.providerKeys.claude ?? ''}
            onChange={(event) => updateProviderKey('claude', event.target.value)}
            placeholder="sk-ant-..."
            hint={`Saved locally: ${maskKey(preferences.providerKeys.claude)}`}
          />

          <FormField
            label="Grok API key"
            type="password"
            value={preferences.providerKeys.grok ?? ''}
            onChange={(event) => updateProviderKey('grok', event.target.value)}
            placeholder="xai-..."
            hint={`Saved locally: ${maskKey(preferences.providerKeys.grok)}`}
          />

          <div className="form-hint">
            Keys and default models are saved in this browser storage and applied automatically to AI generation requests.
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
              const active = selectedPage?.page_id === page.page_id
              return (
                <li key={page.page_id} className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-title">{page.page_name}</div>
                    <div className="list-item-meta">
                      ID: {page.page_id} | {page.connection_status} | token {page.has_access_token ? 'ready' : 'missing'}
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
