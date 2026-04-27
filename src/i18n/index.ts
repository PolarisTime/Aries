import { createI18n } from 'vue-i18n'
import enUS from '@/locales/en-US'
import zhCN from '@/locales/zh-CN'

export const DEFAULT_LOCALE = 'zh-CN'
export const LOCALE_STORAGE_KEY = 'leo-locale'

function resolveInitialLocale() {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE
  }

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored === 'zh-CN' || stored === 'en-US') {
    return stored
  }

  const browserLocale = String(window.navigator.language || '').toLowerCase()
  return browserLocale.startsWith('en') ? 'en-US' : DEFAULT_LOCALE
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: resolveInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
})
