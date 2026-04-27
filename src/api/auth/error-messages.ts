/**
 * Maps Axios/network error patterns to user-facing messages.
 *
 * The default messages are Chinese because the backend already returns Chinese
 * error messages. These defaults handle only infrastructure-level errors
 * (network, timeout, HTTP status) and English validation messages from the
 * server that need translation.
 *
 * For i18n-aware consumers, ERROR_MESSAGE_KEYS maps each pattern to a
 * MessageSchema key under 'auth' that can be resolved via vue-i18n.
 */

export const ERROR_MESSAGE_KEYS: Record<string, string> = {
  "'' is required": 'auth.validation.required',
  'network error': 'auth.error.network',
  'failed to fetch': 'auth.error.network',
  timeout: 'auth.error.timeout',
  ECONNABORTED: 'auth.error.timeout',
  'status code 401': 'auth.error.sessionExpired',
  'status code 403': 'auth.error.forbidden',
  'status code 404': 'auth.error.notFound',
}

const DEFAULT_MESSAGES: Record<string, string> = {
  "'' is required": '必填项不能为空',
  'network error': '网络连接失败，请检查服务是否可用',
  'failed to fetch': '网络连接失败，请检查服务是否可用',
  timeout: '请求超时，请稍后重试',
  ECONNABORTED: '请求超时，请稍后重试',
  'status code 401': '登录状态已失效，请重新登录',
  'status code 403': '无操作权限',
  'status code 404': '请求的接口不存在',
}

export function normalizeErrorMessage(rawMessage: unknown, status?: number) {
  const description =
    typeof rawMessage === 'string' && rawMessage.trim()
      ? rawMessage.trim()
      : '请求失败，请稍后重试'

  for (const [pattern, message] of Object.entries(DEFAULT_MESSAGES)) {
    if (description.toLowerCase().includes(pattern.toLowerCase())) {
      return message
    }
  }

  const requiredFieldMatch = description.match(/^['"]?([^'"]+)['"]?\s+is required$/i)
  if (requiredFieldMatch) {
    const fieldName = requiredFieldMatch[1]?.trim()
    return fieldName ? `缺少必填字段：${fieldName}` : '必填项不能为空'
  }

  if (/request failed with status code 5\d{2}/i.test(description) || (status && status >= 500)) {
    return '服务暂时不可用，请稍后重试'
  }

  return description
}
