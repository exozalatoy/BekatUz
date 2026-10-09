import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '../lib/types'

type AppStore = {
  language: Lang
  darkMode: boolean
  onboardingSeen: boolean
  setLanguage: (language: Lang) => void
  setDarkMode: (darkMode: boolean) => void
  setOnboardingSeen: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      language: 'uz',
      darkMode: true,
      onboardingSeen: false,
      setLanguage: (language) => set({ language }),
      setDarkMode: (darkMode) => set({ darkMode }),
      setOnboardingSeen: () => set({ onboardingSeen: true }),
    }),
    { name: 'bekat-app' },
  ),
)
