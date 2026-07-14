import { beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeErrorMessage } from './error-messages'

const tMock = vi.hoisted(() => vi.fn())

vi.mock('i18next', () => ({
  default: {
    t: (key: string, options?: Record<string, string>) => tMock(key, options),
  },
}))

describe('error-messages', () => {
  beforeEach(() => {
    tMock.mockReset()
    tMock.mockImplementation(
      (key: string, options?: Record<string, string>) => {
        const map: Record<string, string> = {
          'api.errorMessages.requestFailed': '请求失败',
          'api.errorMessages.networkError': '网络错误',
          'api.errorMessages.timeout': '请求超时',
          'api.errorMessages.sessionExpired': '登录已失效',
          'api.errorMessages.forbidden': '无权限访问',
          'api.errorMessages.notFound': '资源不存在',
          'api.errorMessages.serviceUnavailable': '服务暂不可用',
          'api.errorMessages.requiredEmpty': '必填项不能为空',
          'api.errorMessages.missingRequiredField': `缺少必填字段: ${options?.fieldName ?? ''}`,
        }
        return map[key] || key
      },
    )
  })

  it('returns requestFailed for empty or non-string rawMessage', () => {
    expect(normalizeErrorMessage(undefined)).toBe('请求失败')
    expect(normalizeErrorMessage(null)).toBe('请求失败')
    expect(normalizeErrorMessage(123)).toBe('请求失败')
    expect(normalizeErrorMessage('')).toBe('请求失败')
    expect(normalizeErrorMessage('   ')).toBe('请求失败')
  })

  it('returns trimmed string for rawMessage', () => {
    expect(normalizeErrorMessage('  操作成功  ')).toBe('操作成功')
  })

  it('maps known network error patterns', () => {
    expect(normalizeErrorMessage('network error')).toBe('网络错误')
    expect(normalizeErrorMessage('Failed to fetch')).toBe('网络错误')
    expect(normalizeErrorMessage('timeout')).toBe('请求超时')
    expect(normalizeErrorMessage('ECONNABORTED')).toBe('请求超时')
    expect(normalizeErrorMessage('status code 401')).toBe('登录已失效')
    expect(normalizeErrorMessage('status code 403')).toBe('无权限访问')
    expect(normalizeErrorMessage('status code 404')).toBe('资源不存在')
  })

  it('maps validation empty field pattern', () => {
    expect(normalizeErrorMessage("'' is required")).toBe('必填项不能为空')
  })

  it('maps required field name pattern', () => {
    expect(normalizeErrorMessage('"customerName" is required')).toBe(
      '缺少必填字段: customerName',
    )
  })

  it('maps blank required field name to empty required message', () => {
    expect(normalizeErrorMessage("'   ' is required")).toBe('必填项不能为空')
  })

  it('maps 5xx status codes', () => {
    expect(normalizeErrorMessage('request failed with status code 500')).toBe(
      '服务暂不可用',
    )
    expect(normalizeErrorMessage('request failed with status code 502')).toBe(
      '服务暂不可用',
    )
    expect(normalizeErrorMessage('error', 503)).toBe('服务暂不可用')
    expect(normalizeErrorMessage('error', 500)).toBe('服务暂不可用')
  })

  it('returns original description when no pattern matches', () => {
    expect(normalizeErrorMessage('未知错误')).toBe('未知错误')
    expect(normalizeErrorMessage('some random error')).toBe('some random error')
  })
})
