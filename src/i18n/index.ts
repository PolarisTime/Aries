import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhCN from '@/locales/zh-CN'
import enUS from '@/locales/en-US'

const LOCALE_STORAGE_KEY = 'leo-locale'

function detectLocale(): string {
  const stored = typeof window !== 'undefined' ? localStorage.getItem(LOCALE_STORAGE_KEY) : null
  if (stored) return stored
  if (typeof navigator !== 'undefined' && navigator.language) {
    const lang = navigator.language
    if (lang.startsWith('zh')) return 'zh-CN'
    if (lang.startsWith('en')) return 'en-US'
  }
  return 'zh-CN'
}

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN as unknown as Record<string, unknown> },
    'en-US': { translation: enUS as unknown as Record<string, unknown> },
  },
  lng: detectLocale(),
  fallbackLng: 'zh-CN',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
