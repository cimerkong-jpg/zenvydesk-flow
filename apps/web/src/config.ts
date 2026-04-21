export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const endpointUrls = {
  health: `${apiBaseUrl}/health`,
  scheduledRun: `${apiBaseUrl}/api/v1/test/run-scheduled`,
  facebookLogin: `${apiBaseUrl}/api/v1/auth/facebook/login`,
}
