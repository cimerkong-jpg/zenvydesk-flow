export type ContentProvider = 'openai' | 'gemini' | 'claude' | 'grok'
export type ImageProvider = 'openai'
export type ProviderKeyMap = Partial<Record<ContentProvider | ImageProvider, string>>

export type AiPreferences = {
  contentProvider: ContentProvider
  contentModel: string
  imageProvider: ImageProvider
  imageModel: string
  providerKeys: ProviderKeyMap
}

const STORAGE_KEY = 'zenvydesk_ai_preferences'

export const CONTENT_PROVIDER_OPTIONS: ContentProvider[] = ['openai', 'gemini', 'claude', 'grok']
export const IMAGE_PROVIDER_OPTIONS: ImageProvider[] = ['openai']

export const CONTENT_MODELS: Record<ContentProvider, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4.1-mini'],
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  claude: ['claude-3-5-sonnet-20241022', 'claude-3-7-sonnet-20250219'],
  grok: ['grok-2-latest', 'grok-beta'],
}

export const IMAGE_MODELS: Record<ImageProvider, string[]> = {
  openai: ['gpt-image-1'],
}

const DEFAULTS: AiPreferences = {
  contentProvider: 'openai',
  contentModel: 'gpt-4o-mini',
  imageProvider: 'openai',
  imageModel: 'gpt-image-1',
  providerKeys: {},
}

export function loadAiPreferences(): AiPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return DEFAULTS
    }
    const parsed = JSON.parse(raw) as Partial<AiPreferences>
    const contentProvider =
      parsed.contentProvider && CONTENT_PROVIDER_OPTIONS.includes(parsed.contentProvider)
        ? parsed.contentProvider
        : DEFAULTS.contentProvider
    const imageProvider =
      parsed.imageProvider && IMAGE_PROVIDER_OPTIONS.includes(parsed.imageProvider)
        ? parsed.imageProvider
        : DEFAULTS.imageProvider

    return {
      contentProvider,
      contentModel:
        parsed.contentModel && CONTENT_MODELS[contentProvider].includes(parsed.contentModel)
          ? parsed.contentModel
          : CONTENT_MODELS[contentProvider][0],
      imageProvider,
      imageModel:
        parsed.imageModel && IMAGE_MODELS[imageProvider].includes(parsed.imageModel)
          ? parsed.imageModel
          : IMAGE_MODELS[imageProvider][0],
      providerKeys: parsed.providerKeys ?? {},
    }
  } catch {
    return DEFAULTS
  }
}

export function saveAiPreferences(preferences: AiPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
}

export function getProviderKey(
  preferences: AiPreferences,
  provider: ContentProvider | ImageProvider,
): string | null {
  return preferences.providerKeys[provider]?.trim() || null
}
