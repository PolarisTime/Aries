import { resolveInjectedBuildMoment } from './buildInfo'

export const appTitle = import.meta.env.VITE_APP_TITLE || 'Leo ERP'
export const frontendVersion =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0'
// 注入值不可信(占位/哨兵/非法)时退化为 'unknown', 底栏显示"未记录"而不是错误年份。
export const frontendBuildTime = resolveInjectedBuildMoment(
  typeof __APP_BUILD_TIME__ === 'string' ? __APP_BUILD_TIME__ : undefined,
)

function normalizeGitCommit(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, 8) : 'unknown'
}

export const frontendGitCommit = normalizeGitCommit(
  typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : undefined,
)

const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

export const apiBaseUrl = `${apiBase}/v2.0`
