import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { useAppStore } from '../store/app'
import type { Lang } from '../lib/types'
import en from './en'
import ru from './ru'
import uz from './uz'

const i18n = i18next.createInstance()

void i18n.use(initReactI18next).init({
  resources: {
    uz: { translation: uz },
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: useAppStore.getState().language,
  fallbackLng: 'uz',
  interpolation: { escapeValue: false },
})

export async function changeLanguage(lang: Lang): Promise<void> {
  useAppStore.getState().setLanguage(lang)
  await i18n.changeLanguage(lang)
}

export default i18n
