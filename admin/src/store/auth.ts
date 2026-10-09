import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ApiError, apiPost } from '../lib/api'
import { clearTokens, getTokens, setTokens } from '../lib/auth'
import type { UserOut } from '../types'

interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type?: string
  user: UserOut
}

interface AuthState {
  user: UserOut | null
  isAuthenticated: () => boolean
  login: (identifier: string, password: string) => Promise<UserOut>
  logout: () => void
  setUser: (user: UserOut) => void
}

interface PersistedAuth {
  user: UserOut | null
}

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], PersistedAuth>(
    (set) => ({
      user: null,
      isAuthenticated: () => Boolean(getTokens()),
      login: async (identifier, password) => {
        const data = await apiPost<LoginResponse>('/auth/login', {
          identifier,
          password,
        })
        if (data.user?.role !== 'admin') {
          throw new ApiError(403, 'Faqat admin kirishi mumkin')
        }
        setTokens({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        })
        set({ user: data.user })
        return data.user
      },
      logout: () => {
        clearTokens()
        set({ user: null })
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: 'bekat_uz_admin_auth',
      partialize: (state) => ({ user: state.user }),
    },
  ),
)
