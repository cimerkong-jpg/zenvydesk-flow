const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

export const apiBaseUrl = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || 'https://api.zenvydesk.site',
)

export const endpointUrls = {
  health: `${apiBaseUrl}/api/v1/health`,
  facebookPages: `${apiBaseUrl}/api/v1/facebook/pages`,
  scheduledRun: `${apiBaseUrl}/api/v1/test/run-scheduled`,
  facebookLogin: `${apiBaseUrl}/api/v1/auth/facebook/login`,
}
