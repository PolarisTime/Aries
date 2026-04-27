import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { parseParentRelationNos } from './module-adapter-shared'

export function getAvailableSupplierStatementInbounds(inbounds: ModuleRecord[], statements: ModuleRecord[]) {
  const occupiedInboundNoSet = new Set(
    statements.flatMap((record) => parseParentRelationNos(record.sourceInboundNos)),
  )

  return inbounds.filter((record) => {
    const inboundNo = String(record.inboundNo || '')
    return inboundNo
      && String(record.status || '') !== '草稿'
      && !occupiedInboundNoSet.has(inboundNo)
  })
}

export function getAvailableCustomerStatementOrders(orders: ModuleRecord[], statements: ModuleRecord[]) {
  const occupiedOrderNoSet = new Set(
    statements.flatMap((record) => parseParentRelationNos(record.sourceOrderNos)),
  )

  return orders.filter((record) => {
    const orderNo = String(record.orderNo || '')
    return orderNo
      && String(record.status || '') === '完成销售'
      && !occupiedOrderNoSet.has(orderNo)
  })
}

export function getAvailableFreightStatementBills(bills: ModuleRecord[], statements: ModuleRecord[]) {
  const occupiedBillNoSet = new Set(
    statements.flatMap((record) => parseParentRelationNos(record.sourceBillNos)),
  )

  return bills.filter((record) => {
    const billNo = String(record.billNo || '')
    return billNo && !occupiedBillNoSet.has(billNo)
  })
}

export function getSupplierStatementSelectionError(sourceInbounds: ModuleRecord[]) {
  if (!sourceInbounds.length) {
    return '请先选择采购入库单'
  }

  const supplierNames = Array.from(
    new Set(sourceInbounds.map((record) => String(record.supplierName || ''))),
  )
  if (supplierNames.length !== 1) {
    return '仅支持同一供应商的采购入库单合并生成'
  }

  return null
}

export function getCustomerStatementSelectionError(sourceOrders: ModuleRecord[]) {
  if (!sourceOrders.length) {
    return '请先选择销售订单'
  }

  const customerNames = Array.from(
    new Set(sourceOrders.map((record) => String(record.customerName || ''))),
  )
  const projectNames = Array.from(
    new Set(sourceOrders.map((record) => String(record.projectName || ''))),
  )
  if (customerNames.length !== 1 || projectNames.length !== 1) {
    return '仅支持同一客户同一项目的销售订单合并生成'
  }

  return null
}

export function getFreightStatementSelectionError(sourceBills: ModuleRecord[]) {
  if (!sourceBills.length) {
    return '请先选择物流单'
  }

  const carrierNames = Array.from(
    new Set(sourceBills.map((record) => String(record.carrierName || ''))),
  )
  if (carrierNames.length !== 1) {
    return '仅支持同一物流商的物流单合并生成'
  }

  return null
}

export function buildSupplierStatementDraftData(options: {
  baseDraft: ModuleRecord
  sourceInbounds: ModuleRecord[]
  payments: ModuleRecord[]
  today: string
  defaultFullPayment: boolean
  cloneLineItems: (value: unknown) => ModuleLineItem[]
  buildLineItemId: () => string
}) {
  const {
    baseDraft,
    sourceInbounds,
    payments,
    today,
    defaultFullPayment,
    cloneLineItems,
    buildLineItemId,
  } = options
  void payments
  void defaultFullPayment
  const sortedInbounds = JSON.parse(JSON.stringify(sourceInbounds)) as ModuleRecord[]
  sortedInbounds.sort((left, right) =>
    new Date(String(left.inboundDate || '')).getTime() - new Date(String(right.inboundDate || '')).getTime(),
  )
  const firstInbound = sortedInbounds[0]
  const sourceInboundNos = sortedInbounds.map((record) => String(record.inboundNo || '')).filter(Boolean).join(', ')
  const startDate = String(sortedInbounds[0]?.inboundDate || today)
  const endDate = String(sortedInbounds[sortedInbounds.length - 1]?.inboundDate || today)
  const statementItems: ModuleLineItem[] = sortedInbounds.flatMap((record) =>
    cloneLineItems(record.items).map((item) => ({
      ...item,
      id: buildLineItemId(),
      sourceNo: record.inboundNo || '',
    })),
  )
  const purchaseAmount = Number(sortedInbounds.reduce((sum, record) => {
    const totalAmount = Number(record.totalAmount)
    if (Number.isFinite(totalAmount)) {
      return sum + totalAmount
    }
    return sum + cloneLineItems(record.items).reduce((itemSum, item) => itemSum + Number(item.amount || 0), 0)
  }, 0).toFixed(2))

  const paymentAmount = 0

  return {
    ...baseDraft,
    supplierName: firstInbound?.supplierName || '',
    startDate,
    endDate,
    purchaseAmount,
    paymentAmount,
    closingAmount: purchaseAmount,
    sourceInboundNos,
    remark: `由采购入库单 ${sourceInboundNos} 生成`,
    items: statementItems,
  }
}

