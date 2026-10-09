import { clearTokens, emitSessionExpired, getTokens, setTokens } from './auth'
import type { Paginated } from '../types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export type QueryValue = string | number | boolean | undefined | null
export type QueryParams = Record<string, QueryValue>

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function buildUrl(path: string, query?: QueryParams): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const url = `${BASE_URL}${normalized}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

async function extractDetail(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json()
    if (data && typeof data === 'object' && 'detail' in data) {
      const detail = (data as { detail: unknown }).detail
      if (typeof detail === 'string') return detail
      if (Array.isArray(detail)) {
        return detail
          .map((item) => {
            if (item && typeof item === 'object' && 'msg' in item) {
              return String((item as { msg: unknown }).msg)
            }
            return String(item)
          })
          .join(', ')
      }
      if (detail) return JSON.stringify(detail)
    }
    return `Xato: ${response.status}`
  } catch {
    return `Xato: ${response.status}`
  }
}

let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const tokens = getTokens()
    if (!tokens) return false
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: tokens.refresh_token }),
      })
      if (!response.ok) return false
      const data = (await response.json()) as { access_token?: string }
      if (!data.access_token) return false
      setTokens({ access_token: data.access_token, refresh_token: tokens.refresh_token })
      return true
    } catch {
      return false
    }
  })().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: QueryParams
  retryOn401?: boolean
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const { method, body, query, retryOn401 = true } = options
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const tokens = getTokens()
  if (tokens) headers['Authorization'] = `Bearer ${tokens.access_token}`

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Server bilan aloqa uzildi')
  }

  if (response.status === 401 && retryOn401 && getTokens()) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      return request<T>(path, { ...options, retryOn401: false })
    }
    clearTokens()
    emitSessionExpired()
    throw new ApiError(401, 'Sessiya muddati tugadi')
  }

  if (!response.ok) {
    throw new ApiError(response.status, await extractDetail(response))
  }

  if (response.status === 204) return undefined as T
  const text = await response.text()
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError(response.status, 'Noto\'g\'ri javob formati')
  }
}

export function apiGet<T>(path: string, query?: QueryParams): Promise<T> {
  return request<T>(path, { method: 'GET', query })
}

export function apiPost<T>(path: string, body?: unknown, query?: QueryParams): Promise<T> {
  return request<T>(path, { method: 'POST', body, query })
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'PATCH', body })
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body })
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' })
}

export async function fetchPage<T>(
  path: string,
  query?: QueryParams,
): Promise<Paginated<T>> {
  const data = await apiGet<unknown>(path, query)
  const partial = (data ?? {}) as Partial<Paginated<T>>
  const items = Array.isArray(partial.items) ? partial.items : []
  const requestedPage = typeof query?.page === 'number' ? query.page : 1
  const requestedSize = typeof query?.page_size === 'number' ? query.page_size : 20
  const total = typeof partial.total === 'number' ? partial.total : items.length
  const page = typeof partial.page === 'number' ? partial.page : requestedPage
  const pageSize =
    typeof partial.page_size === 'number' ? partial.page_size : requestedSize
  const pages =
    typeof partial.pages === 'number' && partial.pages > 0
      ? partial.pages
      : Math.max(1, Math.ceil(total / pageSize))
  return { items, total, page, page_size: pageSize, pages }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Noma\'lum xatolik'
}
