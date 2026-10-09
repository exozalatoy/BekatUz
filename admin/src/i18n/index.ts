import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { ru } from './ru'
import { uz, type UzDictionary } from './uz'

void i18n.use(initReactI18next).init({
  resources: {
    uz: { translation: uz },
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: 'uz',
  fallbackLng: 'uz',
  supportedLngs: ['uz', 'en', 'ru'],
  interpolation: { escapeValue: false },
  returnNull: false,
})

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: UzDictionary
    }
  }
}

export default i18n
