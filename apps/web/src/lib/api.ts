import { endpointUrls } from '../config'

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

const parseJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const fetchHealth = async (): Promise<HealthResponse> => {
  const response = await fetch(endpointUrls.health)
  return parseJson<HealthResponse>(response)
}

export const runScheduledPost = async (mockMode: boolean): Promise<ScheduledRunResponse> => {
  const response = await fetch(`${endpointUrls.scheduledRun}?mock_mode=${mockMode}`, {
    method: 'POST',
  })

  return parseJson<ScheduledRunResponse>(response)
}

export const fetchPages = async (): Promise<PageResponse[]> => {
  const response = await fetch(endpointUrls.facebookPages)
  return parseJson<PageResponse[]>(response)
}

export const getFacebookLoginUrl = (): string => endpointUrls.facebookLogin
