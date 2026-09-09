import { describe, expect, it, vi } from 'vitest'

const I18N_TEXTS: Record<string, string> = {
  'errorBoundary.accessDenied': '当前页面拒绝访问',
  'errorBoundary.forbiddenHint': '请联系管理员开通相关权限',
  'errorBoundary.networkError': '网络连接异常',
  'errorBoundary.networkHint': '请检查网络连接后重试',
  'errorBoundary.serverBusy': '服务器繁忙，请稍后重试',
  'errorBoundary.runtimeTitle': '页面渲染出错',
  'errorBoundary.runtimeHint': '请刷新页面重试；若问题持续请联系技术支持',
}

vi.mock('i18next', () => ({
  default: {
    t: (key: string, options?: { defaultValue?: string }) =>
      I18N_TEXTS[key] ?? options?.defaultValue ?? key,
  },
}))

import {
  classifyError,
  resolveErrorPresentation,
  summarizeErrorMessage,
} from './error-presentation'

interface RequestError extends Error {
  status?: number
  code?: number
  traceId?: string
}

describe('error-presentation', () => {
  it('status/code 为 403 或消息含权限关键字时分类为 forbidden', () => {
    const byStatus = new Error('denied') as RequestError
    byStatus.status = 403
    expect(classifyError(byStatus)).toBe('forbidden')

    const byCode = new Error('denied') as RequestError
    byCode.code = 403
    expect(classifyError(byCode)).toBe('forbidden')

    expect(classifyError(new Error('Forbidden'))).toBe('forbidden')
    expect(classifyError(new Error('Unauthorized access'))).toBe('forbidden')
  })

  it('网络类消息分类为 network', () => {
    expect(classifyError(new Error('Failed to fetch'))).toBe('network')
    expect(
      classifyError(new Error('NetworkError when attempting to fetch')),
    ).toBe('network')
    expect(classifyError(new Error('Request timeout'))).toBe('network')
    expect(classifyError(new Error('Loading chunk 3 failed'))).toBe('network')
  })

  it('非权限、非网络的错误分类为 runtime', () => {
    expect(classifyError(new Error('boom'))).toBe('runtime')
    expect(classifyError(undefined)).toBe('runtime')
    expect(classifyError(null)).toBe('runtime')
    expect(classifyError('plain string')).toBe('runtime')
  })

  it('forbidden 展示 403 图标与权限恢复建议', () => {
    const error = new Error('denied') as RequestError
    error.status = 403
    const presentation = resolveErrorPresentation(error)
    expect(presentation.status).toBe('403')
    expect(presentation.description).toBe('当前页面拒绝访问')
    expect(presentation.hint).toBe('请联系管理员开通相关权限')
  })

  it('network 展示 warning 图标、网络标题与网络恢复建议', () => {
    const presentation = resolveErrorPresentation(new Error('Failed to fetch'))
    expect(presentation.status).toBe('warning')
    expect(presentation.title).toBe('网络连接异常')
    expect(presentation.hint).toBe('请检查网络连接后重试')
  })

  it('status/code 为 500 或 internal server 展示 500 图标与服务器文案', () => {
    const byStatus = new Error('server error') as RequestError
    byStatus.status = 500
    const byStatusPresentation = resolveErrorPresentation(byStatus)
    expect(byStatusPresentation.status).toBe('500')
    expect(byStatusPresentation.description).toBe('服务器繁忙，请稍后重试')
    expect(byStatusPresentation.hint).toBe(
      '请刷新页面重试；若问题持续请联系技术支持',
    )

    const byCode = new Error('server error') as RequestError
    byCode.code = 500
    expect(resolveErrorPresentation(byCode).status).toBe('500')

    expect(
      resolveErrorPresentation(new Error('Internal Server Error')).status,
    ).toBe('500')
  })

  it('默认分类展示 error 图标与运行时标题', () => {
    const presentation = resolveErrorPresentation(new Error('boom'))
    expect(presentation.status).toBe('error')
    expect(presentation.title).toBe('页面渲染出错')
    expect(presentation.description).toBe('boom')
    expect(presentation.hint).toBe('请刷新页面重试；若问题持续请联系技术支持')
  })

  it('长消息不作为描述展示，摘要按 120 字符截断', () => {
    const longMessage = 'x'.repeat(200)
    const presentation = resolveErrorPresentation(new Error(longMessage))
    expect(presentation.description).toBeUndefined()

    const summary = summarizeErrorMessage(new Error(longMessage))
    expect(summary).toHaveLength(121)
    expect(summary.endsWith('…')).toBe(true)
  })
})
