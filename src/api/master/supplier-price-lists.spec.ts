import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock, apiPostMock, apiPutMock, apiDeleteMock } = vi.hoisted(
  () => ({
    apiGetMock: vi.fn(),
    apiPostMock: vi.fn(),
    apiPutMock: vi.fn(),
    apiDeleteMock: vi.fn(),
  }),
)

vi.mock('@/api/core/client', () => ({
  apiGet: apiGetMock,
  apiPost: apiPostMock,
  apiPut: apiPutMock,
  apiDeleteNoContent: apiDeleteMock,
}))

import { parseApiContract } from '@/api/core/api-contract'
import {
  createSupplierPriceAdjustment,
  createSupplierPriceList,
  deleteSupplierPriceList,
  fetchAllSupplierPriceLists,
  fetchSupplierPriceList,
  fetchSupplierPriceListMatrix,
  fetchSupplierPriceLists,
  fetchSupplierPriceSpecCatalog,
  normalizePriceItemStatus,
  normalizePriceValue,
  updateSupplierPriceList,
} from './supplier-price-lists'

const SUPPLIER_ID = '1234567890123456789'
const LIST_ID = '1900000000000000001'

function listRow(overrides: Record<string, unknown> = {}) {
  return {
    id: LIST_ID,
    supplierId: SUPPLIER_ID,
    supplierName: '杭州中金钢铁',
    brandName: '安徽富鑫',
    updatedAt: '2026-09-28T14:35:00',
    itemCount: 3,
    ...overrides,
  }
}

function detailRow(overrides: Record<string, unknown> = {}) {
  return {
    ...listRow(),
    items: [
      {
        id: '1900000000000000011',
        category: '螺纹钢',
        material: '抗震钢E',
        spec: 12,
        length: '9米',
        price: '3220.00',
        priceStatus: 'NORMAL',
        remark: null,
        sortOrder: 0,
      },
      {
        id: '1900000000000000012',
        category: '螺纹钢',
        material: '抗震钢E',
        spec: 14,
        length: '9米',
        price: null,
        priceStatus: 'OUT_OF_STOCK',
        remark: '无货',
        sortOrder: 1,
      },
      {
        id: '1900000000000000013',
        category: '盘螺',
        material: '盘螺400E',
        spec: 8,
        length: '',
        price: 0,
        priceStatus: 'NEGOTIABLE',
        remark: null,
        sortOrder: 2,
      },
    ],
    ...overrides,
  }
}

