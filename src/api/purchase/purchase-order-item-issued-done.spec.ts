import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiPutMock, apiDeleteMock } = vi.hoisted(() => ({
  apiPutMock: vi.fn(),
  apiDeleteMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiPut: apiPutMock,
  apiDeleteNoContent: apiDeleteMock,
}))

import {
  clearPurchaseOrderItemIssuedDone,
  markPurchaseOrderItemIssuedDone,
  setPurchaseOrderItemIssuedDone,
} from './purchase-order-item-issued-done'

describe('采购订单明细行「已开完」手动标记 API', () => {
  beforeEach(() => {
    apiPutMock.mockReset()
    apiDeleteMock.mockReset()
  })

  it('标记: PUT sub-resource + body issuedDone=true, 雪花 ID 为字符串且解析留痕', async () => {
    apiPutMock.mockResolvedValue({
      purchaseOrderItemId: '301',
      issuedDone: true,
      issuedDoneBy: '7',
      issuedDoneName: '张三',
      issuedDoneAt: '2026-09-28T22:40:00',
    })

    const result = await markPurchaseOrderItemIssuedDone('301')

    expect(apiPutMock.mock.calls[0][0]).toBe(
      '/purchase-order-items/301/issued-done',
    )
    expect(apiPutMock.mock.calls[0][2]).toEqual({ issuedDone: true })
    expect(result).toEqual({
      purchaseOrderItemId: '301',
      issuedDone: true,
      issuedDoneBy: '7',
      issuedDoneName: '张三',
      issuedDoneAt: '2026-09-28T22:40:00',
    })
  })

  it('取消: DELETE 同路径(204 无响应体)', async () => {
    apiDeleteMock.mockResolvedValue(undefined)

    await clearPurchaseOrderItemIssuedDone('301')

    expect(apiDeleteMock.mock.calls[0][0]).toBe(
      '/purchase-order-items/301/issued-done',
    )
  })

  it('setPurchaseOrderItemIssuedDone: true 走 PUT, false 走 DELETE 并只回标记状态', async () => {
    apiPutMock.mockResolvedValue({
      purchaseOrderItemId: '301',
      issuedDone: true,
      issuedDoneName: '张三',
    })
    await expect(setPurchaseOrderItemIssuedDone('301', true)).resolves.toEqual({
      purchaseOrderItemId: '301',
      issuedDone: true,
      issuedDoneName: '张三',
    })

    await expect(setPurchaseOrderItemIssuedDone('301', false)).resolves.toEqual(
      {
        purchaseOrderItemId: '301',
        issuedDone: false,
      },
    )
    expect(apiDeleteMock).toHaveBeenCalledTimes(1)
  })

  it('非雪花 ID(空/非数字)在请求前即被拒绝', async () => {
    await expect(markPurchaseOrderItemIssuedDone('')).rejects.toThrow()
    await expect(clearPurchaseOrderItemIssuedDone('abc')).rejects.toThrow()
    expect(apiPutMock).not.toHaveBeenCalled()
    expect(apiDeleteMock).not.toHaveBeenCalled()
  })
})
