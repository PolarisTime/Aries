import { describe, expect, it } from 'vitest'
import {
  freightSalesOrderCandidatePageResponseSchema,
  getMainFlowDetailResponseSchema,
  getMainFlowListResponseSchema,
  salesOrderOutboundCandidatePageResponseSchema,
} from './module-record'

const purchaseOrder = {
  id: '1',
  orderNo: 'PO-1',
  supplierId: null,
  supplierCode: null,
  supplierName: '供应商',
  orderDate: '2026-09-01T00:00:00',
  buyerName: null,
  settlementCompanyId: null,
  settlementCompanyName: null,
  totalWeight: 0,
  totalAmount: 0,
  status: '草稿',
  deletedFlag: false,
  remark: null,
}

const salesOrder = {
  id: '2',
  orderNo: 'SO-1',
  purchaseInboundNo: null,
  purchaseOrderNo: null,
  customerCode: null,
  customerId: null,
  customerName: '客户',
  projectId: null,
  projectName: '项目',
  settlementCompanyId: null,
  settlementCompanyName: null,
  deliveryDate: '2026-09-01',
  salesName: '销售员',
  totalWeight: 0,
  totalAmount: 0,
  status: '草稿',
  deletedFlag: false,
  remark: null,
}

const purchaseOrderItem = {
  id: '11',
  lineNo: 1,
  materialId: null,
  materialCode: 'M-1',
  brand: '品牌',
  category: '品类',
  material: '材质',
  spec: '规格',
  length: null,
  unit: '吨',
  settlementCompanyId: null,
  settlementCompanyName: null,
  warehouseId: null,
  warehouseName: null,
  batchNo: 'B-1',
  batchNoNormalized: null,
  remainingQuantity: 1,
  salesRemainingQuantity: 1,
  salesRemainingWeightTon: 1,
  quantity: 1,
  quantityUnit: null,
  pieceWeightTon: 1,
  piecesPerBundle: 1,
  weightTon: 1,
  actualWeightTon: null,
  unitPrice: 1,
  amount: 1,
}

const salesOrderItem = {
  id: '21',
  lineNo: 1,
  materialId: null,
  materialCode: 'M-1',
  brand: '品牌',
  category: '品类',
  material: '材质',
  spec: '规格',
  length: null,
  unit: '吨',
  sourceInboundItemId: null,
  sourcePurchaseOrderItemId: null,
  settlementCompanyId: null,
  settlementCompanyName: null,
  warehouseId: null,
  warehouseName: '仓库',
  batchNo: null,
  batchNoNormalized: null,
  quantity: 1,
  quantityUnit: null,
  pieceWeightTon: 1,
  piecesPerBundle: 1,
  weightTon: 1,
  unitPrice: 1,
  amount: 1,
  originalWeightTon: null,
}

const page = (record: object) => ({
  content: [{ ...record, items: null, chargeItems: null }],
  totalElements: 1,
  totalPages: 1,
  currentPage: 0,
  pageSize: 30,
  hasMore: false,
})

describe('订单引用状态响应契约', () => {
  it('采购订单列表缺少引用状态时默认为未引用', () => {
    const response = getMainFlowListResponseSchema('purchase-order').parse(
      page(purchaseOrder),
    )

    expect(response.content[0]).toMatchObject({
      referencedBySalesOrder: false,
      referencedByPurchaseInbound: false,
    })
  })

  it('销售订单列表缺少引用状态时默认为未引用', () => {
    const response = getMainFlowListResponseSchema('sales-order').parse(
      page(salesOrder),
    )

    expect(response.content[0]).toMatchObject({
      referencedByFreightBill: false,
      referencedBySalesOutbound: false,
    })
  })

  it('订单详情缺少引用状态时同样默认为未引用', () => {
    const purchaseResponse = getMainFlowDetailResponseSchema(
      'purchase-order',
    ).parse({
      ...purchaseOrder,
      items: [purchaseOrderItem],
      chargeItems: [],
    })
    const salesResponse = getMainFlowDetailResponseSchema('sales-order').parse({
      ...salesOrder,
      items: [salesOrderItem],
      chargeItems: [],
    })

    expect(purchaseResponse).toMatchObject({
      referencedBySalesOrder: false,
      referencedByPurchaseInbound: false,
    })
    expect(salesResponse).toMatchObject({
      referencedByFreightBill: false,
      referencedBySalesOutbound: false,
    })
  })
})

