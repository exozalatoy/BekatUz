const STORAGE_KEY = 'bekat_uz_admin_tokens'

export interface TokenPair {
  access_token: string
  refresh_token: string
}

const listeners = new Set<() => void>()

export function getTokens(): TokenPair | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<TokenPair>
    if (!parsed.access_token || !parsed.refresh_token) return null
    return { access_token: parsed.access_token, refresh_token: parsed.refresh_token }
  } catch {
    return null
  }
}

export function setTokens(tokens: TokenPair): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function getAccessToken(): string | null {
  return getTokens()?.access_token ?? null
}

export function onSessionExpired(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitSessionExpired(): void {
  listeners.forEach((listener) => listener())
}
