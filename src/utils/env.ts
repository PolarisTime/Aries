export const appTitle = import.meta.env.VITE_APP_TITLE || 'Leo ERP'
export const frontendVersion =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0'

const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
const apiVersion = import.meta.env.VITE_API_VERSION || ''

export const apiBaseUrl = apiVersion ? `${apiBase}/${apiVersion}` : apiBase
