const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

export const apiBaseUrl = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || 'https://api.zenvydesk.site',
)

export const endpointUrls = {
  health: `${apiBaseUrl}/api/v1/health`,
  facebookPages: `${apiBaseUrl}/api/v1/facebook/pages`,
  scheduledRun: `${apiBaseUrl}/api/v1/test/run-scheduled`,
  facebookLogin: `${apiBaseUrl}/api/v1/auth/facebook/login`,
  products: `${apiBaseUrl}/api/v1/products`,
  contentLibrary: `${apiBaseUrl}/api/v1/content-library`,
  drafts: `${apiBaseUrl}/api/v1/drafts`,
  postHistory: `${apiBaseUrl}/api/v1/post-history`,
  posting: `${apiBaseUrl}/api/v1/posting`,
  schedules: `${apiBaseUrl}/api/v1/schedules`,
  automationRules: `${apiBaseUrl}/api/v1/automation-rules`,
  automationRunner: `${apiBaseUrl}/api/v1/automation-runner`,
  settingsRuntime: `${apiBaseUrl}/api/v1/settings/runtime`,
}
