import { describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDeleteNoContent: vi.fn(),
}))

vi.mock('@/api/core/client', () => client)

import {
  addSupplierPriceColumn,
  fetchSpecRows,
  removeSupplierPriceColumn,
  saveSupplierPriceColumnItems,
} from './supplier-price-lists'

/** 后端分页上限：`size 必须在1到200之间`，超过直接 422。 */
const BACKEND_MAX_PAGE_SIZE = 200

const materialRow = (spec: number | string, overrides = {}) => ({
  category: '螺纹钢',
  material: 'HRB400',
  spec,
  length: '9米',
  ...overrides,
})

describe('fetchSpecRows：规格行分页', () => {
  it('按后端允许的页大小翻页（不超过 200，超过会 422 导致整表为空）', async () => {
    client.apiGet.mockReset()
    client.apiGet.mockResolvedValueOnce({ content: [materialRow(12)] })

    await fetchSpecRows()

    expect(client.apiGet).toHaveBeenCalledTimes(1)
    const params = client.apiGet.mock.calls[0][2]?.params as {
      page: number
      size: number
    }
    expect(params.page).toBe(0)
    expect(params.size).toBeLessThanOrEqual(BACKEND_MAX_PAGE_SIZE)
  })

  it('满页时继续翻页，直到某页不足一页为止', async () => {
    client.apiGet.mockReset()
    const fullPage = Array.from({ length: BACKEND_MAX_PAGE_SIZE }, (_, index) =>
      materialRow(10 + index),
    )
    client.apiGet
      .mockResolvedValueOnce({ content: fullPage })
      .mockResolvedValueOnce({ content: [materialRow(40)] })

    const rows = await fetchSpecRows()

    expect(client.apiGet).toHaveBeenCalledTimes(2)
    expect(rows.length).toBe(BACKEND_MAX_PAGE_SIZE + 1)
    expect(client.apiGet.mock.calls[1][2]?.params).toMatchObject({
      page: 1,
      size: BACKEND_MAX_PAGE_SIZE,
    })
  })

  it('过滤掉没有有效规格的行（spec 必须是正整数）', async () => {
    client.apiGet.mockReset()
    client.apiGet.mockResolvedValueOnce({
      content: [
        materialRow(12),
        materialRow(''),
        materialRow(0),
        materialRow(-3),
        materialRow('14'),
      ],
    })

    const rows = await fetchSpecRows()

    expect(rows.map((row) => row.spec)).toEqual([12, 14])
  })

  it('分页参数非法时不要把空结果当成"没有规格"：错误向上抛给调用方提示', async () => {
    client.apiGet.mockReset()
    client.apiGet.mockRejectedValueOnce(new Error('size 必须在1到200之间'))

    await expect(fetchSpecRows()).rejects.toThrow('size 必须在1到200之间')
  })
})

describe('写操作必须带幂等键（后端类级 @IdempotencyRequired）', () => {
  const headerOf = (config: unknown) =>
    (config as { headers?: Record<string, string> } | undefined)?.headers?.[
      'X-Idempotency-Key'
    ]

  it('建列（POST）带幂等键', async () => {
    client.apiPost.mockReset().mockResolvedValue({
      listId: '1',
      supplierId: '2',
      version: 0,
    })
    await addSupplierPriceColumn({
      brandName: '中天',
      supplierId: '2',
      quotedOn: '2026-10-28',
    })
    expect(headerOf(client.apiPost.mock.calls[0]?.[3])).toBeTruthy()
  })

  it('保存某列（PUT）带幂等键', async () => {
    client.apiPut.mockReset().mockResolvedValue({
      listId: '1',
      supplierId: '2',
      version: 1,
    })
    await saveSupplierPriceColumnItems('1', 0, [])
    expect(headerOf(client.apiPut.mock.calls[0]?.[3])).toBeTruthy()
  })

  it('移除某列（DELETE）带幂等键', async () => {
    client.apiDeleteNoContent.mockReset().mockResolvedValue(undefined)
    await removeSupplierPriceColumn('1')
    expect(headerOf(client.apiDeleteNoContent.mock.calls[0]?.[1])).toBeTruthy()
  })
})
