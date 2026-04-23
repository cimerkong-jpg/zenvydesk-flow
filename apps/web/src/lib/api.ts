import { endpointUrls } from '../config'
import type { MarketCode } from './markets'

/* ================================
   Response types
   ================================ */

export type HealthResponse = {
  status: string
}

export type ScheduledRunResponse = {
  success: boolean
  processed_count: number
  posted_count: number
  failed_count: number
  skipped_count: number
  errors: Array<Record<string, string>>
}

export type PageResponse = {
  id: number
  facebook_page_id: string
  page_name: string
  category: string | null
  tasks: string | null
  is_active: boolean
  is_selected: boolean
  has_access_token: boolean
  connection_status: string
}

export type AuthUser = {
  id: number
  email: string
  full_name: string | null
  role: 'super_admin' | 'admin' | 'member'
  status: 'active' | 'inactive' | 'suspended'
  is_email_verified: boolean
  last_login_at: string | null
  created_at: string
}

export type AuthResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  user: AuthUser
}

export type FacebookPagesResponse = {
  connected: boolean
  provider_user_id: string | null
  pages: PageResponse[]
}

export type UserListResponse = {
  items: AuthUser[]
  total: number
}

export type Product = {
  id: number
  user_id: number
  name: string
  description: string | null
  price: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
}

export type ProductInput = {
  name: string
  description?: string | null
  price?: string | null
  image_url?: string | null
}

export type ContentLibraryItem = {
  id: number
  user_id: number
  title: string | null
  content: string
  content_type: string | null
  is_active: boolean
  created_at: string
}

export type ContentLibraryInput = {
  title?: string | null
  content: string
  content_type?: string | null
}

export type Draft = {
  id: number
  user_id: number
  content: string
  page_id: number | null
  product_id: number | null
  content_library_id: number | null
  media_url: string | null
  status: string
  is_active: boolean
  created_at: string
  scheduled_time: string | null
}

export type DraftInput = {
  content: string
  page_id?: number | null
  product_id?: number | null
  content_library_id?: number | null
  media_url?: string | null
  scheduled_time?: string | null
}

export type DraftGenerateInput = {
  product_id: number
  content_library_id?: number | null
  market?: MarketCode
  tone?: string
  language?: string
  style?: string
  ai_provider?: string | null
  ai_model?: string | null
  ai_api_key?: string | null
  ai_base_url?: string | null
  image_provider?: string | null
  image_model?: string | null
  image_api_key?: string | null
  image_base_url?: string | null
}

export type GenerateContentInput = {
  product_id: number
  content_library_id?: number | null
  market?: MarketCode
  user_prompt: string
}

export type DraftGenerateResponse = {
  content: string
  media_url: string | null
}

export type CreativeGenerateResponse = DraftGenerateResponse & {
  ai_provider: string
  ai_model: string
  image_provider: string
  image_model: string
}

export type RuntimeSettings = {
  app_env: string
  app_base_url: string
  frontend_base_url: string
  ai_provider: string
  ai_model: string
  ai_configured: boolean
  manager_ai_enabled: boolean
  execution_openai_fallback_available: boolean
  image_provider: string
  image_model: string
  image_configured: boolean
}

export type UserAiKeyStatus = {
  provider: 'openai' | 'gemini' | 'claude' | 'grok'
  is_configured: boolean
  key_hint: string | null
  validation_status: string | null
  last_validated_at: string | null
  source: 'user' | 'env' | 'missing'
}

export type UserAiKeyListResponse = {
  items: UserAiKeyStatus[]
}

export type PostHistory = {
  id: number
  user_id: number
  content: string
  page_id: number
  draft_id: number | null
  media_url: string | null
  post_status: string
  error_message: string | null
  posted_at: string
}

export type PostHistoryInput = {
  content: string
  page_id: number
  draft_id?: number | null
  media_url?: string | null
  post_status: string
  error_message?: string | null
}

export type AutomationRule = {
  id: number
  user_id: number
  page_id: number
  product_id: number | null
  content_library_id: number | null
  name: string
  content_type: string | null
  market: MarketCode | null
  tone: string | null
  language: string | null
  style: string | null
  auto_post: boolean
  scheduled_time: string
  product_selection_mode: string | null
  is_active: boolean
  created_at: string
}

export type AutomationRuleInput = {
  page_id: number
  name: string
  product_id?: number | null
  content_library_id?: number | null
  content_type?: string | null
  market?: MarketCode | null
  tone?: string | null
  language?: string | null
  style?: string | null
  auto_post?: boolean
  scheduled_time: string
  product_selection_mode?: string | null
}

export type AutomationRunResult = {
  rule_id: number
  draft_id: number | null
  post_history_id: number | null
  status: 'draft_created' | 'posted' | 'generation_failed' | string
  provider: string
  model: string
  error: string | null
}

/* ================================
   Low-level fetch helpers
   ================================ */

const parseJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      detail = body?.detail ?? body?.message ?? JSON.stringify(body)
    } catch {
      detail = await response.text()
    }
    throw new Error(`HTTP ${response.status}${detail ? ` — ${detail}` : ''}`)
  }

  if (response.status === 204) {
    return undefined as unknown as T
  }

  return response.json() as Promise<T>
}

const ACCESS_TOKEN_KEY = 'zenvydesk_access_token'
const REFRESH_TOKEN_KEY = 'zenvydesk_refresh_token'

export const getStoredAuthToken = (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY)

export const getStoredRefreshToken = (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY)

export const setStoredAuthTokens = (accessToken: string | null, refreshToken: string | null) => {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

const authHeaders = (headers?: HeadersInit): HeadersInit => {
  const token = getStoredAuthToken()
  if (!token) {
    return headers ?? {}
  }
  return {
    ...(headers ?? {}),
    Authorization: `Bearer ${token}`,
  }
}

const get = <T>(url: string): Promise<T> =>
  fetch(url, { headers: authHeaders() }).then(parseJson<T>)

const postJson = <T>(url: string, body?: unknown): Promise<T> =>
  fetch(url, {
    method: 'POST',
    headers:
      body === undefined
        ? authHeaders()
        : authHeaders({ 'Content-Type': 'application/json' }),
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then(parseJson<T>)

/* ================================
   Auth
   ================================ */

export const login = (email: string, password: string): Promise<AuthResponse> =>
  postJson<AuthResponse>(endpointUrls.authLogin, { email, password })

export const register = (
  email: string,
  password: string,
  fullName: string,
): Promise<AuthResponse> =>
  postJson<AuthResponse>(endpointUrls.authRegister, {
    email,
    password,
    full_name: fullName,
  })

export const fetchCurrentUser = (): Promise<AuthUser> => get<AuthUser>(endpointUrls.authMe)

export const forgotPassword = (
  email: string,
): Promise<{ message: string; reset_token?: string | null }> =>
  postJson(endpointUrls.authForgotPassword, { email })

export const resetPassword = (token: string, password: string): Promise<{ message: string }> =>
  postJson(endpointUrls.authResetPassword, { token, password })

export const logout = (): Promise<{ message: string }> =>
  postJson<{ message: string }>(endpointUrls.authLogout, {
    refresh_token: getStoredRefreshToken(),
  })

/* ================================
   Health
   ================================ */

export const fetchHealth = (): Promise<HealthResponse> => get<HealthResponse>(endpointUrls.health)

export const fetchRuntimeSettings = (): Promise<RuntimeSettings> =>
  get<RuntimeSettings>(endpointUrls.settingsRuntime)

export const fetchUserAiKeys = (): Promise<UserAiKeyListResponse> =>
  get<UserAiKeyListResponse>(endpointUrls.settingsAiKeys)

export const upsertUserAiKey = (
  provider: UserAiKeyStatus['provider'],
  apiKey: string,
): Promise<UserAiKeyStatus> =>
  fetch(`${endpointUrls.settingsAiKeys}/${provider}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ api_key: apiKey }),
  }).then(parseJson<UserAiKeyStatus>)

export const deleteUserAiKey = (provider: UserAiKeyStatus['provider']): Promise<{ message: string }> =>
  fetch(`${endpointUrls.settingsAiKeys}/${provider}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(parseJson<{ message: string }>)

export const fetchUsers = (params?: {
  keyword?: string
  role?: string
  status?: string
}): Promise<UserListResponse> => {
  const query = new URLSearchParams()
  if (params?.keyword) query.set('keyword', params.keyword)
  if (params?.role) query.set('role', params.role)
  if (params?.status) query.set('status', params.status)
  const suffix = query.toString()
  return get<UserListResponse>(suffix ? `${endpointUrls.adminUsers}/?${suffix}` : `${endpointUrls.adminUsers}/`)
}

export const createUser = (input: {
  email: string
  password: string
  full_name: string
  role: string
  status: string
}): Promise<AuthUser> => postJson<AuthUser>(endpointUrls.adminUsers, input)

export const updateUser = (
  id: number,
  input: { email?: string; full_name?: string },
): Promise<AuthUser> =>
  fetch(`${endpointUrls.adminUsers}/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  }).then(parseJson<AuthUser>)

export const updateUserRole = (id: number, role: string): Promise<AuthUser> =>
  fetch(`${endpointUrls.adminUsers}/${id}/role`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ role }),
  }).then(parseJson<AuthUser>)

export const updateUserStatus = (id: number, statusValue: string): Promise<AuthUser> =>
  fetch(`${endpointUrls.adminUsers}/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status: statusValue }),
  }).then(parseJson<AuthUser>)

export const adminResetPassword = (id: number, password: string): Promise<{ message: string }> =>
  postJson<{ message: string }>(`${endpointUrls.adminUsers}/${id}/reset-password`, { password })

/* ================================
   Facebook
   ================================ */

export const fetchPages = (): Promise<FacebookPagesResponse> =>
  get<FacebookPagesResponse>(endpointUrls.facebookPages)

export const selectFacebookPage = (pageId: string): Promise<PageResponse> =>
  postJson<PageResponse>(endpointUrls.facebookSelectPage, { facebook_page_id: pageId })

export const startFacebookConnection = (): Promise<{ authorization_url: string; state: string }> =>
  get(endpointUrls.facebookConnectStart)

export const disconnectFacebook = (): Promise<{ message: string }> =>
  postJson(endpointUrls.facebookDisconnect)

export const runScheduledPost = (mockMode: boolean): Promise<ScheduledRunResponse> =>
  postJson<ScheduledRunResponse>(`${endpointUrls.scheduledRun}?mock_mode=${mockMode}`)

/* ================================
   Products
   ================================ */

export const fetchProducts = (): Promise<Product[]> => get<Product[]>(endpointUrls.products)

export const createProduct = (input: ProductInput): Promise<Product> =>
  postJson<Product>(endpointUrls.products, input)

export const updateProduct = (id: number, input: ProductInput): Promise<Product> =>
  fetch(`${endpointUrls.products}/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  }).then(parseJson<Product>)

export const deleteProduct = (id: number): Promise<void> =>
  fetch(`${endpointUrls.products}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(parseJson<void>)

/* ================================
   Content Library
   ================================ */

export const fetchContentLibrary = (): Promise<ContentLibraryItem[]> =>
  get<ContentLibraryItem[]>(endpointUrls.contentLibrary)

export const createContentLibraryItem = (
  input: ContentLibraryInput,
): Promise<ContentLibraryItem> => postJson<ContentLibraryItem>(endpointUrls.contentLibrary, input)

export const updateContentLibraryItem = (
  id: number,
  input: ContentLibraryInput,
): Promise<ContentLibraryItem> =>
  fetch(`${endpointUrls.contentLibrary}/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  }).then(parseJson<ContentLibraryItem>)

export const deleteContentLibraryItem = (id: number): Promise<void> =>
  fetch(`${endpointUrls.contentLibrary}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(parseJson<void>)

/* ================================
   Drafts
   ================================ */

export const fetchDrafts = (): Promise<Draft[]> => get<Draft[]>(endpointUrls.drafts)

export const createDraft = (input: DraftInput): Promise<Draft> =>
  postJson<Draft>(endpointUrls.drafts, input)

export const updateDraft = (id: number, input: DraftInput): Promise<Draft> =>
  fetch(`${endpointUrls.drafts}/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  }).then(parseJson<Draft>)

export const deleteDraft = (id: number): Promise<void> =>
  fetch(`${endpointUrls.drafts}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(parseJson<void>)

export const generateDraft = (input: DraftGenerateInput): Promise<DraftGenerateResponse> =>
  postJson<DraftGenerateResponse>(`${endpointUrls.drafts}/generate`, input)

export const generateDraftImage = (input: DraftGenerateInput): Promise<DraftGenerateResponse> =>
  postJson<DraftGenerateResponse>(`${endpointUrls.drafts}/generate-image`, input)

export const generateContent = (
  input: GenerateContentInput,
): Promise<CreativeGenerateResponse> =>
  postJson<CreativeGenerateResponse>(`${endpointUrls.creative}/generate`, input)

/* ================================
   Post History
   ================================ */

export const fetchPostHistory = (): Promise<PostHistory[]> =>
  get<PostHistory[]>(endpointUrls.postHistory)

export const createPostHistory = (input: PostHistoryInput): Promise<PostHistory> =>
  postJson<PostHistory>(endpointUrls.postHistory, input)

/* ================================
   Posting
   ================================ */

export const postFromDraft = (draftId: number): Promise<PostHistory> =>
  postJson<PostHistory>(`${endpointUrls.posting}/from-draft/${draftId}`)

/* ================================
   Schedules
   ================================ */

export const fetchSchedules = (): Promise<Draft[]> => get<Draft[]>(endpointUrls.schedules)

export const scheduleDraft = (draftId: number, scheduledTime: string): Promise<Draft> =>
  postJson<Draft>(`${endpointUrls.schedules}/${draftId}`, { scheduled_time: scheduledTime })

/* ================================
   Automation Rules
   ================================ */

export const fetchAutomationRules = (): Promise<AutomationRule[]> =>
  get<AutomationRule[]>(endpointUrls.automationRules)

export const createAutomationRule = (input: AutomationRuleInput): Promise<AutomationRule> =>
  postJson<AutomationRule>(endpointUrls.automationRules, input)

export const updateAutomationRule = (
  ruleId: number,
  input: AutomationRuleInput,
): Promise<AutomationRule> =>
  fetch(`${endpointUrls.automationRules}/${ruleId}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  }).then(parseJson<AutomationRule>)

export const deleteAutomationRule = (ruleId: number): Promise<void> =>
  fetch(`${endpointUrls.automationRules}/${ruleId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(parseJson<void>)

export const runAutomation = (ruleId: number): Promise<AutomationRunResult> =>
  postJson<AutomationRunResult>(`${endpointUrls.automationRunner}/run/${ruleId}`)
