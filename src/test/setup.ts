Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
})

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock

Object.defineProperty(window.navigator, 'language', {
  configurable: true,
  value: 'zh-CN',
})

window.localStorage.setItem('leo-locale', 'zh-CN')

// Extend vitest assertions with jest-dom matchers (toHaveValue, toBeInTheDocument, etc.)
import '@testing-library/jest-dom/vitest'

// Initialize i18next for business-pages tests that call i18next.t() at module level
import i18n from 'i18next'
import { zhCN } from '@/locales/zh-CN'

i18n.init({
  resources: { 'zh-CN': { translation: zhCN } },
  lng: 'zh-CN',
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
})
