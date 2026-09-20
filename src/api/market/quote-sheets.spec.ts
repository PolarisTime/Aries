import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  apiGetMock,
  apiPutMock,
  apiPostMock,
  apiDeleteMock,
  apiPostResponseMock,
  apiPutResponseMock,
  apiDeleteResponseMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPutMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiDeleteMock: vi.fn(),
  apiPostResponseMock: vi.fn(),
  apiPutResponseMock: vi.fn(),
  apiDeleteResponseMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiGet: apiGetMock,
  apiPut: apiPutMock,
  apiPost: apiPostMock,
  apiDeleteNoContent: apiDeleteMock,
  apiPostResponse: apiPostResponseMock,
  apiPutResponse: apiPutResponseMock,
  apiDeleteResponse: apiDeleteResponseMock,
}))

function versionHeaders(version: string) {
  return { 'x-resource-version': version }
}

import {
  addQuoteSheetItem,
  createQuoteSheet,
  deleteQuoteSheet,
  deleteQuoteSheetItem,
  fetchQuoteSheets,
  updateQuoteSheet,
  updateQuoteSheetHeader,
  updateQuoteSheetItem,
} from './quote-sheets'

const page = {
  content: [
    {
      id: '700500000000000130',
      sheetNo: '700500000000000130',
      name: '批次 1',
      projectId: '100000000000000001',
      projectName: '云潮筝鸣府',
      orderDate: '2026-09-16',
      refDate: '2026-09-16',
      refPeriod: '上午',
      lengthPremium: '30.00',
      locked: true,
      specQuantityLocked: true,
      status: '报价',
      brands: [{ brandName: '中天', freight: '30.00', sortOrder: 0 }],
      items: [
        {
          id: '700500000000000140',
          category: '螺纹钢',
          material: 'HRB400',
          spec: 12,
          length: '9米',
          ton: '10.5',
          prices: [
            {
              brandName: '中天',
              spotPrice: '3200.00',
              supplierId: '700500000000000200',
              supplierName: '杭州物资',
            },
          ],
        },
      ],
    },
  ],
  totalElements: 1,
  totalPages: 1,
  currentPage: 0,
  pageSize: 200,
  hasMore: false,
}

