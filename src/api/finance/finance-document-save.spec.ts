import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiPutMock, apiPostMock } = vi.hoisted(() => ({
  apiPutMock: vi.fn(),
  apiPostMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiPut: apiPutMock,
  apiPost: apiPostMock,
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiDeleteNoContent: vi.fn(),
}))

vi.mock('@/module-system/record/module-save-payload', () => ({
  toSaveRequest: vi.fn(() => Promise.resolve({ paymentNo: 'PAY-1' })),
}))

import { saveBusinessModule } from '@/api/business/business-crud'
import { readRequestError } from '@/api/core/request-errors'
import {
  concurrencyRecoveryCodeOf,
  isConcurrencyRecoveryCode,
  isResourceVersionError,
  RESOURCE_VERSION_HEADER,
} from '@/api/core/resource-version'
import { normalizeFinanceDocumentRecord } from '@/api/finance/finance-document-record'
import { ERROR_CODE } from '@/constants/error-codes'

interface CapturedConfig {
  headers?: Record<string, unknown>
}

function configOf(call: unknown[] | undefined): CapturedConfig {
  return (call?.[3] as CapturedConfig | undefined) ?? {}
}

function versionHeaderOf(call: unknown[] | undefined): unknown {
  return configOf(call).headers?.[RESOURCE_VERSION_HEADER]
}

/** 后端 ProblemDetail 归一后的失败对象：status 来自 HTTP，code 为业务错误码。 */
function requestError(status?: number, code?: number): Error {
  const error = new Error('version precondition failed') as Error & {
    status?: number
    code?: number
  }
  if (status !== undefined) error.status = status
  if (code !== undefined) error.code = code
  return error
}

describe('付款单/收款单更新的版本前置条件头', () => {
  beforeEach(() => {
    apiPutMock.mockReset().mockResolvedValue({ id: '9001', version: '8' })
    apiPostMock.mockReset().mockResolvedValue({ id: '9001', version: '1' })
  })

  it('付款单更新带上记录归一后的 X-Resource-Version（number 版本也一样）', async () => {
    const record = normalizeFinanceDocumentRecord({
      id: '9001',
      paymentNo: 'PAY-1',
      version: 7,
    })

    await saveBusinessModule('payment', record, 'idem-pay', record.version)

    expect(apiPutMock).toHaveBeenCalledTimes(1)
    expect(apiPostMock).not.toHaveBeenCalled()
    const [url] = apiPutMock.mock.calls[0]
    expect(url).toBe('/payments/9001')
    expect(versionHeaderOf(apiPutMock.mock.calls[0])).toBe('7')
  })

  it('收款单更新同样携带版本头', async () => {
    const record = normalizeFinanceDocumentRecord({
      id: '9002',
      receiptNo: 'REC-1',
      version: '12',
    })

    await saveBusinessModule('receipt', record, 'idem-rec', record.version)

    const [url] = apiPutMock.mock.calls[0]
    expect(url).toBe('/receipts/9002')
    expect(versionHeaderOf(apiPutMock.mock.calls[0])).toBe('12')
  })

  it('旧后端详情/列表没有 version 时不发空头（由后端 428 引导刷新）', async () => {
    const record = normalizeFinanceDocumentRecord({
      id: '9001',
      paymentNo: 'PAY-1',
    })
    expect(record).not.toHaveProperty('version')

    await saveBusinessModule('payment', record, 'idem-old', record.version)

    expect(apiPutMock).toHaveBeenCalledTimes(1)
    expect(configOf(apiPutMock.mock.calls[0]).headers).not.toHaveProperty(
      RESOURCE_VERSION_HEADER,
    )
  })

  it('新建付款单（POST）即使传了版本也不带版本头', async () => {
    const record = normalizeFinanceDocumentRecord({ paymentNo: 'PAY-2' })

    await saveBusinessModule('payment', record, 'idem-new', '5')

    expect(apiPostMock).toHaveBeenCalledTimes(1)
    expect(apiPutMock).not.toHaveBeenCalled()
    expect(versionHeaderOf(apiPostMock.mock.calls[0])).toBeUndefined()
  })

  it('412 版本过期进入既有 conflict 恢复路径（后端仅回 status 时同样成立）', () => {
    const error = requestError(412)
    const { status, code } = readRequestError(error)

    expect(status).toBe(412)
    expect(isResourceVersionError(error)).toBe(true)
    const recoveryCode = concurrencyRecoveryCodeOf(status, code)
    expect(recoveryCode).toBe(ERROR_CODE.PRECONDITION_FAILED)
    expect(isConcurrencyRecoveryCode(recoveryCode)).toBe(true)
  })

  it('428 缺版本前置条件同样进入恢复路径（HTTP 428 与业务码 4280 等价）', () => {
    for (const error of [requestError(428), requestError(undefined, 4280)]) {
      const { status, code } = readRequestError(error)
      const recoveryCode = concurrencyRecoveryCodeOf(status, code)
      expect(recoveryCode).toBe(ERROR_CODE.PRECONDITION_REQUIRED)
      expect(isConcurrencyRecoveryCode(recoveryCode)).toBe(true)
    }
    // 4120 业务码（后端回了 code 未回 status）走同一恢复入口
    const byBusinessCode = readRequestError(requestError(undefined, 4120))
    expect(
      isConcurrencyRecoveryCode(
        concurrencyRecoveryCodeOf(byBusinessCode.status, byBusinessCode.code),
      ),
    ).toBe(true)
  })
})