describe('销售订单价格规定快照契约', () => {
  it('列表响应 priceFloatValue 为 BigDecimal 数字时正常解析', () => {
    const response = getMainFlowListResponseSchema('sales-order').parse(
      page({
        ...salesOrder,
        priceRuleId: '1000001',
        priceRuleName: '默认',
        priceFloatMode: 'ADD',
        priceFloatValue: 20,
      }),
    )

    expect(response.content[0]).toMatchObject({
      priceRuleId: '1000001',
      priceFloatMode: 'ADD',
      priceFloatValue: 20,
    })
  })

  it('详情响应 priceFloatValue 为小数/字符串或为空时均可解析', () => {
    const decimal = getMainFlowDetailResponseSchema('sales-order').parse({
      ...salesOrder,
      priceFloatValue: 20.5,
      items: [salesOrderItem],
      chargeItems: [],
    })
    const numericString = getMainFlowDetailResponseSchema('sales-order').parse({
      ...salesOrder,
      priceFloatValue: '30.00',
      items: [salesOrderItem],
      chargeItems: [],
    })
    const nullable = getMainFlowDetailResponseSchema('sales-order').parse({
      ...salesOrder,
      priceFloatValue: null,
      items: [salesOrderItem],
      chargeItems: [],
    })

    expect(decimal.priceFloatValue).toBe(20.5)
    expect(numericString.priceFloatValue).toBe(30)
    expect(nullable.priceFloatValue).toBeNull()
  })
})

describe('销售订单明细出库剩余量契约', () => {
  it('详情解析 outboundRemainingQuantity 并保持为数字', () => {
    const parsed = getMainFlowDetailResponseSchema('sales-order').parse({
      ...salesOrder,
      items: [{ ...salesOrderItem, outboundRemainingQuantity: 7 }],
      chargeItems: [],
    })

    expect(parsed.items[0].outboundRemainingQuantity).toBe(7)
  })

  it('字段缺省或为 null 时不影响解析', () => {
    const missing = getMainFlowDetailResponseSchema('sales-order').parse({
      ...salesOrder,
      items: [salesOrderItem],
      chargeItems: [],
    })
    const nullable = getMainFlowDetailResponseSchema('sales-order').parse({
      ...salesOrder,
      items: [{ ...salesOrderItem, outboundRemainingQuantity: null }],
      chargeItems: [],
    })

    expect(missing.items[0].outboundRemainingQuantity).toBeUndefined()
    expect(nullable.items[0].outboundRemainingQuantity).toBeNull()
  })

  it('出库来源候选分页同样接受 outboundRemainingQuantity 且雪花 ID 保持字符串', () => {
    const parsed = salesOrderOutboundCandidatePageResponseSchema.parse({
      content: [
        {
          ...salesOrder,
          items: [{ ...salesOrderItem, outboundRemainingQuantity: 2 }],
          chargeItems: [],
        },
      ],
      totalElements: 1,
      totalPages: 1,
      currentPage: 0,
      pageSize: 30,
      hasMore: false,
    })

    expect(parsed.content[0].items[0].outboundRemainingQuantity).toBe(2)
    expect(parsed.content[0].id).toBe('2')
    expect(parsed.content[0].items[0].id).toBe('21')
  })
})

describe('物流候选明细剩余可导入量契约', () => {
  it('物流候选分页解析 remainingQuantity 且雪花 ID 保持字符串', () => {
    const parsed = freightSalesOrderCandidatePageResponseSchema.parse({
      content: [
        {
          ...salesOrder,
          items: [
            {
              ...salesOrderItem,
              remainingQuantity: 3,
              weightTon: 3,
            },
          ],
        },
      ],
      totalElements: 1,
      totalPages: 1,
      currentPage: 0,
      pageSize: 30,
      hasMore: false,
    })

    expect(parsed.content[0].items[0].remainingQuantity).toBe(3)
    expect(parsed.content[0].id).toBe('2')
    expect(parsed.content[0].items[0].id).toBe('21')
  })

  it('物流候选明细 remainingQuantity 缺省或为 null 时不影响解析', () => {
    const missing = freightSalesOrderCandidatePageResponseSchema.parse({
      content: [{ ...salesOrder, items: [salesOrderItem] }],
      totalElements: 1,
      totalPages: 1,
      currentPage: 0,
      pageSize: 30,
      hasMore: false,
    })
    const nullable = freightSalesOrderCandidatePageResponseSchema.parse({
      content: [
        {
          ...salesOrder,
          items: [{ ...salesOrderItem, remainingQuantity: null }],
        },
      ],
      totalElements: 1,
      totalPages: 1,
      currentPage: 0,
      pageSize: 30,
      hasMore: false,
    })

    expect(missing.content[0].items[0].remainingQuantity).toBeUndefined()
    expect(nullable.content[0].items[0].remainingQuantity).toBeNull()
  })

  it('销售订单详情不返回 remainingQuantity 也能解析（strictObject 不误拒）', () => {
    const parsed = getMainFlowDetailResponseSchema('sales-order').parse({
      ...salesOrder,
      items: [salesOrderItem],
      chargeItems: [],
    })

    expect(parsed.items[0].remainingQuantity).toBeUndefined()
  })
})
