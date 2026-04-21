const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

export const apiBaseUrl = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
)

export const endpointPaths = {
  health: '/health',
  facebookLogin: '/api/v1/auth/facebook/login',
  facebookCallback: '/api/v1/auth/facebook/callback',
  scheduledRun: '/api/v1/test/run-scheduled',
} as const

export const endpointUrls = {
  health: `${apiBaseUrl}${endpointPaths.health}`,
  facebookLogin: `${apiBaseUrl}${endpointPaths.facebookLogin}`,
  facebookCallback: `${apiBaseUrl}${endpointPaths.facebookCallback}`,
  scheduledRun: `${apiBaseUrl}${endpointPaths.scheduledRun}`,
} as const
