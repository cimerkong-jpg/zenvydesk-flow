import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FormField } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
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
import { MARKET_OPTIONS, type MarketCode } from '../lib/markets'

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
  const { t } = useTranslation()
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
      .then(() => toast.success(t('settingsPage.backend.copied', { label })))
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
      toast.success(t('settingsPage.keys.keySaved', { provider: PROVIDER_LABELS[activeEditor] }))
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
      toast.success(t('settingsPage.keys.keyRemoved', { provider: PROVIDER_LABELS[provider] }))
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
      <PageHeader title={t('settingsPage.title')} description={t('settingsPage.description')} />

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{t('settingsPage.backend.title')}</h3>
          <button className="btn btn-ghost btn-sm" onClick={runHealthCheck}>
            {t('common.refresh')}
          </button>
        </div>
        <div className="info-grid">
          <div className="info-row">
            <div className="info-label">{t('settingsPage.backend.apiBaseUrl')}</div>
            <div className="info-value">
              <code>{apiBaseUrl}</code>
              <button className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(apiBaseUrl, t('settingsPage.backend.apiBaseUrl'))}>
                {t('settingsPage.backend.copy')}
              </button>
            </div>
          </div>
          <div className="info-row">
            <div className="info-label">{t('settingsPage.backend.health')}</div>
            <div className="info-value">
              {health === 'loading' && t('settingsPage.backend.checking')}
              {health === 'ok' && t('settingsPage.backend.online')}
              {health === 'down' && t('settingsPage.backend.offline')}
            </div>
          </div>
          {checkedAt ? (
            <div className="info-row">
              <div className="info-label">{t('settingsPage.backend.lastChecked')}</div>
              <div className="info-value">{checkedAt.toLocaleTimeString()}</div>
            </div>
          ) : null}
        </div>
      </div>

      {user?.role === 'admin' || user?.role === 'super_admin' ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('settingsPage.runtime.title')}</h3>
            <button className="btn btn-ghost btn-sm" onClick={loadRuntime}>
              {t('settingsPage.runtime.reload')}
            </button>
          </div>
          {runtimeError ? (
            <div className="alert alert-error">
              <div className="alert-content">
                <div className="alert-title">{t('settingsPage.runtime.failed')}</div>
                <div className="alert-message">{runtimeError}</div>
              </div>
            </div>
          ) : runtime ? (
            <div className="info-grid">
              <div className="info-row">
                <div className="info-label">{t('settingsPage.runtime.environment')}</div>
                <div className="info-value">{runtime.app_env}</div>
              </div>
              <div className="info-row">
                <div className="info-label">{t('settingsPage.runtime.frontendTarget')}</div>
                <div className="info-value">{runtime.frontend_base_url}</div>
              </div>
              <div className="info-row">
                <div className="info-label">{t('settingsPage.runtime.aiProvider')}</div>
                <div className="info-value">
                  {runtime.ai_provider} / {runtime.ai_model}
                </div>
              </div>
              <div className="info-row">
                <div className="info-label">{t('settingsPage.runtime.aiStatus')}</div>
                <div className="info-value">{runtime.ai_configured ? t('settingsPage.runtime.configured') : t('settingsPage.runtime.missing')}</div>
              </div>
              <div className="info-row">
                <div className="info-label">{t('settingsPage.runtime.imageProvider')}</div>
                <div className="info-value">
                  {runtime.image_provider} / {runtime.image_model}
                </div>
              </div>
              <div className="info-row">
                <div className="info-label">{t('settingsPage.runtime.imageStatus')}</div>
                <div className="info-value">{runtime.image_configured ? t('settingsPage.runtime.configured') : t('settingsPage.runtime.missing')}</div>
              </div>
            </div>
          ) : (
            <div className="text-muted">{t('settingsPage.runtime.loading')}</div>
          )}
        </div>
      ) : null}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{t('settingsPage.preferences.title')}</h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              saveAiPreferences(preferences)
              toast.success(t('settingsPage.preferences.saved'))
            }}
          >
            {t('common.save')}
          </button>
        </div>
        <div className="form-stack">
          <div className="creative-grid-2">
            <FormField
              label={t('settingsPage.preferences.defaultMarket')}
              as="select"
              value={preferences.market}
              onChange={(event) => updatePreferences({ market: event.target.value as MarketCode })}
            >
              {MARKET_OPTIONS.map((market) => (
                <option key={market} value={market}>
                  {t(`common.markets.${market}`)}
                </option>
              ))}
            </FormField>
            <FormField
              label={t('settingsPage.preferences.defaultProvider')}
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
          </div>
          <div className="creative-grid-2">
            <FormField
              label={t('settingsPage.preferences.defaultModel')}
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
          <div className="form-hint">{t('settingsPage.preferences.hint')}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{t('settingsPage.keys.title')}</h3>
        </div>
        <div className="form-stack">
          <div className="form-hint">{t('settingsPage.keys.hint')}</div>

          {keysLoading ? (
            <div className="text-muted">{t('settingsPage.keys.loading')}</div>
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
                        {t('settingsPage.keys.source')}: {item?.source ?? t('settingsPage.keys.sourceMissing')} | {t('settingsPage.keys.status')}:{' '}
                        {item?.validation_status ?? t('settingsPage.keys.statusMissing')} | {item?.key_hint ?? t('settingsPage.keys.noKey')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className={`badge ${item?.is_configured ? 'badge-success' : 'badge-warning'}`}>
                        {item?.is_configured ? t('settingsPage.keys.configured') : t('settingsPage.keys.notConfigured')}
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setActiveEditor(provider)
                          setDraftKey('')
                        }}
                      >
                        {item?.source === 'user' ? t('settingsPage.keys.update') : t('settingsPage.keys.add')}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => void removeProviderKey(provider)}
                        disabled={deletingProvider === provider || item?.source !== 'user'}
                      >
                        {deletingProvider === provider ? t('settingsPage.keys.removing') : t('settingsPage.keys.delete')}
                      </button>
                    </div>
                    {isEditing ? (
                      <div style={{ width: '100%', marginTop: '12px' }}>
                        <FormField
                          label={`${PROVIDER_LABELS[provider]} API key`}
                          type="password"
                          value={draftKey}
                          onChange={(event) => setDraftKey(event.target.value)}
                          placeholder={PROVIDER_PLACEHOLDERS[provider]}
                          hint={t('settingsPage.keys.savedHint')}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => void saveProviderKey()}
                            disabled={savingProvider === provider || !draftKey.trim()}
                          >
                            {savingProvider === provider ? t('settingsPage.keys.saving') : t('settingsPage.keys.saveKey')}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setActiveEditor(null)
                              setDraftKey('')
                            }}
                            disabled={savingProvider === provider}
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{t('settingsPage.defaultPage.title')}</h3>
        </div>
        {pages.length === 0 ? (
          <div className="info-row">
            <div className="info-label">{t('settingsPage.defaultPage.none')}</div>
            <div className="info-value text-muted">{t('settingsPage.defaultPage.noneDescription')}</div>
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
                      ID: {page.facebook_page_id} | {page.connection_status} | token{' '}
                      {page.has_access_token ? t('settingsPage.defaultPage.tokenReady') : t('settingsPage.defaultPage.tokenMissing')}
                    </div>
                  </div>
                  {active ? (
                    <span className="badge badge-success">{t('settingsPage.defaultPage.selected')}</span>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        void setSelectedPage(page).then(() => {
                          toast.success(t('settingsPage.defaultPage.setDefault', { name: page.page_name }))
                        })
                      }}
                    >
                      {t('settingsPage.defaultPage.makeDefault')}
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
