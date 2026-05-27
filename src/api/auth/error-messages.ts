/**
 * Maps Axios/network error patterns to user-facing messages.
 *
 * These defaults handle only infrastructure-level errors
 * (network, timeout, HTTP status) and English validation messages from the
 * server that need translation.
 *
 * Uses i18next for i18n-aware message resolution.
 */

import i18next from 'i18next'

const DEFAULT_MESSAGE_KEYS: Record<string, string> = {
  "'' is required": 'api.errorMessages.requiredEmpty',
  'network error': 'api.errorMessages.networkError',
  'failed to fetch': 'api.errorMessages.networkError',
  timeout: 'api.errorMessages.timeout',
  ECONNABORTED: 'api.errorMessages.timeout',
  'status code 401': 'api.errorMessages.sessionExpired',
  'status code 403': 'api.errorMessages.forbidden',
  'status code 404': 'api.errorMessages.notFound',
}

export function normalizeErrorMessage(rawMessage: unknown, status?: number) {
  const description =
    typeof rawMessage === 'string' && rawMessage.trim()
      ? rawMessage.trim()
      : i18next.t('api.errorMessages.requestFailed')

  for (const [pattern, key] of Object.entries(DEFAULT_MESSAGE_KEYS)) {
    if (description.toLowerCase().includes(pattern.toLowerCase())) {
      return i18next.t(key)
    }
  }

  const requiredFieldMatch = description.match(
    /^['"]?([^'"]+)['"]?\s+is required$/i,
  )
  if (requiredFieldMatch) {
    const fieldName = requiredFieldMatch[1]?.trim()
    return fieldName
      ? i18next.t('api.errorMessages.missingRequiredField', { fieldName })
      : i18next.t('api.errorMessages.requiredEmpty')
  }

  if (
    /request failed with status code 5\d{2}/i.test(description) ||
    (status && status >= 500)
  ) {
    return i18next.t('api.errorMessages.serviceUnavailable')
  }

  return description
}
