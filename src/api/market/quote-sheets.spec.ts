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
  reorderQuoteSheetItems,
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

/** 用同一张单据、只替换第一行明细的 prices 数组，便于逐态断言归一化结果。 */
function sheetWithPrices(prices: Record<string, unknown>[]) {
  return {
    ...page,
    content: [
      {
        ...page.content[0],
        items: [{ ...page.content[0].items[0], prices }],
      },
    ],
  }
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

  /*
   * 现货价「按抗震牌号代取」的来源材质必须原样透传，且三态可区分：
   *   有值 → 字符串；后端明确未代取 → `null`；字段缺失 → `undefined`（key 不存在）。
   *
   * 这三态不能合并：角标只在"有值"时显示，而 `null` 表示"查过、确认没代取"，
   * 与"这条响应没带这个信息"（旧后端/其它写路径）是不同结论。
   * 归一化层用 looseObject + 条件展开实现，若有人改回 `|| undefined` 这类写法，
   * 下面第 2 条会立刻变红。
   */
  it('现货价来源材质: 有值时透传到归一化结果', async () => {
    apiGetMock.mockResolvedValue(
      sheetWithPrices([
        {
          brandName: '中天',
          spotPrice: '3200.00',
          spotSourceMaterial: 'HRB400E',
        },
      ]),
    )

    const [record] = await fetchQuoteSheets()

    expect(record.items[0].prices[0].spotSourceMaterial).toBe('HRB400E')
  })

  it('现货价来源材质: 后端显式 null 时保留 null（不等于缺字段）', async () => {
    apiGetMock.mockResolvedValue(
      sheetWithPrices([
        { brandName: '中天', spotPrice: '3200.00', spotSourceMaterial: null },
      ]),
    )

    const [record] = await fetchQuoteSheets()
    const price = record.items[0].prices[0]

    expect(price.spotSourceMaterial).toBeNull()
    // null 必须真的"在"：被抹成 undefined 时这里会失败
    expect('spotSourceMaterial' in price).toBe(true)
  })

  it('现货价来源材质: 字段缺失时归一为 undefined', async () => {
    apiGetMock.mockResolvedValue(
      sheetWithPrices([{ brandName: '中天', spotPrice: '3200.00' }]),
    )

    const [record] = await fetchQuoteSheets()
    const price = record.items[0].prices[0]

    expect(price.spotSourceMaterial).toBeUndefined()
    expect('spotSourceMaterial' in price).toBe(false)
  })

  it('缺省规格数量锁定归一为 false', async () => {
    apiGetMock.mockResolvedValue({
      ...page,
      content: [{ ...page.content[0], specQuantityLocked: undefined }],
    })

    const [record] = await fetchQuoteSheets()

    expect(record.specQuantityLocked).toBe(false)
  })

  it('保留服务端创建/更新时间, 供保存时间展示', async () => {
    apiGetMock.mockResolvedValue({
      ...page,
      content: [
        {
          ...page.content[0],
          createdAt: '2026-09-28T18:01:59.737092+08:00',
          updatedAt: '2026-10-09T13:50:43.120000+08:00',
        },
      ],
    })

    const [record] = await fetchQuoteSheets()

    expect(record.createdAt).toBe('2026-09-28T18:01:59.737092+08:00')
    expect(record.updatedAt).toBe('2026-10-09T13:50:43.120000+08:00')
  })

  it('服务端未返回时间时归一为缺省, 不产生空字符串字段', async () => {
    apiGetMock.mockResolvedValue({
      ...page,
      content: [{ ...page.content[0], createdAt: null, updatedAt: null }],
    })

    const [record] = await fetchQuoteSheets()

    expect(record.createdAt).toBeUndefined()
    expect(record.updatedAt).toBeUndefined()
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

/*
 * 后端 V2QuoteSheetController 是类级 @IdempotencyRequired：POST/PUT/DELETE 缺
 * X-Idempotency-Key 直接 422。这里逐个写接口断言"必须有非空 key"，并锁定
 * "同一次用户动作内重试传同一个 key" 的复用语义。
 */
describe('报价单写请求的幂等键(X-Idempotency-Key)', () => {
  const sheetId = '700500000000000130'
  const itemId = '700500000000000140'
  const sheetPayload = {
    name: '批次 1',
    orderDate: '2026-09-16',
    refDate: '2026-09-16',
    refPeriod: '上午',
    lengthPremium: 30,
    locked: false,
    specQuantityLocked: false,
    brands: [],
    items: [],
  }
  const headerPayload = {
    name: '批次 1',
    orderDate: '2026-09-16',
    refDate: '2026-09-16',
    refPeriod: '上午',
    lengthPremium: 30,
    locked: false,
    specQuantityLocked: false,
  }
  const itemPayload = {
    rowType: 'PRODUCT' as const,
    category: '螺纹钢',
    material: 'HRB400',
    spec: 12,
    length: '9米',
    prices: [],
  }

  function idempotencyKeyOf(config: unknown): string | undefined {
    return (config as { headers?: Record<string, string> } | undefined)
      ?.headers?.['X-Idempotency-Key']
  }

  beforeEach(() => {
    apiGetMock.mockReset()
    apiPutMock.mockReset()
    apiPostMock.mockReset()
    apiDeleteMock.mockReset()
    apiPostResponseMock.mockReset()
    apiPutResponseMock.mockReset()
    apiDeleteResponseMock.mockReset()
    apiPostMock.mockResolvedValue(page.content[0])
    apiPutMock.mockResolvedValue(page.content[0])
    apiDeleteMock.mockResolvedValue(undefined)
    apiPostResponseMock.mockResolvedValue({
      data: page.content[0].items[0],
      headers: {},
    })
    apiPutResponseMock.mockResolvedValue({
      data: page.content[0].items[0],
      headers: {},
    })
    apiDeleteResponseMock.mockResolvedValue({ headers: {} })
  })

  it('创建/更新/表头/删除/行新增/行替换/排序/行删除 全部带非空幂等键', async () => {
    await createQuoteSheet(sheetPayload)
    await updateQuoteSheet(sheetId, sheetPayload, '1')
    await updateQuoteSheetHeader(sheetId, headerPayload, '2')
    await deleteQuoteSheet(sheetId)
    await addQuoteSheetItem(sheetId, itemPayload, '3')
    await updateQuoteSheetItem(sheetId, itemId, itemPayload, '4')
    await reorderQuoteSheetItems(sheetId, [itemId], '5')
    await deleteQuoteSheetItem(sheetId, itemId, '6')

    const writeConfigs = [
      apiPostMock.mock.calls[0][3],
      apiPutMock.mock.calls[0][3],
      apiPutMock.mock.calls[1][3],
      apiDeleteMock.mock.calls[0][1],
      apiPostResponseMock.mock.calls[0][3],
      apiPutResponseMock.mock.calls[0][3],
      apiPutMock.mock.calls[2][3],
      apiDeleteResponseMock.mock.calls[0][1],
    ]

    expect(writeConfigs).toHaveLength(8)
    for (const config of writeConfigs) {
      const key = idempotencyKeyOf(config)
      expect(typeof key).toBe('string')
      expect(key?.length).toBeGreaterThan(0)
      // 幂等键不应顺带抑制全局错误提示（422 仍要能看到"缺少幂等键"）
      expect(
        (config as { suppressGlobalErrorStatuses?: readonly number[] })
          .suppressGlobalErrorStatuses ?? [],
      ).not.toContain(422)
    }
  })

  it('调用方传入的幂等键被原样复用(同一次用户动作内重试不换 key)', async () => {
    await updateQuoteSheet(sheetId, sheetPayload, '1', 'retry-action-key')
    await updateQuoteSheet(sheetId, sheetPayload, '2', 'retry-action-key')

    expect(idempotencyKeyOf(apiPutMock.mock.calls[0][3])).toBe(
      'retry-action-key',
    )
    expect(idempotencyKeyOf(apiPutMock.mock.calls[1][3])).toBe(
      'retry-action-key',
    )
  })

  it('未显式传 key 时由请求创建期生成, 不同请求各自独立', async () => {
    await updateQuoteSheet(sheetId, sheetPayload, '1')
    await updateQuoteSheet(sheetId, sheetPayload, '2')

    const first = idempotencyKeyOf(apiPutMock.mock.calls[0][3])
    const second = idempotencyKeyOf(apiPutMock.mock.calls[1][3])
    expect(first).toBeTruthy()
    expect(second).toBeTruthy()
    expect(first).not.toBe(second)
  })

  it('幂等键与并发版本头/全局错误抑制配置共存', async () => {
    await updateQuoteSheet(sheetId, sheetPayload, '3', 'action-key')

    const config = apiPutMock.mock.calls[0][3] as {
      headers: Record<string, string>
      suppressGlobalErrorStatuses?: readonly number[]
    }
    expect(config.headers['X-Idempotency-Key']).toBe('action-key')
    expect(config.headers['X-Resource-Version']).toBe('3')
    expect(config.suppressGlobalErrorStatuses).toEqual(
      expect.arrayContaining([409, 412, 428]),
    )
  })
})
