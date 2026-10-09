export const API_BASE: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000/api/v1'

export type Tokens = { access: string; refresh: string } | null

export type AuthBridge = {
  get: () => Tokens
  set: (tokens: Tokens) => void
  onExpired: () => void
}

let bridge: AuthBridge | null = null

export function configureAuth(next: AuthBridge): void {
  bridge = next
}

function fallbackTokens(): Tokens {
  try {
    const raw = window.localStorage.getItem('bekat-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      state?: { accessToken?: string | null; refreshToken?: string | null }
    }
    const access = parsed.state?.accessToken
    const refresh = parsed.state?.refreshToken
    return access && refresh ? { access, refresh } : null
  } catch {
    return null
  }
}

export function getTokens(): Tokens {
  return bridge ? bridge.get() : fallbackTokens()
}

export class ApiError extends Error {
  readonly status: number
  readonly detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>

type RequestOptions = {
  body?: unknown
  query?: QueryParams
  retry?: boolean
}

function buildUrl(path: string, query?: QueryParams): string {
  const qs = query
    ? Object.entries(query)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&')
    : ''
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`
}

async function parseError(response: Response): Promise<ApiError> {
  let detail = response.statusText || `HTTP ${response.status}`
  try {
    const data = (await response.json()) as { detail?: unknown }
    if (typeof data.detail === 'string') {
      detail = data.detail
    } else if (Array.isArray(data.detail)) {
      detail = data.detail
        .map((entry) => {
          if (entry && typeof entry === 'object' && 'msg' in entry) {
            return String((entry as { msg: unknown }).msg)
          }
          return String(entry)
        })
        .join(', ')
    }
  } catch {
    void 0
  }
  return new ApiError(response.status, detail)
}

let refreshing: Promise<string | null> | null = null

async function refreshAccess(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const tokens = getTokens()
        if (!tokens) return null
        const response = await fetch(buildUrl('/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: tokens.refresh }),
        })
        if (!response.ok) return null
        const data = (await response.json()) as { access_token: string }
        bridge?.set({ access: data.access_token, refresh: tokens.refresh })
        return data.access_token
      } catch {
        return null
      } finally {
        refreshing = null
      }
    })()
  }
  return refreshing
}

function expireSession(): void {
  bridge?.set(null)
  bridge?.onExpired()
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const tokens = getTokens()
  if (tokens) headers.Authorization = `Bearer ${tokens.access}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'network_error')
  }

  const isAuthPath = path.startsWith('/auth/')

  if (response.status === 401 && !isAuthPath && options.retry !== false) {
    const access = await refreshAccess()
    if (access) return request<T>(method, path, { ...options, retry: false })
    expireSession()
    throw new ApiError(401, 'session_expired')
  }

  if (!response.ok) throw await parseError(response)

  if (response.status === 204) return undefined as T
  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export const api = {
  get: <T>(path: string, query?: QueryParams): Promise<T> => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown): Promise<T> => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, { body }),
  del: <T>(path: string): Promise<T> => request<T>('DELETE', path),
}
