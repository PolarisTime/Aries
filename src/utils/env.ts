export const appTitle = import.meta.env.VITE_APP_TITLE || 'Leo ERP'

const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
const apiVersion = import.meta.env.VITE_API_VERSION || ''

export const apiBaseUrl = apiVersion ? `${apiBase}/${apiVersion}` : apiBase