describe('supplier-price-lists API', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPostMock.mockReset()
    apiPutMock.mockReset()
    apiDeleteMock.mockReset()
  })

  it('列表返回雪花 ID 字符串并归一化条目数', async () => {
    apiGetMock.mockResolvedValue({
      content: [
        listRow(),
        listRow({
          id: '1900000000000000002',
          itemCount: undefined,
          itemsCount: 7,
        }),
      ],
      totalElements: 2,
      totalPages: 1,
      currentPage: 0,
      pageSize: 30,
      hasMore: false,
    })

    const page = await fetchSupplierPriceLists({ page: 2, size: 30 })

    expect(page.content[0].id).toBe(LIST_ID)
    expect(page.content[0].supplierId).toBe(SUPPLIER_ID)
    expect(typeof page.content[0].id).toBe('string')
    expect(page.content[0].itemCount).toBe(3)
    expect(page.content[1].itemCount).toBe(7)
    // 前端页码 1 基 → 后端 0 基
    expect(apiGetMock.mock.calls[0][1]).toBeDefined()
    expect(apiGetMock.mock.calls[0][2].params.page).toBe(1)
    expect(apiGetMock.mock.calls[0][2].params.size).toBe(30)
  })

  it('列表携带筛选参数（供应商/品牌），不再有版本维度', async () => {
    apiGetMock.mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      currentPage: 0,
      pageSize: 30,
      hasMore: false,
    })
    await fetchSupplierPriceLists({
      supplierId: SUPPLIER_ID,
      brandName: '安徽富鑫',
      page: 1,
      size: 30,
    })
    expect(apiGetMock.mock.calls[0][2].params).toEqual({
      supplierId: SUPPLIER_ID,
      brandName: '安徽富鑫',
      page: 0,
      size: 30,
    })
  })

  it('R2: 更新时间优先取 updatedAt，后端只有 releasedAt 时兜底', async () => {
    apiGetMock.mockResolvedValue({
      content: [
        listRow(),
        listRow({
          id: '1900000000000000002',
          updatedAt: undefined,
          releasedAt: '2026-10-01T08:00:00',
        }),
      ],
      totalElements: 2,
      totalPages: 1,
      currentPage: 0,
      pageSize: 30,
      hasMore: false,
    })
    const page = await fetchSupplierPriceLists({ page: 1, size: 30 })
    expect(page.content[0].updatedAt).toBe('2026-09-28T14:35:00')
    expect(page.content[1].updatedAt).toBe('2026-10-01T08:00:00')
  })

  it('全量拉取按页累加直到取满 totalElements', async () => {
    apiGetMock
      .mockResolvedValueOnce({
        content: [listRow(), listRow({ id: '1900000000000000002' })],
        totalElements: 3,
        totalPages: 2,
        currentPage: 0,
        pageSize: 2,
        hasMore: true,
      })
      .mockResolvedValueOnce({
        content: [listRow({ id: '1900000000000000003' })],
        totalElements: 3,
        totalPages: 2,
        currentPage: 1,
        pageSize: 2,
        hasMore: false,
      })
    const all = await fetchAllSupplierPriceLists({ supplierId: SUPPLIER_ID })
    expect(all.map((row) => row.id)).toEqual([
      LIST_ID,
      '1900000000000000002',
      '1900000000000000003',
    ])
    expect(apiGetMock.mock.calls[0][2].params.page).toBe(0)
    expect(apiGetMock.mock.calls[1][2].params.page).toBe(1)
  })

  it('详情区分「不报价(null)」与「0 元」并归一化字符串规格/单价', async () => {
    apiGetMock.mockResolvedValue(detailRow())
    const detail = await fetchSupplierPriceList(LIST_ID)

    expect(detail.id).toBe(LIST_ID)
    expect(detail.items[0].price).toBe(3220)
    expect(detail.items[0].spec).toBe(12)
    expect(detail.items[1].price).toBeNull()
    expect(detail.items[1].priceStatus).toBe('OUT_OF_STOCK')
    expect(detail.items[2].price).toBe(0)
    expect(detail.items[2].price).not.toBeNull()
    expect(apiGetMock.mock.calls[0][0]).toBe(`/supplier-price-lists/${LIST_ID}`)
  })

  it('未知条目状态降级为 NORMAL，非法单价格式失败关闭', async () => {
    expect(normalizePriceItemStatus('WHATEVER')).toBe('NORMAL')
    expect(normalizePriceItemStatus(null)).toBe('NORMAL')
    expect(normalizePriceValue('')).toBeNull()
    expect(normalizePriceValue('0')).toBe(0)
    expect(normalizePriceValue('abc')).toBeNull()

    apiGetMock.mockResolvedValue(detailRow())
    await fetchSupplierPriceList(LIST_ID)
    // 客户端被 mock 后 schema 不会自动执行, 这里显式验证契约仍然失败关闭
    const schema = apiGetMock.mock.calls[0][1]
    expect(() =>
      parseApiContract(
        schema,
        detailRow({
          items: [
            {
              id: '1900000000000000011',
              category: '螺纹钢',
              material: '抗震钢E',
              spec: 12,
              length: '9米',
              price: 'abc',
              priceStatus: 'NORMAL',
              remark: null,
              sortOrder: 0,
            },
          ],
        }),
        'GET /supplier-price-lists/{id}',
      ),
    ).toThrow(/API 响应契约校验失败/)
  })

  it('规格全集返回整数 spec 并透传筛选参数', async () => {
    apiGetMock.mockResolvedValue([
      {
        category: '螺纹钢',
        material: '抗震钢E',
        spec: '12',
        length: '9米',
        sortOrder: 0,
      },
      {
        category: '螺纹钢',
        material: '抗震钢E',
        spec: 14,
        length: '12米',
        sortOrder: 1,
      },
    ])
    const catalog = await fetchSupplierPriceSpecCatalog({
      category: '螺纹钢',
      material: '抗震钢E',
    })
    expect(catalog).toHaveLength(2)
    expect(catalog[0].spec).toBe(12)
    expect(apiGetMock.mock.calls[0][0]).toBe(
      '/supplier-price-lists/spec-catalog',
    )
    expect(apiGetMock.mock.calls[0][2].params).toEqual({
      category: '螺纹钢',
      material: '抗震钢E',
    })
  })

  it('建表：不报价条目以 null 提交, 且带幂等键（同键重复由后端 409）', async () => {
    apiPostMock.mockResolvedValue(detailRow())
    const result = await createSupplierPriceList({
      supplierId: SUPPLIER_ID,
      brandName: '安徽富鑫',
      items: [
        {
          category: '螺纹钢',
          material: '抗震钢E',
          spec: 12,
          length: '9米',
          price: null,
          priceStatus: 'OUT_OF_STOCK',
          remark: null,
          sortOrder: 0,
        },
        {
          category: '螺纹钢',
          material: '抗震钢E',
          spec: 14,
          length: '9米',
          price: 0,
          priceStatus: 'NORMAL',
          remark: null,
          sortOrder: 1,
        },
      ],
    })

    const [url, , body, config] = apiPostMock.mock.calls[0]
    expect(url).toBe('/supplier-price-lists')
    expect(body.supplierId).toBe(SUPPLIER_ID)
    expect(body.brandName).toBe('安徽富鑫')
    expect(body.items[0].price).toBeNull()
    expect(body.items[1].price).toBe(0)
    // R2 取消版本: 请求体不得再带发布时刻/生效区间/仓库
    expect(body).not.toHaveProperty('releasedAt')
    expect(body).not.toHaveProperty('effectiveFrom')
    expect(body).not.toHaveProperty('warehouse')
    expect(config.headers['X-Idempotency-Key']).toBeTruthy()
    expect(result.id).toBe(LIST_ID)
  })

  it('全量替换条目：路径带 ID、请求体不重复携带 ID', async () => {
    apiPutMock.mockResolvedValue(detailRow())
    await updateSupplierPriceList(LIST_ID, {
      supplierId: SUPPLIER_ID,
      brandName: '安徽富鑫',
      items: [],
    })
    const [url, , body] = apiPutMock.mock.calls[0]
    expect(url).toBe(`/supplier-price-lists/${LIST_ID}`)
    expect(body).not.toHaveProperty('id')
    expect(body).toEqual({
      supplierId: SUPPLIER_ID,
      brandName: '安徽富鑫',
      items: [],
    })
  })

  it('删除现表走 204 无响应体接口', async () => {
    apiDeleteMock.mockResolvedValue(undefined)
    await deleteSupplierPriceList(LIST_ID)
    expect(apiDeleteMock.mock.calls[0][0]).toBe(
      `/supplier-price-lists/${LIST_ID}`,
    )
  })

  it('整体加减：itemIds 为空时省略该字段，响应区分不报价', async () => {
    apiPostMock.mockResolvedValue({
      adjustmentId: '1900000000000000021',
      affectedCount: 2,
      skippedCount: 1,
      items: [
        { id: '1900000000000000011', price: '3270.00' },
        { id: '1900000000000000012', price: null },
      ],
    })
    const result = await createSupplierPriceAdjustment(LIST_ID, {
      mode: 'ADD',
      amount: 50,
      itemIds: [],
    })
    const [url, , body] = apiPostMock.mock.calls[0]
    expect(url).toBe(`/supplier-price-lists/${LIST_ID}/price-adjustments`)
    expect(body).toEqual({ mode: 'ADD', amount: 50 })
    expect(result.adjustmentId).toBe('1900000000000000021')
    expect(result.affectedCount).toBe(2)
    expect(result.skippedCount).toBe(1)
    expect(result.items[0].price).toBe(3270)
    expect(result.items[1].price).toBeNull()
  })

  it('整体加减：显式指定 itemIds 时保持字符串', async () => {
    apiPostMock.mockResolvedValue({
      adjustmentId: '1900000000000000022',
      affectedCount: 0,
      items: [],
    })
    await createSupplierPriceAdjustment(LIST_ID, {
      mode: 'SUBTRACT',
      amount: 20.5,
      itemIds: ['1900000000000000011'],
    })
    expect(apiPostMock.mock.calls[0][2]).toEqual({
      mode: 'SUBTRACT',
      amount: 20.5,
      itemIds: ['1900000000000000011'],
    })
  })

  it('矩阵投影：解析列/行单元格并区分不报价', async () => {
    apiGetMock.mockResolvedValue({
      columns: [
        {
          supplierId: SUPPLIER_ID,
          supplierName: '杭州中金钢铁',
          brandName: '安徽富鑫',
          listId: LIST_ID,
          releasedAt: '2026-09-28T14:35:00',
        },
        {
          supplierId: '1234567890123456790',
          supplierName: '浙江铁都',
          brandName: '萍钢',
          listId: null,
          releasedAt: null,
        },
      ],
      rows: [
        {
          category: '螺纹钢',
          material: '抗震钢E',
          spec: 12,
          length: '9米',
          cells: [
            {
              brandName: '安徽富鑫',
              price: 3220,
              priceStatus: 'NORMAL',
              listId: LIST_ID,
            },
            {
              brandName: '萍钢',
              price: null,
              priceStatus: 'NEGOTIABLE',
              listId: null,
            },
          ],
        },
      ],
    })
    const matrix = await fetchSupplierPriceListMatrix({
      supplierIds: [SUPPLIER_ID],
      brandNames: ['安徽富鑫'],
    })
    expect(matrix.columns[0].listId).toBe(LIST_ID)
    expect(matrix.columns[1].listId).toBeNull()
    expect(matrix.rows[0].cells[0].price).toBe(3220)
    expect(matrix.rows[0].cells[1].price).toBeNull()
    expect(matrix.rows[0].cells[1].priceStatus).toBe('NEGOTIABLE')
    expect(apiGetMock.mock.calls[0][2].params).toEqual({
      supplierIds: SUPPLIER_ID,
      brandNames: '安徽富鑫',
    })
  })

  it('分页响应缺失 hasMore 时按契约失败，不做静默兜底', async () => {
    apiGetMock.mockResolvedValue({
      content: [listRow()],
      totalElements: 1,
      totalPages: 1,
      currentPage: 0,
      pageSize: 30,
    })
    await fetchSupplierPriceLists({ page: 1, size: 30 })
    const schema = apiGetMock.mock.calls[0][1]
    expect(() =>
      parseApiContract(
        schema,
        {
          content: [listRow()],
          totalElements: 1,
          totalPages: 1,
          currentPage: 0,
          pageSize: 30,
        },
        'GET /supplier-price-lists',
      ),
    ).toThrow(/API 响应契约校验失败/)
  })

  it('雪花 ID 为大整数 number 时失败关闭（避免精度丢失）', async () => {
    // 刻意构造「超出 Number.MAX_SAFE_INTEGER」的场景（字面量会触发 noPrecisionLoss）
    const unsafeId = Number('1234567890123456789')
    expect(Number.isSafeInteger(unsafeId)).toBe(false)
    apiGetMock.mockResolvedValue({
      content: [listRow({ id: unsafeId })],
      totalElements: 1,
      totalPages: 1,
      currentPage: 0,
      pageSize: 30,
      hasMore: false,
    })
    await expect(
      fetchSupplierPriceLists({ page: 1, size: 30 }),
    ).rejects.toThrow(/实体 ID 契约无效/)
  })
})
