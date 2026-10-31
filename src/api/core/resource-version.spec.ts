import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

import { ERROR_CODE } from '@/constants/error-codes'
import { resolveErrorPresentation } from '@/utils/error-presentation'
import {
  concurrencyRecoveryCodeOf,
  isConcurrencyRecoveryCode,
  isResourceVersionError,
  RESOURCE_VERSION_HEADER,
  withResourceVersion,
} from './resource-version'

interface RequestError extends Error {
  status?: number
  code?: number
}

function requestError(fields: {
  status?: number
  code?: number
}): RequestError {
  return Object.assign(new Error('precondition failed'), fields)
}

describe('X-Resource-Version 请求头(withResourceVersion)', () => {
  it('有版本时注入请求头, 允许与既有 headers 合并', () => {
    const config = withResourceVersion('123456789012345678', {
      headers: { Authorization: 'Bearer token' },
      params: { page: 0 },
    })

    expect(config.headers).toMatchObject({
      Authorization: 'Bearer token',
      [RESOURCE_VERSION_HEADER]: '123456789012345678',
    })
    expect(config.params).toEqual({ page: 0 })
  })

  it('版本号两侧空白会被裁剪, 仍以十进制字符串发送', () => {
    const config = withResourceVersion(' 42 ')
    expect(config.headers).toMatchObject({ [RESOURCE_VERSION_HEADER]: '42' })
  })

  it('缺版本/空版本/非法版本时不发送空头', () => {
    for (const version of [undefined, '', '   ', 'v42', '4.2']) {
      const config = withResourceVersion(version)
      expect(config.headers?.[RESOURCE_VERSION_HEADER]).toBeUndefined()
    }
    // 已有 headers 时也不新增该头
    const withHeaders = withResourceVersion('', {
      headers: { 'X-Idempotency-Key': 'idem-1' },
    })
    expect(withHeaders.headers).toEqual({ 'X-Idempotency-Key': 'idem-1' })
  })

  it('不覆盖调用方已显式设置的版本头, 也不改动全局错误抑制配置', () => {
    const config = withResourceVersion('7', {
      headers: { [RESOURCE_VERSION_HEADER]: '9' },
      suppressGlobalErrorStatuses: [409],
    })

    expect(config.headers).toMatchObject({ [RESOURCE_VERSION_HEADER]: '9' })
    // 只加头、不抑制：412/428 仍由全局错误展示提示"刷新后重试"
    expect(config.suppressGlobalErrorStatuses).toEqual([409])
  })
})

describe('版本前置条件错误识别(412/428)', () => {
  it('isResourceVersionError 只认 412/428, 不误伤 409/500', () => {
    expect(isResourceVersionError(requestError({ status: 412 }))).toBe(true)
    expect(isResourceVersionError(requestError({ status: 428 }))).toBe(true)
    expect(isResourceVersionError(requestError({ status: 409 }))).toBe(false)
    expect(isResourceVersionError(requestError({ status: 500 }))).toBe(false)
    expect(isResourceVersionError(new Error('plain'))).toBe(false)
    expect(isResourceVersionError(undefined)).toBe(false)
  })

  it('错误展示给出"刷新后重试"引导(412 与 428 同一恢复动作)', () => {
    for (const status of [412, 428]) {
      const presentation = resolveErrorPresentation(requestError({ status }))
      expect(presentation.status).toBe('warning')
      expect(presentation.title).toBe('errorBoundary.preconditionTitle')
      expect(presentation.hint).toBe('errorBoundary.preconditionHint')
    }
  })

  it('恢复码归一: 有业务码用业务码, 仅 status 时按 409/412/428 兜底', () => {
    // 有业务码
    expect(concurrencyRecoveryCodeOf(412, ERROR_CODE.PRECONDITION_FAILED)).toBe(
      ERROR_CODE.PRECONDITION_FAILED,
    )
    expect(
      concurrencyRecoveryCodeOf(428, ERROR_CODE.PRECONDITION_REQUIRED),
    ).toBe(ERROR_CODE.PRECONDITION_REQUIRED)
    expect(
      concurrencyRecoveryCodeOf(409, ERROR_CODE.CONCURRENT_MODIFICATION),
    ).toBe(ERROR_CODE.CONCURRENT_MODIFICATION)
    // 仅 status（后端未回业务码）
    expect(concurrencyRecoveryCodeOf(412, undefined)).toBe(
      ERROR_CODE.PRECONDITION_FAILED,
    )
    expect(concurrencyRecoveryCodeOf(428, undefined)).toBe(
      ERROR_CODE.PRECONDITION_REQUIRED,
    )
    expect(concurrencyRecoveryCodeOf(409, undefined)).toBe(
      ERROR_CODE.CONCURRENT_MODIFICATION,
    )
  })

  it('412 与 428(各含 code/仅 status)都进入 conflict 恢复路径', () => {
    const cases: Array<[number | undefined, number | undefined]> = [
      [412, ERROR_CODE.PRECONDITION_FAILED],
      [412, undefined],
      [428, ERROR_CODE.PRECONDITION_REQUIRED],
      [428, undefined],
    ]
    for (const [status, code] of cases) {
      const recoveryCode = concurrencyRecoveryCodeOf(status, code)
      expect(isConcurrencyRecoveryCode(recoveryCode)).toBe(true)
    }
  })

  it('403/404 等非并发错误不会被误判进恢复路径(防扩大化)', () => {
    const nonConcurrency: Array<[number | undefined, number | undefined]> = [
      [403, ERROR_CODE.FORBIDDEN],
      [403, undefined],
      [404, ERROR_CODE.NOT_FOUND],
      [404, undefined],
      [400, ERROR_CODE.VALIDATION_ERROR],
      [500, ERROR_CODE.INTERNAL_ERROR],
      [undefined, undefined],
    ]
    for (const [status, code] of nonConcurrency) {
      const recoveryCode = concurrencyRecoveryCodeOf(status, code)
      expect(recoveryCode).toBeUndefined()
      expect(isConcurrencyRecoveryCode(recoveryCode)).toBe(false)
      // 原有错误码仍按原样保留（不被替换为恢复码）
      expect(isConcurrencyRecoveryCode(code)).toBe(false)
    }
  })

  it('isConcurrencyRecoveryCode 只认 4090/4120/4280', () => {
    expect(isConcurrencyRecoveryCode(ERROR_CODE.CONCURRENT_MODIFICATION)).toBe(
      true,
    )
    expect(isConcurrencyRecoveryCode(ERROR_CODE.PRECONDITION_FAILED)).toBe(true)
    expect(isConcurrencyRecoveryCode(ERROR_CODE.PRECONDITION_REQUIRED)).toBe(
      true,
    )
    expect(isConcurrencyRecoveryCode(ERROR_CODE.FORBIDDEN)).toBe(false)
    expect(isConcurrencyRecoveryCode(ERROR_CODE.NOT_FOUND)).toBe(false)
    expect(isConcurrencyRecoveryCode(undefined)).toBe(false)
  })
})
