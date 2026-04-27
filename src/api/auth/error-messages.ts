export function normalizeErrorMessage(rawMessage: unknown, status?: number) {
  const description =
    typeof rawMessage === 'string' && rawMessage.trim()
      ? rawMessage.trim()
      : '请求失败，请稍后重试'

  if (/^'' is required$/i.test(description)) {
    return '必填项不能为空'
  }

  const requiredFieldMatch = description.match(/^['"]?([^'"]+)['"]?\s+is required$/i)
  if (requiredFieldMatch) {
    const fieldName = requiredFieldMatch[1]?.trim()
    return fieldName ? `缺少必填字段：${fieldName}` : '必填项不能为空'
  }

  if (/network error/i.test(description) || /failed to fetch/i.test(description)) {
    return '网络连接失败，请检查服务是否可用'
  }

  if (/timeout/i.test(description) || /ECONNABORTED/i.test(description)) {
    return '请求超时，请稍后重试'
  }

  if (/request failed with status code 401/i.test(description)) {
    return '登录状态已失效，请重新登录'
  }

  if (/^request failed with status code 403$/i.test(description)) {
    return '无操作权限'
  }

  if (/request failed with status code 404/i.test(description)) {
    return '请求的接口不存在'
  }

  if (/request failed with status code 5\d{2}/i.test(description) || (status && status >= 500)) {
    return '服务暂时不可用，请稍后重试'
  }

  return description
}
