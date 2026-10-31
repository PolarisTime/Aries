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
  toSaveRequest: vi.fn(() => Promise.resolve({ orderNo: 'PO-1' })),
}))

import {
  saveAndAuditBusinessModule,
  saveBusinessModule,
} from '@/api/business/business-crud'
import { RESOURCE_VERSION_HEADER } from '@/api/core/resource-version'
import type { MainFlowEditorDraft } from '@/types/module-record'

const editDraft: MainFlowEditorDraft<'purchase-order'> = {
  id: '363907829455855616',
  orderNo: 'PO-1',
}
const createDraft: MainFlowEditorDraft<'purchase-order'> = { orderNo: 'PO-1' }

interface CapturedConfig {
  headers?: Record<string, unknown>
  suppressGlobalErrorStatuses?: readonly number[]
}

function configOf(call: unknown[] | undefined): CapturedConfig {
  return (call?.[3] as CapturedConfig | undefined) ?? {}
}

function versionHeaderOf(call: unknown[] | undefined): unknown {
  return configOf(call).headers?.[RESOURCE_VERSION_HEADER]
}

describe('模块保存的版本前置条件头(通用适配层)', () => {
  beforeEach(() => {
    apiPutMock.mockReset().mockResolvedValue({ id: '363907829455855616' })
    apiPostMock.mockReset().mockResolvedValue({ id: '363907829455855616' })
  })

  it('更新(PUT)带版本时发送 X-Resource-Version, 并与幂等键头共存', async () => {
    await saveBusinessModule('purchase-order', editDraft, 'idem-1', '42')

    expect(apiPutMock).toHaveBeenCalledTimes(1)
    expect(apiPostMock).not.toHaveBeenCalled()
    const [url, , , config] = apiPutMock.mock.calls[0]
    expect(url).toBe('/purchase-orders/363907829455855616')
    expect(versionHeaderOf(apiPutMock.mock.calls[0])).toBe('42')
    expect((config as CapturedConfig).headers).toMatchObject({
      'X-Idempotency-Key': 'idem-1',
    })
    // 不抑制全局 412/428 提示: 编辑态需要全局错误展示引导"刷新后重试"
    expect(
      (config as CapturedConfig).suppressGlobalErrorStatuses,
    ).toBeUndefined()
  })

  it('更新(PUT)缺版本时不发送空头', async () => {
    await saveBusinessModule('purchase-order', editDraft, 'idem-2')

    expect(apiPutMock).toHaveBeenCalledTimes(1)
    expect(configOf(apiPutMock.mock.calls[0]).headers).not.toHaveProperty(
      RESOURCE_VERSION_HEADER,
    )
  })

  it('空字符串版本也不发送(旧后端/详情无 version)', async () => {
    await saveBusinessModule('purchase-order', editDraft, 'idem-3', '')

    expect(versionHeaderOf(apiPutMock.mock.calls[0])).toBeUndefined()
  })

  it('新建(POST)即使传了版本也不带头', async () => {
    await saveBusinessModule('purchase-order', createDraft, 'idem-4', '42')

    expect(apiPostMock).toHaveBeenCalledTimes(1)
    expect(apiPutMock).not.toHaveBeenCalled()
    expect(versionHeaderOf(apiPostMock.mock.calls[0])).toBeUndefined()
  })

  it('保存并审核的更新路径同样携带版本头', async () => {
    await saveAndAuditBusinessModule('purchase-order', editDraft, 'idem-5', '7')

    expect(apiPutMock).toHaveBeenCalledTimes(1)
    expect(versionHeaderOf(apiPutMock.mock.calls[0])).toBe('7')
    const body = apiPutMock.mock.calls[0][2] as Record<string, unknown>
    expect(body.audit).toBe(true)
  })

  it('保存并审核缺版本时同样不发空头', async () => {
    await saveAndAuditBusinessModule('purchase-order', editDraft, 'idem-6')

    expect(configOf(apiPutMock.mock.calls[0]).headers).not.toHaveProperty(
      RESOURCE_VERSION_HEADER,
    )
  })
})
