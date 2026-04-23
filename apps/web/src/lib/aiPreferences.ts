export type AIProvider = 'openai' | 'gemini' | 'claude' | 'grok'
export type ProviderKeyMap = Partial<Record<AIProvider, string>>

export type AiPreferences = {
  provider: AIProvider
  model: string
  providerKeys: ProviderKeyMap
}

type LegacyAiPreferences = Partial<AiPreferences> & {
  contentProvider?: AIProvider
  contentModel?: string
}

const STORAGE_KEY = 'zenvydesk_ai_preferences'

export const AI_PROVIDER_OPTIONS: AIProvider[] = ['openai', 'gemini', 'claude', 'grok']

export const AI_MODELS: Record<AIProvider, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4.1-mini'],
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  claude: ['claude-3-5-sonnet-20241022', 'claude-3-7-sonnet-20250219'],
  grok: ['grok-2-latest', 'grok-beta'],
}

const DEFAULTS: AiPreferences = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  providerKeys: {},
}

export function loadAiPreferences(): AiPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return DEFAULTS
    }

    const parsed = JSON.parse(raw) as LegacyAiPreferences
    const providerCandidate = parsed.provider ?? parsed.contentProvider
    const provider =
      providerCandidate && AI_PROVIDER_OPTIONS.includes(providerCandidate)
        ? providerCandidate
        : DEFAULTS.provider
    const modelCandidate = parsed.model ?? parsed.contentModel

    return {
      provider,
      model:
        modelCandidate && AI_MODELS[provider].includes(modelCandidate)
          ? modelCandidate
          : AI_MODELS[provider][0],
      providerKeys: parsed.providerKeys ?? {},
    }
  } catch {
    return DEFAULTS
  }
}

export function saveAiPreferences(preferences: AiPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
}

export function getProviderKey(preferences: AiPreferences, provider: AIProvider): string | null {
  return preferences.providerKeys[provider]?.trim() || null
}
