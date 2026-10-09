import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, configureAuth, type Tokens } from '../lib/api'
import type { AuthResponse, RegisterBody, RegisterResponse, User } from '../lib/types'

type AuthStore = {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  setSession: (response: AuthResponse) => void
  setTokens: (tokens: Tokens) => void
  setUser: (user: User) => void
  clearSession: () => void
  login: (identifier: string, password: string, remember?: boolean) => Promise<User>
  register: (body: RegisterBody) => Promise<RegisterResponse>
  verify: (phone: string, code: string) => Promise<User>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (response) =>
        set({
          user: response.user,
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
        }),
      setTokens: (tokens) =>
        set(
          tokens
            ? { accessToken: tokens.access, refreshToken: tokens.refresh }
            : { accessToken: null, refreshToken: null },
        ),
      setUser: (user) => set({ user }),
      clearSession: () => set({ user: null, accessToken: null, refreshToken: null }),
      login: async (identifier, password, remember) => {
        const response = await api.post<AuthResponse>('/auth/login', {
          identifier,
          password,
          remember: remember ?? true,
        })
        get().setSession(response)
        return response.user
      },
      register: (body) => api.post<RegisterResponse>('/auth/register', body),
      verify: async (phone, code) => {
        const response = await api.post<AuthResponse>('/auth/verify-code', { phone, code })
        get().setSession(response)
        return response.user
      },
      logout: async () => {
        const refresh = get().refreshToken
        if (refresh) {
          try {
            await api.post('/auth/logout', { refresh })
          } catch {
            void 0
          }
        }
        get().clearSession()
      },
    }),
    { name: 'bekat-auth' },
  ),
)

configureAuth({
  get: () => {
    const state = useAuthStore.getState()
    return state.accessToken && state.refreshToken
      ? { access: state.accessToken, refresh: state.refreshToken }
      : null
  },
  set: (tokens) => useAuthStore.getState().setTokens(tokens),
  onExpired: () => useAuthStore.getState().clearSession(),
})

export function homeRouteFor(user: User | null): string {
  return user?.role === 'driver' ? '/app/driver' : '/app'
}
