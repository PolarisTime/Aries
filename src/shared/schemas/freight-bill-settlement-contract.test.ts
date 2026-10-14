import { describe, expect, it } from 'vitest'
import {
  getMainFlowDetailResponseSchema,
  getMainFlowListResponseSchema,
  parseMainFlowSaveRequest,
} from '@/shared/schemas/module-record'

/**
 * 物流单结算方式的前后端 JSON 契约测试。
 *
 * <p>与后端 `FreightBillSettlementJsonContractTest` 使用同一组数值钉住形状：
 * `unitPrice` 100.50 / `totalFreight` 1800.55（= 结算金额）/ `fixedFreightAmount` 1800.55 /
 * `tonnageFreightAmount` 1250.63（只读参考）/ `settlementMode` "FIXED" /
 * `id` "9223372036854775807"（雪花 ID 十进制字符串）。</p>
 *
 * <p>两个关键保护：
 * 1. 这三个新字段目前声明为**可缺省**——旧后端（无字段）与新后端都能解析，
 *    避免 strictObject 因未知/缺失字段让整页解析失败；后端上线后再收紧为必填。
 * 2. 结算方式是字符串枚举且**大小写敏感**：后端 `"TONNAGE"` 会解析失败（不是静默落到默认值），
 *    前端 schema 也必须同样失败关闭，否则错误值会一路发到接口。</p>
 */

const listRecord = (overrides: Record<string, unknown> = {}) => ({
  id: '9223372036854775807',
  billNo: 'WL20261014001',
  carrierId: '9223372036854775806',
  carrierCode: 'YS001',
  carrierName: '测试物流商',
  settlementCompanyId: null,
  settlementCompanyName: null,
  vehicleId: null,
  vehiclePlate: null,
  billTime: '2026-10-14 09:00:00',
  unitPrice: 100.5,
  totalWeight: 12.5,
  totalFreight: 1800.55,
  settlementMode: 'FIXED',
  fixedFreightAmount: 1800.55,
  tonnageFreightAmount: 1250.63,
  status: '草稿',
  deletedFlag: false,
  remark: null,
  ...overrides,
})

const listResponse = (record: Record<string, unknown>) => ({
  content: [
    { ...record, items: null, chargeItems: null, totalExpenseAmount: null },
  ],
  totalElements: 1,
  totalPages: 1,
  currentPage: 0,
  pageSize: 20,
  hasMore: false,
})

const detailResponse = (record: Record<string, unknown>) => ({
  ...record,
  items: [
    {
      id: '9223372036854775805',
      lineNo: 1,
      sourceNo: 'SO20261014001',
      settlementCompanyId: null,
      settlementCompanyName: null,
      customerId: null,
      customerName: null,
      projectId: null,
      projectName: null,
      materialId: null,
      materialCode: 'M001',
      materialName: '螺纹钢',
      brand: 'HRB400',
      category: '螺纹钢',
      material: 'HRB400',
      spec: 'Φ20',
      length: null,
      quantity: 10,
      quantityUnit: '件',
      pieceWeightTon: 1.25,
      piecesPerBundle: 0,
      batchNo: null,
      batchNoNormalized: null,
      weightTon: 12.5,
      warehouseId: null,
      warehouseName: null,
      sourceFreightBillId: null,
      sourceFreightBillItemId: null,
      sourceSalesOrderItemId: '9223372036854775804',
    },
  ],
  totalExpenseAmount: 0,
  chargeItems: [],
})

