import { endpointUrls } from '../config'

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
  page_id: string
  page_name: string
  is_active: boolean
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
  page_id: number
  product_id: number | null
  media_url: string | null
  status: string
  is_active: boolean
  created_at: string
  scheduled_time: string | null
}

export type DraftInput = {
  content: string
  page_id: number
  product_id?: number | null
  media_url?: string | null
  scheduled_time?: string | null
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
  name: string
  content_type: string | null
  auto_post: boolean
  scheduled_time: string
  product_selection_mode: string | null
  is_active: boolean
  created_at: string
}

export type AutomationRuleInput = {
  page_id: number
  name: string
  content_type?: string | null
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

const get = <T>(url: string): Promise<T> => fetch(url).then(parseJson<T>)

const postJson = <T>(url: string, body?: unknown): Promise<T> =>
  fetch(url, {
    method: 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then(parseJson<T>)

/* ================================
   Health
   ================================ */

export const fetchHealth = (): Promise<HealthResponse> => get<HealthResponse>(endpointUrls.health)

/* ================================
   Facebook
   ================================ */

export const fetchPages = (): Promise<PageResponse[]> =>
  get<PageResponse[]>(endpointUrls.facebookPages)

export const getFacebookLoginUrl = (): string => endpointUrls.facebookLogin

export const runScheduledPost = (mockMode: boolean): Promise<ScheduledRunResponse> =>
  postJson<ScheduledRunResponse>(`${endpointUrls.scheduledRun}?mock_mode=${mockMode}`)

/* ================================
   Products
   ================================ */

export const fetchProducts = (): Promise<Product[]> => get<Product[]>(endpointUrls.products)

export const createProduct = (input: ProductInput): Promise<Product> =>
  postJson<Product>(endpointUrls.products, input)

/* ================================
   Content Library
   ================================ */

export const fetchContentLibrary = (): Promise<ContentLibraryItem[]> =>
  get<ContentLibraryItem[]>(endpointUrls.contentLibrary)

export const createContentLibraryItem = (
  input: ContentLibraryInput,
): Promise<ContentLibraryItem> => postJson<ContentLibraryItem>(endpointUrls.contentLibrary, input)

/* ================================
   Drafts
   ================================ */

export const fetchDrafts = (): Promise<Draft[]> => get<Draft[]>(endpointUrls.drafts)

export const createDraft = (input: DraftInput): Promise<Draft> =>
  postJson<Draft>(endpointUrls.drafts, input)

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

export const runAutomation = (ruleId: number): Promise<AutomationRunResult> =>
  postJson<AutomationRunResult>(`${endpointUrls.automationRunner}/run/${ruleId}`)
