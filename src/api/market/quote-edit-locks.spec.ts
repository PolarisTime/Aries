import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock, apiPostMock, apiDeleteMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiDeleteMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiGet: apiGetMock,
  apiPost: apiPostMock,
  apiDeleteNoContent: apiDeleteMock,
}))

import {
  acquireQuoteSheetEditLock,
  fetchQuoteSheetEditLock,
  releaseQuoteSheetEditLock,
} from './quote-edit-locks'

describe('quote-edit-locks API', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPostMock.mockReset()
    apiDeleteMock.mockReset()
  })

  it('查询无锁时归一化为 locked=false 并抑制全局 409', async () => {
    apiGetMock.mockResolvedValue({
      sheetId: '9001',
      locked: false,
      mine: false,
      ttlSeconds: '120',
    })

    const lock = await fetchQuoteSheetEditLock('9001')

    expect(lock.locked).toBe(false)
    expect(lock.ttlSeconds).toBe(120)
    expect(apiGetMock.mock.calls[0][0]).toBe('/quote-sheets/9001/edit-locks')
    const config = apiGetMock.mock.calls[0][2] as {
      suppressGlobalErrorStatuses: number[]
    }
    expect(config.suppressGlobalErrorStatuses).toContain(409)
  })

  it('签出时归一化 owner 与 mine', async () => {
    apiPostMock.mockResolvedValue({
      sheetId: '9001',
      locked: true,
      ownerId: '77',
      ownerName: '张三',
      mine: true,
      ttlSeconds: 120,
    })

    const lock = await acquireQuoteSheetEditLock('9001')

    expect(lock.mine).toBe(true)
    expect(lock.ownerId).toBe('77')
    expect(lock.ownerName).toBe('张三')
    expect(apiPostMock.mock.calls[0][0]).toBe('/quote-sheets/9001/edit-locks')
  })

  it('强制接管时携带 force=true 查询参数', async () => {
    apiPostMock.mockResolvedValue({
      sheetId: '9001',
      locked: true,
      ownerId: '77',
      ownerName: '张三',
      mine: true,
      ttlSeconds: 120,
    })

    await acquireQuoteSheetEditLock('9001', { force: true })

    const config = apiPostMock.mock.calls[0][3] as {
      params?: { force?: boolean }
    }
    expect(config.params).toEqual({ force: true })
  })

  it('释放走 DELETE 且抑制全局 409', async () => {
    apiDeleteMock.mockResolvedValue(undefined)

    await releaseQuoteSheetEditLock('9001')

    expect(apiDeleteMock.mock.calls[0][0]).toBe('/quote-sheets/9001/edit-locks')
    const config = apiDeleteMock.mock.calls[0][1] as {
      suppressGlobalErrorStatuses: number[]
    }
    expect(config.suppressGlobalErrorStatuses).toContain(409)
  })
})
