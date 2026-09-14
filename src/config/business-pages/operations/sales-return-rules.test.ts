import { describe, expect, it } from 'vitest'
import { buildSalesReturnSaveRequestFromCandidates } from '@/config/business-pages/operations/sales-return-rules'
import type {
  SalesReturnCandidateItem,
  SalesReturnCandidates,
} from '@/shared/schemas/module-record'

function buildCandidateItem(
  overrides: Partial<SalesReturnCandidateItem> = {},
): SalesReturnCandidateItem {
  return {
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
    pieceWeightTon: 1.5,
    piecesPerBundle: 0,
    outboundQuantity: 10,
    returnedQuantity: 2,
    returnableQuantity: 8,
    unitPrice: 100,
    ...overrides,
  }
}

function buildCandidates(
  items: SalesReturnCandidateItem[],
): SalesReturnCandidates {
  return {
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
    items,
  }
}

describe('销售退货来源候选映射', () => {
  it('携带来源出库明细 ID、快照字段并计算重量与金额', () => {
    const item = buildCandidateItem()
    const payload = buildSalesReturnSaveRequestFromCandidates(
      buildCandidates([item]),
      {
        returnDate: '2026-09-14',
        selections: [{ item, quantity: 4 }],
      },
    )

    expect(payload.returnDate).toBe('2026-09-14')
    expect(payload.status).toBe('草稿')
    expect(payload.customerId).toBe('3003')
    expect(payload.salesOrderNo).toBe('SO20260914001')
    expect(payload.items).toHaveLength(1)
    expect(payload.items[0]).toMatchObject({
      sourceSalesOutboundItemId: '9009',
      sourceSalesOrderItemId: '1010',
      materialId: '1111',
      materialCode: 'M-001',
      warehouseId: '5005',
      quantity: 4,
      pieceWeightTon: 1.5,
      weightTon: 6,
      unitPrice: 100,
      amount: 600,
    })
  })

  it('数量被限制在可退数量内且过滤为 0 的行', () => {
    const returnable = buildCandidateItem({ sourceSalesOutboundItemId: '1' })
    const none = buildCandidateItem({ sourceSalesOutboundItemId: '2' })
    const payload = buildSalesReturnSaveRequestFromCandidates(
      buildCandidates([returnable, none]),
      {
        returnDate: '2026-09-14',
        selections: [
          { item: returnable, quantity: 99 },
          { item: none, quantity: 0 },
        ],
      },
    )

    expect(payload.items).toHaveLength(1)
    expect(payload.items[0].sourceSalesOutboundItemId).toBe('1')
    expect(payload.items[0].quantity).toBe(8)
  })

  it('无可退数量时不生成任何明细行', () => {
    const item = buildCandidateItem({ returnableQuantity: 0 })
    const payload = buildSalesReturnSaveRequestFromCandidates(
      buildCandidates([item]),
      {
        returnDate: '2026-09-14',
        selections: [{ item, quantity: 0 }],
      },
    )
    expect(payload.items).toHaveLength(0)
  })
})
