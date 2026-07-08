export const appTitle = import.meta.env.VITE_APP_TITLE || 'Leo ERP'
export const frontendVersion =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0'
export const frontendBuildTime =
  typeof __APP_BUILD_TIME__ === 'string' ? __APP_BUILD_TIME__ : 'unknown'

function normalizeGitCommit(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, 8) : 'unknown'
}

export const frontendGitCommit = normalizeGitCommit(
  typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : undefined,
)

const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
const apiVersion = import.meta.env.VITE_API_VERSION || ''

export const apiBaseUrl = apiVersion ? `${apiBase}/${apiVersion}` : apiBase