export function buildCustomerStatementDraftData(options: {
  baseDraft: ModuleRecord
  sourceOrders: ModuleRecord[]
  today: string
  defaultReceiptAmountZero: boolean
  cloneLineItems: (value: unknown) => ModuleLineItem[]
  buildLineItemId: () => string
}) {
  const {
    baseDraft,
    sourceOrders,
    today,
    defaultReceiptAmountZero,
    cloneLineItems,
    buildLineItemId,
  } = options
  void defaultReceiptAmountZero
  const sortedOrders = JSON.parse(JSON.stringify(sourceOrders)) as ModuleRecord[]
  sortedOrders.sort((left, right) =>
    new Date(String(left.deliveryDate || left.orderDate || '')).getTime()
    - new Date(String(right.deliveryDate || right.orderDate || '')).getTime(),
  )
  const firstOrder = sortedOrders[0]
  const sourceOrderNos = sortedOrders.map((order) => String(order.orderNo || '')).filter(Boolean).join(', ')
  const statementItems: ModuleLineItem[] = sortedOrders.flatMap((order) =>
    cloneLineItems(order.items).map((item) => ({
      ...item,
      id: buildLineItemId(),
      sourceNo: order.orderNo || '',
    })),
  )
  const salesAmount = Number(sortedOrders.reduce((sum, order) => {
    const totalAmount = Number(order.totalAmount)
    if (Number.isFinite(totalAmount)) {
      return sum + totalAmount
    }
    return sum + cloneLineItems(order.items).reduce((itemSum, item) => itemSum + Number(item.amount || 0), 0)
  }, 0).toFixed(2))
  const receiptAmount = 0

  return {
    ...baseDraft,
    customerName: firstOrder?.customerName || '',
    projectName: firstOrder?.projectName || '',
    startDate: String(sortedOrders[0]?.deliveryDate || sortedOrders[0]?.orderDate || today),
    endDate: String(sortedOrders[sortedOrders.length - 1]?.deliveryDate || sortedOrders[sortedOrders.length - 1]?.orderDate || today),
    salesAmount,
    receiptAmount,
    closingAmount: salesAmount,
    sourceOrderNos,
    remark: `由销售订单 ${sourceOrderNos} 生成`,
    items: statementItems,
  }
}

export function buildFreightStatementDraftData(options: {
  baseDraft: ModuleRecord
  sourceBills: ModuleRecord[]
  today: string
  cloneLineItems: (value: unknown) => ModuleLineItem[]
  buildLineItemId: () => string
}) {
  const {
    baseDraft,
    sourceBills,
    today,
    cloneLineItems,
    buildLineItemId,
  } = options

  const sortedBills = JSON.parse(JSON.stringify(sourceBills)) as ModuleRecord[]
  sortedBills.sort((left, right) =>
    new Date(String(left.billTime || '')).getTime() - new Date(String(right.billTime || '')).getTime(),
  )
  const firstBill = sortedBills[0]
  const statementItems = sortedBills.flatMap((bill) =>
    cloneLineItems(bill.items).map((item) => ({
      ...item,
      id: buildLineItemId(),
      sourceNo: bill.billNo || '',
    })),
  )
  const sourceBillNos = sortedBills.map((bill) => String(bill.billNo || '')).filter(Boolean).join(', ')
  const totalWeight = Number(sortedBills.reduce((sum, bill) => sum + Number(bill.totalWeight || 0), 0).toFixed(3))
  const totalFreight = Number(sortedBills.reduce((sum, bill) => sum + Number(bill.totalFreight || 0), 0).toFixed(2))

  return {
    ...baseDraft,
    carrierName: firstBill?.carrierName || '',
    startDate: String(sortedBills[0]?.billTime || today),
    endDate: String(sortedBills[sortedBills.length - 1]?.billTime || today),
    totalWeight,
    totalFreight,
    paidAmount: 0,
    unpaidAmount: totalFreight,
    status: '待审核',
    signStatus: '未签署',
    sourceBillNos,
    attachment: '',
    attachments: [],
    remark: `由物流单 ${sourceBillNos} 生成`,
    items: statementItems,
  }
}
