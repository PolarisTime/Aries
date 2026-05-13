import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import type {
  CustomerStatementDraftOptions,
  FreightStatementDraftOptions,
  StatementPeriod,
  SupplierStatementDraftOptions,
} from '@/views/modules/module-adapter-statement-types'

function resolveStatementPeriod(
  statementPeriod: StatementPeriod | undefined,
  fallbackStartDate: string,
  fallbackEndDate: string,
) {
  return {
    startDate: statementPeriod?.startDate || fallbackStartDate,
    endDate: statementPeriod?.endDate || fallbackEndDate,
  }
}

function sumLineItemAmounts(
  records: ModuleRecord[],
  cloneLineItems: (value: unknown) => ModuleLineItem[],
) {
  return records.reduce((sum, record) => {
    const totalAmount = Number(record.totalAmount)
    if (Number.isFinite(totalAmount)) {
      return sum + totalAmount
    }
    return (
      sum +
      cloneLineItems(record.items).reduce(
        (itemSum, item) => itemSum + Number(item.amount || 0),
        0,
      )
    )
  }, 0)
}

export function buildSupplierStatementDraftData({
  baseDraft,
  sourceInbounds,
  payments,
  today,
  statementPeriod,
  defaultFullPayment,
  cloneLineItems,
  buildLineItemId,
}: SupplierStatementDraftOptions) {
  void payments
  void defaultFullPayment

  const sortedInbounds = structuredClone(sourceInbounds) as ModuleRecord[]
  sortedInbounds.sort(
    (left, right) =>
      new Date(String(left.inboundDate || '')).getTime() -
      new Date(String(right.inboundDate || '')).getTime(),
  )

  const firstInbound = sortedInbounds[0]
  const sourceInboundNos = sortedInbounds
    .map((record) => String(record.inboundNo || ''))
    .filter(Boolean)
    .join(', ')
  const { startDate, endDate } = resolveStatementPeriod(
    statementPeriod,
    String(sortedInbounds[0]?.inboundDate || today),
    String(sortedInbounds[sortedInbounds.length - 1]?.inboundDate || today),
  )
  const statementItems: ModuleLineItem[] = sortedInbounds.flatMap((record) =>
    cloneLineItems(record.items).map((item) => ({
      ...item,
      id: buildLineItemId(),
      sourceNo: record.inboundNo || '',
      sourceInboundItemId: item.id,
    })),
  )
  const purchaseAmount = Number(
    sumLineItemAmounts(sortedInbounds, cloneLineItems).toFixed(2),
  )
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

export function buildCustomerStatementDraftData({
  baseDraft,
  sourceOrders,
  today,
  statementPeriod,
  defaultReceiptAmountZero,
  cloneLineItems,
  buildLineItemId,
}: CustomerStatementDraftOptions) {
  void defaultReceiptAmountZero

  const sortedOrders = structuredClone(sourceOrders) as ModuleRecord[]
  sortedOrders.sort(
    (left, right) =>
      new Date(String(left.deliveryDate || left.orderDate || '')).getTime() -
      new Date(String(right.deliveryDate || right.orderDate || '')).getTime(),
  )

  const firstOrder = sortedOrders[0]
  const sourceOrderNos = sortedOrders
    .map((order) => String(order.orderNo || ''))
    .filter(Boolean)
    .join(', ')
  const { startDate, endDate } = resolveStatementPeriod(
    statementPeriod,
    String(
      sortedOrders[0]?.deliveryDate || sortedOrders[0]?.orderDate || today,
    ),
    String(
      sortedOrders[sortedOrders.length - 1]?.deliveryDate ||
        sortedOrders[sortedOrders.length - 1]?.orderDate ||
        today,
    ),
  )
  const statementItems: ModuleLineItem[] = sortedOrders.flatMap((order) =>
    cloneLineItems(order.items).map((item) => ({
      ...item,
      id: buildLineItemId(),
      sourceNo: order.orderNo || '',
      sourceSalesOrderItemId: item.id,
    })),
  )
  const salesAmount = Number(
    sumLineItemAmounts(sortedOrders, cloneLineItems).toFixed(2),
  )
  const receiptAmount = 0

  return {
    ...baseDraft,
    customerName: firstOrder?.customerName || '',
    projectName: firstOrder?.projectName || '',
    startDate,
    endDate,
    salesAmount,
    receiptAmount,
    closingAmount: salesAmount,
    sourceOrderNos,
    remark: `由销售订单 ${sourceOrderNos} 生成`,
    items: statementItems,
  }
}

export function buildFreightStatementDraftData({
  baseDraft,
  sourceBills,
  today,
  statementPeriod,
  cloneLineItems,
  buildLineItemId,
}: FreightStatementDraftOptions) {
  const sortedBills = structuredClone(sourceBills) as ModuleRecord[]
  sortedBills.sort(
    (left, right) =>
      new Date(String(left.billTime || '')).getTime() -
      new Date(String(right.billTime || '')).getTime(),
  )

  const firstBill = sortedBills[0]
  const statementItems: ModuleLineItem[] = sortedBills.flatMap((bill) =>
    cloneLineItems(bill.items).map((item) => ({
      ...item,
      id: buildLineItemId(),
      sourceNo: bill.billNo || '',
    })),
  )
  const sourceBillNos = sortedBills
    .map((bill) => String(bill.billNo || ''))
    .filter(Boolean)
    .join(', ')
  const totalWeight = Number(
    sortedBills
      .reduce((sum, bill) => sum + Number(bill.totalWeight || 0), 0)
      .toFixed(3),
  )
  const totalFreight = Number(
    sortedBills
      .reduce((sum, bill) => sum + Number(bill.totalFreight || 0), 0)
      .toFixed(2),
  )
  const { startDate, endDate } = resolveStatementPeriod(
    statementPeriod,
    String(sortedBills[0]?.billTime || today),
    String(sortedBills[sortedBills.length - 1]?.billTime || today),
  )

  return {
    ...baseDraft,
    carrierName: firstBill?.carrierName || '',
    startDate,
    endDate,
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
