export const appTitle = import.meta.env.VITE_APP_TITLE || 'Aries ERP'
export const isMockEnabled =
  import.meta.env.VITE_USE_MOCK === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== 'false')

export const apiBaseUrl = isMockEnabled
  ? '/mock-api'
  : import.meta.env.VITE_API_BASE_URL || '/jshERP-boot'
