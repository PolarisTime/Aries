import { describe, expect, it } from 'vitest'
import {
  freightSalesOrderCandidatePageResponseSchema,
  getMainFlowDetailResponseSchema,
  getMainFlowListResponseSchema,
  parseMainFlowSaveRequest,
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
  orderDate: '2026-09-01',
  deliveryDate: '2026-09-02',
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

describe('采购订单货值与入库进度契约', () => {
  it('列表响应缺少新字段时仍可解析', () => {
    const response = getMainFlowListResponseSchema('purchase-order').parse(
      page(purchaseOrder),
    )

    expect(response.content[0].totalReceivedQuantity).toBeUndefined()
    expect(response.content[0].totalActualAmount).toBeUndefined()
    expect(response.content[0].totalAmountDifference).toBeUndefined()
  })

  it('详情响应解析实际货值与已入库件数', () => {
    const parsed = getMainFlowDetailResponseSchema('purchase-order').parse({
      ...purchaseOrder,
      totalReceivedQuantity: 7,
      totalRemainingQuantity: 1,
      totalActualAmount: 12800.5,
      totalAmountDifference: 300.25,
      items: [purchaseOrderItem],
      chargeItems: [],
    })

    expect(parsed.totalReceivedQuantity).toBe(7)
    expect(parsed.totalActualAmount).toBe(12800.5)
    expect(parsed.totalAmountDifference).toBe(300.25)
  })

  it('差额为负数（需退款）时保留符号', () => {
    const parsed = getMainFlowDetailResponseSchema('purchase-order').parse({
      ...purchaseOrder,
      totalAmountDifference: -420.75,
      items: [purchaseOrderItem],
      chargeItems: [],
    })

    expect(parsed.totalAmountDifference).toBe(-420.75)
  })

  it('强制结单留痕可空可缺省: 非强制结单为 null, 缺失时不受影响', () => {
    const list = getMainFlowListResponseSchema('purchase-order')
    const absent = list.parse(page(purchaseOrder))
    const nullable = list.parse(page({ ...purchaseOrder, forceClose: null }))
    const present = list.parse(
      page({
        ...purchaseOrder,
        forceClose: {
          reason: '剩余 1 件报废',
          remainingQuantity: 1,
          operatorId: '332601640831950848',
          operatorName: '系统管理员',
          closedAt: '2026-10-09T13:50:43+08:00',
        },
      }),
    )

    expect(absent.content[0].forceClose).toBeUndefined()
    expect(nullable.content[0].forceClose).toBeNull()
    expect(present.content[0].forceClose).toMatchObject({
      reason: '剩余 1 件报废',
      remainingQuantity: 1,
      // 雪花 ID 保持字符串
      operatorId: '332601640831950848',
      operatorName: '系统管理员',
    })
  })

  it('BigDecimal 以字符串返回时归一化为数字，可空字段保持 null', () => {
    const fromString = getMainFlowListResponseSchema('purchase-order').parse(
      page({
        ...purchaseOrder,
        totalActualAmount: '9999.10',
        totalAmountDifference: '-100.00',
      }),
    )
    const nullable = getMainFlowListResponseSchema('purchase-order').parse(
      page({
        ...purchaseOrder,
        totalActualAmount: null,
        totalAmountDifference: null,
      }),
    )

    expect(fromString.content[0].totalActualAmount).toBe(9999.1)
    expect(fromString.content[0].totalAmountDifference).toBe(-100)
    expect(nullable.content[0].totalActualAmount).toBeNull()
    expect(nullable.content[0].totalAmountDifference).toBeNull()
  })
})

describe('订单响应不再声明下游引用状态字段（已下线）', () => {
  /*
   * 下游引用图标与「下游引用」筛选已整体下线，后端 DTO 也不再返回这些键，
   * schema 因此不再声明它们（此前是 z.boolean().default(false)）。
   * 若有人把声明加回来，下面两条会把"凭空出现的默认值"打回原形。
   */
  const removedReferenceKeys = [
    'referencedBySalesOrder',
    'referencedByPurchaseInbound',
    'referencedByFreightBill',
    'referencedBySalesOutbound',
    'referencedBySalesReturn',
  ]

  it('列表响应解析后不再出现 referencedBy* 字段', () => {
    const response = getMainFlowListResponseSchema('purchase-order').parse(
      page(purchaseOrder),
    )
    const salesResponse = getMainFlowListResponseSchema('sales-order').parse(
      page(salesOrder),
    )

    for (const key of removedReferenceKeys) {
      expect(response.content[0]).not.toHaveProperty(key)
      expect(salesResponse.content[0]).not.toHaveProperty(key)
    }
  })

  it('详情响应解析后同样不再出现 referencedBy* 字段', () => {
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

    for (const key of removedReferenceKeys) {
      expect(purchaseResponse).not.toHaveProperty(key)
      expect(salesResponse).not.toHaveProperty(key)
    }
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

describe('销售订单报单日期契约', () => {
  /** 最小可保存的销售订单请求：只保留 saveRequestSchema 必填字段。 */
  const salesOrderSavePayload = {
    customerName: '客户',
    projectName: '项目',
    orderDate: '2026-09-01',
    deliveryDate: '2026-09-02',
    salesName: '销售员',
    items: [
      {
        materialCode: 'M-1',
        brand: '品牌',
        category: '品类',
        material: '材质',
        spec: '规格',
        unit: '吨',
        warehouseName: '仓库',
        quantity: 1,
        pieceWeightTon: 1,
        piecesPerBundle: 0,
        unitPrice: 3400,
      },
    ],
  }

  it('列表与详情响应含 orderDate 时各自解析出该字段', () => {
    const list = getMainFlowListResponseSchema('sales-order').parse(
      page(salesOrder),
    )
    const detail = getMainFlowDetailResponseSchema('sales-order').parse({
      ...salesOrder,
      items: [salesOrderItem],
      chargeItems: [],
    })

    expect(list.content[0].orderDate).toBe('2026-09-01')
    expect(detail.orderDate).toBe('2026-09-01')
    // 报单日期与交货日期是两个独立字段，不得互相顶替。
    expect(detail.deliveryDate).toBe('2026-09-02')
  })

  it('响应缺少必填的 orderDate 时按契约报错', () => {
    const { orderDate: _orderDate, ...withoutOrderDate } = salesOrder

    expect(() =>
      getMainFlowListResponseSchema('sales-order').parse(
        page(withoutOrderDate),
      ),
    ).toThrow()
    expect(() =>
      getMainFlowDetailResponseSchema('sales-order').parse({
        ...withoutOrderDate,
        items: [salesOrderItem],
        chargeItems: [],
      }),
    ).toThrow()
  })

  it('保存请求携带 orderDate 时可解析，缺失时按契约报错', () => {
    expect(
      parseMainFlowSaveRequest('sales-order', salesOrderSavePayload).orderDate,
    ).toBe('2026-09-01')

    const { orderDate: _orderDate, ...withoutOrderDate } = salesOrderSavePayload
    expect(() =>
      parseMainFlowSaveRequest('sales-order', withoutOrderDate),
    ).toThrow()
  })
})

/**
 * 项目简称是**列表显示用的附加字段**, 三条主流程列表(销售订单/销售出库/销售退货)都用
 * `strictObject` 解析: 字段没声明时后端一旦开始返回就会被判"未知字段"整页失败,
 * 因此这里同时锁住"带字段可解析"与"不带字段也可解析"两个方向。
 */
const salesOutboundListRecord = {
  id: '3',
  outboundNo: 'SOB-1',
  salesOrderNo: null,
  customerId: null,
  customerName: '客户',
  projectId: null,
  projectName: '广东东钢供应链有限公司',
  warehouseId: null,
  warehouseName: null,
  settlementCompanyId: null,
  settlementCompanyName: null,
  outboundDate: '2026-09-01',
  totalWeight: 0,
  totalAmount: 0,
  status: '草稿',
  deletedFlag: false,
  remark: null,
}

/** 销售出库/销售退货列表响应不携带 chargeItems（该字段只有销售订单声明）。 */
const pageWithoutChargeItems = (record: object) => ({
  content: [{ ...record, items: null }],
  totalElements: 1,
  totalPages: 1,
  currentPage: 0,
  pageSize: 30,
  hasMore: false,
})

const salesReturnListRecord = {
  id: '4',
  returnNo: 'SR-1',
  salesOrderNo: null,
  customerId: null,
  customerName: '客户',
  projectId: null,
  projectName: '广东东钢供应链有限公司',
  warehouseId: null,
  warehouseName: null,
  settlementCompanyId: null,
  settlementCompanyName: null,
  returnDate: '2026-09-01',
  totalWeight: 0,
  totalAmount: 0,
  status: '草稿',
  deletedFlag: false,
  remark: null,
}

describe('项目简称字段契约', () => {
  it('三条主流程列表都解析出 projectNameAbbr', () => {
    const rows = {
      'sales-order': getMainFlowListResponseSchema('sales-order').parse(
        page({ ...salesOrder, projectNameAbbr: '东钢' }),
      ).content[0],
      'sales-outbound': getMainFlowListResponseSchema('sales-outbound').parse(
        pageWithoutChargeItems({
          ...salesOutboundListRecord,
          projectNameAbbr: '东钢',
        }),
      ).content[0],
      'sales-return': getMainFlowListResponseSchema('sales-return').parse(
        pageWithoutChargeItems({
          ...salesReturnListRecord,
          projectNameAbbr: '东钢',
        }),
      ).content[0],
    }

    expect(rows['sales-order'].projectNameAbbr).toBe('东钢')
    expect(rows['sales-outbound'].projectNameAbbr).toBe('东钢')
    expect(rows['sales-return'].projectNameAbbr).toBe('东钢')
  })

  it('后端未返回 projectNameAbbr 时三条列表仍可解析', () => {
    const rows = {
      'sales-order': getMainFlowListResponseSchema('sales-order').parse(
        page(salesOrder),
      ).content[0],
      'sales-outbound': getMainFlowListResponseSchema('sales-outbound').parse(
        pageWithoutChargeItems(salesOutboundListRecord),
      ).content[0],
      'sales-return': getMainFlowListResponseSchema('sales-return').parse(
        pageWithoutChargeItems(salesReturnListRecord),
      ).content[0],
    }

    expect(rows['sales-order'].projectNameAbbr).toBeUndefined()
    expect(rows['sales-outbound'].projectNameAbbr).toBeUndefined()
    expect(rows['sales-return'].projectNameAbbr).toBeUndefined()
  })
})