describe('quote-sheets API', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPutMock.mockReset()
    apiPostMock.mockReset()
    apiDeleteMock.mockReset()
    apiPostResponseMock.mockReset()
    apiPutResponseMock.mockReset()
    apiDeleteResponseMock.mockReset()
  })

  it('分页归一化雪花 ID 为字符串并解析供应商/数值字段', async () => {
    apiGetMock.mockResolvedValue(page)

    const [record] = await fetchQuoteSheets()

    expect(record.id).toBe('700500000000000130')
    expect(record.projectId).toBe('100000000000000001')
    expect(record.locked).toBe(true)
    expect(record.specQuantityLocked).toBe(true)
    expect(record.lengthPremium).toBe(30)
    expect(record.items[0].ton).toBe(10.5)
    expect(record.items[0].prices[0]).toMatchObject({
      brandName: '中天',
      spotPrice: 3200,
      supplierId: '700500000000000200',
      supplierName: '杭州物资',
    })
  })

  it('缺省规格数量锁定归一为 false', async () => {
    apiGetMock.mockResolvedValue({
      ...page,
      content: [{ ...page.content[0], specQuantityLocked: undefined }],
    })

    const [record] = await fetchQuoteSheets()

    expect(record.specQuantityLocked).toBe(false)
  })

  it('更新按路径 ID 提交整体替换请求体', async () => {
    apiPutMock.mockResolvedValue(page.content[0])

    await updateQuoteSheet('700500000000000130', {
      name: '批次 1',
      orderDate: '2026-09-16',
      refDate: '2026-09-16',
      refPeriod: '上午',
      lengthPremium: 30,
      locked: false,
      specQuantityLocked: false,
      brands: [{ brandName: '中天', freight: 30, sortOrder: 0 }],
      items: [
        {
          rowType: 'PRODUCT',
          category: '螺纹钢',
          material: 'HRB400',
          spec: 12,
          length: '9米',
          prices: [{ brandName: '中天', spotPrice: 3200, supplierId: '77' }],
        },
      ],
    })

    const [url, , payload] = apiPutMock.mock.calls[0]
    expect(url).toBe('/quote-sheets/700500000000000130')
    expect(payload.items[0].prices[0].supplierId).toBe('77')
  })

  it('更新请求携带 X-Resource-Version 版本并抑制 409/412/428 全局提示', async () => {
    apiPutMock.mockResolvedValue(page.content[0])

    await updateQuoteSheet(
      '700500000000000130',
      {
        name: '批次 1',
        orderDate: '2026-09-16',
        refDate: '2026-09-16',
        refPeriod: '上午',
        lengthPremium: 30,
        locked: false,
        specQuantityLocked: false,
        brands: [],
        items: [],
      },
      '3',
    )

    const config = apiPutMock.mock.calls[0][3] as {
      headers: Record<string, string>
      suppressGlobalErrorStatuses: number[]
    }
    expect(config.headers['X-Resource-Version']).toBe('3')
    expect(config.headers['If-Match']).toBeUndefined()
    expect(config.suppressGlobalErrorStatuses).toContain(409)
    expect(config.suppressGlobalErrorStatuses).toContain(412)
    expect(config.suppressGlobalErrorStatuses).toContain(428)
  })

  it('创建与删除走集合与资源路径', async () => {
    apiPostMock.mockResolvedValue(page.content[0])
    apiDeleteMock.mockResolvedValue(undefined)

    await createQuoteSheet({
      name: '批次 2',
      orderDate: '2026-09-16',
      refDate: '2026-09-16',
      refPeriod: '上午',
      lengthPremium: 30,
      locked: false,
      specQuantityLocked: false,
      brands: [],
      items: [],
    })
    await deleteQuoteSheet('700500000000000130')

    expect(apiPostMock.mock.calls[0][0]).toBe('/quote-sheets')
    expect(apiDeleteMock.mock.calls[0][0]).toBe(
      '/quote-sheets/700500000000000130',
    )
  })

  it('表头保存仅发送头字段且不携带 brands/items', async () => {
    apiPutMock.mockResolvedValue(page.content[0])

    await updateQuoteSheetHeader(
      '700500000000000130',
      {
        name: '批次 1',
        orderDate: '2026-09-16',
        refDate: '2026-09-16',
        refPeriod: '上午',
        lengthPremium: 30,
        locked: true,
        specQuantityLocked: true,
      },
      '3',
    )

    const [url, , payload, config] = apiPutMock.mock.calls[0]
    expect(url).toBe('/quote-sheets/700500000000000130')
    expect(payload).not.toHaveProperty('brands')
    expect(payload).not.toHaveProperty('items')
    expect(payload.specQuantityLocked).toBe(true)
    expect(
      (config as { headers: Record<string, string> }).headers[
        'X-Resource-Version'
      ],
    ).toBe('3')
  })

  it('行新增/整行替换/删除走行级子资源路径并回传服务端版本', async () => {
    apiPostResponseMock.mockResolvedValue({
      data: page.content[0].items[0],
      headers: versionHeaders('5'),
    })
    apiPutResponseMock.mockResolvedValue({
      data: page.content[0].items[0],
      headers: versionHeaders('6'),
    })
    apiDeleteResponseMock.mockResolvedValue({ headers: versionHeaders('7') })

    const created = await addQuoteSheetItem(
      '700500000000000130',
      {
        rowType: 'PRODUCT',
        category: '螺纹钢',
        material: 'HRB400',
        spec: 12,
        length: '9米',
        prices: [{ brandName: '中天', spotPrice: 3200 }],
      },
      '4',
    )
    const updated = await updateQuoteSheetItem(
      '700500000000000130',
      '700500000000000140',
      {
        rowType: 'PRODUCT',
        category: '螺纹钢',
        material: 'HRB400',
        spec: 12,
        length: '9米',
        prices: [{ brandName: '中天', spotPrice: 3300 }],
      },
      '5',
    )
    const deleted = await deleteQuoteSheetItem(
      '700500000000000130',
      '700500000000000140',
      '6',
    )

    expect(created.item?.id).toBe('700500000000000140')
    expect(created.version).toBe('5')
    expect(updated.version).toBe('6')
    expect(deleted.version).toBe('7')
    expect(apiPostResponseMock.mock.calls[0][0]).toBe(
      '/quote-sheets/700500000000000130/items',
    )
    expect(apiPutResponseMock.mock.calls[0][0]).toBe(
      '/quote-sheets/700500000000000130/items/700500000000000140',
    )
    expect(apiDeleteResponseMock.mock.calls[0][0]).toBe(
      '/quote-sheets/700500000000000130/items/700500000000000140',
    )
    const deleteConfig = apiDeleteResponseMock.mock.calls[0][1] as {
      headers: Record<string, string>
    }
    expect(deleteConfig.headers['X-Resource-Version']).toBe('6')
  })
})
