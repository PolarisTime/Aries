import { describe, expect, it } from 'vitest'
import {
  getMainFlowListResponseSchema,
  mainFlowDetailResponseSchemas,
  parseMainFlowSaveRequest,
  salesReturnCandidatesSchema,
} from '@/shared/schemas/module-record'

const salesReturnDetail = {
  id: '1001',
  returnNo: 'RT20260914001',
  salesOrderNo: 'SO20260914001',
  customerId: '3003',
  customerName: '测试客户',
  projectId: '4004',
  projectName: '测试项目',
  warehouseId: '5005',
  warehouseName: '主仓',
  settlementCompanyId: '6006',
  settlementCompanyName: '测试结算主体',
  returnDate: '2026-09-14',
  totalWeight: 3.5,
  totalAmount: 700,
  status: '草稿',
  deletedFlag: false,
  remark: null,
  items: [
    {
      id: '7007',
      lineNo: 1,
      sourceSalesOutboundItemId: '8008',
      sourceSalesOutboundNo: 'OB20260914001',
      sourceSalesOrderItemId: '9009',
      sourceSalesOrderNo: 'SO20260914001',
      sourceFreightBillId: null,
      sourceFreightBillNo: null,
      settlementCompanyId: '6006',
      settlementCompanyName: '测试结算主体',
      materialId: '1010',
      materialCode: 'M-001',
      brand: 'HRB',
      category: '螺纹钢',
      material: 'HRB400',
      spec: 'Φ20',
      length: null,
      unit: '件',
      warehouseId: '5005',
      warehouseName: '主仓',
      batchNo: null,
      batchNoNormalized: null,
      quantity: 2,
      quantityUnit: '件',
      pieceWeightTon: 1.75,
      piecesPerBundle: 0,
      weightTon: 3.5,
      unitPrice: 350,
      amount: 700,
    },
  ],
}

describe('销售退货单契约', () => {
  it('详情响应雪花 ID 保持十进制字符串', () => {
    const parsed =
      mainFlowDetailResponseSchemas['sales-return'].parse(salesReturnDetail)
    expect(parsed.id).toBe('1001')
    expect(parsed.items[0].sourceSalesOutboundItemId).toBe('8008')
    expect(parsed.items[0].sourceSalesOutboundNo).toBe('OB20260914001')
    expect(parsed.items[0].id).toBe('7007')
  })

  it('详情响应容忍后端新增未知字段', () => {
    const parsed = mainFlowDetailResponseSchemas['sales-return'].parse({
      ...salesReturnDetail,
      addedByBackend: 'ignored',
      items: [
        {
          ...salesReturnDetail.items[0],
          futureField: 'ignored',
        },
      ],
    })
    expect(parsed.id).toBe('1001')
  })

  it('列表响应 items 固定为 null 并被剔除', () => {
    const response = getMainFlowListResponseSchema('sales-return').parse({
      content: [{ ...salesReturnDetail, items: null, chargeItems: null }],
      totalElements: 1,
      totalPages: 1,
      currentPage: 0,
      pageSize: 30,
      hasMore: false,
    })
    expect(response.content[0]).not.toHaveProperty('items')
    expect(response.content[0].returnNo).toBe('RT20260914001')
  })

  it('保存请求保留来源出库明细 ID 与数量，sourceSalesOrderItemId 可省略', () => {
    const parsed = parseMainFlowSaveRequest('sales-return', {
      returnDate: '2026-09-14',
      remark: null,
      audit: true,
      items: [
        {
          sourceSalesOutboundItemId: '8008',
          quantity: 2,
        },
      ],
    }) as {
      audit?: boolean
      items: Array<{
        sourceSalesOutboundItemId: string
        quantity: number
      }>
    }
    expect(parsed.audit).toBe(true)
    expect(parsed.items[0].sourceSalesOutboundItemId).toBe('8008')
    expect(parsed.items[0].quantity).toBe(2)
  })

  it('缺少来源出库明细 ID 的保存请求被拒绝', () => {
    expect(() =>
      parseMainFlowSaveRequest('sales-return', {
        returnDate: '2026-09-14',
        items: [{ sourceSalesOrderItemId: '9009', quantity: 1 }],
      }),
    ).toThrow()
  })

  it('缺少退货日期的保存请求被拒绝', () => {
    expect(() =>
      parseMainFlowSaveRequest('sales-return', {
        items: [{ sourceSalesOutboundItemId: '8008', quantity: 1 }],
      }),
    ).toThrow()
  })
})

describe('销售退货来源候选契约', () => {
  it('解析候选头与可退数量，雪花 ID 保持字符串', () => {
    const parsed = salesReturnCandidatesSchema.parse({
      salesOutboundId: '8008',
      salesOutboundNo: 'OB20260914001',
      salesOrderNo: 'SO20260914001',
      customerId: '3003',
      customerName: '测试客户',
      projectId: '4004',
      projectName: '测试项目',
      warehouseId: '5005',
      warehouseName: '主仓',
      settlementCompanyId: '6006',
      settlementCompanyName: '测试结算主体',
      items: [
        {
          sourceSalesOutboundItemId: '9009',
          sourceSalesOrderItemId: '1010',
          materialId: '1111',
          materialCode: 'M-001',
          brand: 'HRB',
          category: '螺纹钢',
          material: 'HRB400',
          spec: 'Φ20',
          length: null,
          unit: '件',
          warehouseId: '5005',
          warehouseName: '主仓',
          batchNo: null,
          quantityUnit: '件',
          pieceWeightTon: 1.75,
          piecesPerBundle: 0,
          outboundQuantity: 10,
          returnedQuantity: 3,
          returnableQuantity: 7,
          unitPrice: 350,
        },
      ],
    })

    expect(parsed.salesOutboundId).toBe('8008')
    expect(parsed.items[0].sourceSalesOutboundItemId).toBe('9009')
    expect(parsed.items[0].returnableQuantity).toBe(7)
  })
})
