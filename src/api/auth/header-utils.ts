import type { RetryableRequestConfig } from './types'

function getRequestHeader(
  config: RetryableRequestConfig | undefined,
  headerName: string,
) {
  if (!config?.headers) {
    return ''
  }

  if (typeof config.headers.get === 'function') {
    return String(config.headers.get(headerName) || '')
  }

  const matchedKey = Object.keys(config.headers).find(
    (key) => key.toLowerCase() === headerName.toLowerCase(),
  )

  return matchedKey ? String(config.headers[matchedKey] || '') : ''
}

export function requestHadAuthorization(
  config: RetryableRequestConfig | undefined,
) {
  const authorization = getRequestHeader(config, 'Authorization')
  return Boolean(authorization.trim())
}