describe('物流单结算方式响应契约', () => {
  it('列表响应解析三个新字段（雪花 ID 仍是十进制字符串）', () => {
    const schema = getMainFlowListResponseSchema('freight-bill')
    const parsed = schema.parse(listResponse(listRecord())) as unknown as {
      content: Array<Record<string, unknown>>
    }

    const record = parsed.content[0]
    expect(record.settlementMode).toBe('FIXED')
    expect(record.fixedFreightAmount).toBe(1800.55)
    expect(record.tonnageFreightAmount).toBe(1250.63)
    expect(typeof record.id).toBe('string')
    expect(record.id).toBe('9223372036854775807')
  })

  it('详情响应同样解析三个新字段', () => {
    const schema = getMainFlowDetailResponseSchema('freight-bill')
    const parsed = schema.parse(detailResponse(listRecord())) as Record<
      string,
      unknown
    >

    expect(parsed.settlementMode).toBe('FIXED')
    expect(parsed.fixedFreightAmount).toBe(1800.55)
    expect(parsed.tonnageFreightAmount).toBe(1250.63)
    expect(parsed.totalFreight).toBe(1800.55)
  })

  it('按吨位模式下 fixedFreightAmount 为 null 且 tonnageFreightAmount 是结算金额', () => {
    const schema = getMainFlowListResponseSchema('freight-bill')
    const parsed = schema.parse(
      listResponse(
        listRecord({
          settlementMode: 'BY_TONNAGE',
          fixedFreightAmount: null,
          totalFreight: 1250.63,
        }),
      ),
    ) as unknown as { content: Array<Record<string, unknown>> }

    expect(parsed.content[0].fixedFreightAmount).toBeNull()
    expect(parsed.content[0].totalFreight).toBe(1250.63)
  })

  it('后端未上线时（三个新字段缺省）仍能解析列表与详情', () => {
    const {
      settlementMode: _settlementMode,
      fixedFreightAmount: _fixedFreightAmount,
      tonnageFreightAmount: _tonnageFreightAmount,
      ...legacy
    } = listRecord()

    expect(() =>
      getMainFlowListResponseSchema('freight-bill').parse(listResponse(legacy)),
    ).not.toThrow()
    expect(() =>
      getMainFlowDetailResponseSchema('freight-bill').parse(
        detailResponse(legacy),
      ),
    ).not.toThrow()
  })

  it('结算方式枚举大小写敏感：TONNAGE / 小写一律解析失败', () => {
    for (const settlementMode of ['TONNAGE', 'fixed', 'By_Tonnage']) {
      expect(() =>
        getMainFlowListResponseSchema('freight-bill').parse(
          listResponse(listRecord({ settlementMode })),
        ),
      ).toThrow()
    }
  })
})

describe('物流单结算方式请求契约', () => {
  const basePayload = {
    carrierName: '测试物流商',
    billTime: '2026-10-14 09:00:00',
    unitPrice: 100.5,
    items: [{ weightTon: 12.5 }],
  }

  it('固定运费请求携带 FIXED + 数字金额', () => {
    const parsed = parseMainFlowSaveRequest('freight-bill', {
      ...basePayload,
      settlementMode: 'FIXED',
      fixedFreightAmount: 1800.55,
    }) as Record<string, unknown>

    expect(parsed.settlementMode).toBe('FIXED')
    expect(parsed.fixedFreightAmount).toBe(1800.55)
  })

  it('按吨位请求显式传 null（清空遗留固定金额）', () => {
    const parsed = parseMainFlowSaveRequest('freight-bill', {
      ...basePayload,
      settlementMode: 'BY_TONNAGE',
      fixedFreightAmount: null,
    }) as Record<string, unknown>

    expect(parsed.settlementMode).toBe('BY_TONNAGE')
    expect(parsed.fixedFreightAmount).toBeNull()
  })

  it('两个字段省略仍合法（兼容旧客户端与「省略即保持原值」分支）', () => {
    expect(() =>
      parseMainFlowSaveRequest('freight-bill', { ...basePayload }),
    ).not.toThrow()
  })

  it('非法枚举值失败关闭，不会把错误模式发给后端', () => {
    for (const settlementMode of ['TONNAGE', 'fixed', 'BYTONNAGE']) {
      expect(() =>
        parseMainFlowSaveRequest('freight-bill', {
          ...basePayload,
          settlementMode,
        }),
      ).toThrow()
    }
  })
})
