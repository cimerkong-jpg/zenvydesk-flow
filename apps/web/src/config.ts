const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

export const apiBaseUrl = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || 'https://api.zenvydesk.site',
)

export const endpointUrls = {
  health: `${apiBaseUrl}/api/v1/health`,
  facebookPages: `${apiBaseUrl}/api/v1/connections/facebook/pages`,
  facebookConnectStart: `${apiBaseUrl}/api/v1/connections/facebook/start`,
  facebookSelectPage: `${apiBaseUrl}/api/v1/connections/facebook/select-page`,
  facebookDisconnect: `${apiBaseUrl}/api/v1/connections/facebook/disconnect`,
  scheduledRun: `${apiBaseUrl}/api/v1/test/run-scheduled`,
  facebookLogin: `${apiBaseUrl}/api/v1/auth/facebook/login`,
  authLogin: `${apiBaseUrl}/api/v1/auth/login`,
  authRegister: `${apiBaseUrl}/api/v1/auth/register`,
  authMe: `${apiBaseUrl}/api/v1/auth/me`,
  authRefresh: `${apiBaseUrl}/api/v1/auth/refresh`,
  authLogout: `${apiBaseUrl}/api/v1/auth/logout`,
  authForgotPassword: `${apiBaseUrl}/api/v1/auth/forgot-password`,
  authResetPassword: `${apiBaseUrl}/api/v1/auth/reset-password`,
  authChangePassword: `${apiBaseUrl}/api/v1/auth/change-password`,
  adminUsers: `${apiBaseUrl}/api/v1/admin/users`,
  products: `${apiBaseUrl}/api/v1/products`,
  contentLibrary: `${apiBaseUrl}/api/v1/content-library`,
  drafts: `${apiBaseUrl}/api/v1/drafts`,
  postHistory: `${apiBaseUrl}/api/v1/post-history`,
  posting: `${apiBaseUrl}/api/v1/posting`,
  schedules: `${apiBaseUrl}/api/v1/schedules`,
  automationRules: `${apiBaseUrl}/api/v1/automation-rules`,
  automationRunner: `${apiBaseUrl}/api/v1/automation-runner`,
  settingsRuntime: `${apiBaseUrl}/api/v1/settings/runtime`,
  creative: `${apiBaseUrl}/api/v1/creative`,
}
