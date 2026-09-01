import { describe, expect, it } from 'vitest'
import {
  getMainFlowDetailResponseSchema,
  getMainFlowListResponseSchema,
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
