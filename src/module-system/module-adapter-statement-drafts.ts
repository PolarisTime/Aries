import { INTERNAL_WEIGHT_PRECISION } from '@/constants/precision'
import type {
  CustomerStatementDraftOptions,
  FreightStatementDraftOptions,
  StatementPeriod,
  SupplierStatementDraftOptions,
} from '@/module-system/module-adapter-statement-types'
import { parseEntityId, parseOptionalEntityId } from '@/types/entity-id'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

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

function roundAmount(value: number) {
  return Number(value.toFixed(2))
}

function normalizeAmount(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

function sumRecordAmounts(records: ModuleRecord[]) {
  return roundAmount(
    records.reduce((sum, record) => sum + normalizeAmount(record.amount), 0),
  )
}

function capSettlementAmount(amount: number, totalAmount: number) {
  return roundAmount(Math.min(Math.max(amount, 0), Math.max(totalAmount, 0)))
}

function resolveBatchEntityId(
  records: ModuleRecord[],
  field: string,
  recordsPath: string,
) {
  const hasStableIdentity = records.some(
    (record) =>
      record[field] !== undefined &&
      record[field] !== null &&
      record[field] !== '',
  )
  if (!hasStableIdentity) {
    return undefined
  }

  let expectedId: string | undefined
  records.forEach((record, index) => {
    const currentId = parseEntityId(
      record[field],
      `${recordsPath}[${index}].${field}`,
    )
    expectedId ||= currentId
    if (currentId !== expectedId) {
      throw new Error(`${recordsPath}[${index}].${field} 与首单不一致`)
    }
  })
  return expectedId
}

function optionalEntityId(value: unknown, field: string) {
  return parseOptionalEntityId(value, field)
}

function resolveSupplierIdentity(sourceInbounds: ModuleRecord[]) {
  if (!sourceInbounds.length) {
    return undefined
  }

  const supplierId = parseEntityId(
    sourceInbounds[0].supplierId,
    'sourceInbounds[0].supplierId',
  )
  sourceInbounds.forEach((record, index) => {
    const currentId = parseEntityId(
      record.supplierId,
      `sourceInbounds[${index}].supplierId`,
    )
    if (currentId !== supplierId) {
      throw new Error(`sourceInbounds[${index}].supplierId 与首单不一致`)
    }
  })

  const firstInbound = sourceInbounds[0]
  return {
    supplierId,
    supplierCode: asString(firstInbound.supplierCode).trim(),
    supplierName: asString(firstInbound.supplierName).trim(),
  }
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
  const sortedInbounds = structuredClone(sourceInbounds)
  sortedInbounds.sort(
    (left, right) =>
      new Date(asString(left.inboundDate)).getTime() -
      new Date(asString(right.inboundDate)).getTime(),
  )

  const supplierIdentity = resolveSupplierIdentity(sortedInbounds)
  const sourceInboundNos = sortedInbounds
    .flatMap((record) => {
      const v = asString(record.inboundNo)
      return v ? [v] : []
    })
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
  const paymentAmount = capSettlementAmount(
    defaultFullPayment ? purchaseAmount : sumRecordAmounts(payments),
    purchaseAmount,
  )

  return {
    ...baseDraft,
    supplierId: supplierIdentity?.supplierId || baseDraft.supplierId,
    supplierCode: supplierIdentity?.supplierCode || '',
    supplierName: supplierIdentity?.supplierName || '',
    startDate,
    endDate,
    purchaseAmount,
    paymentAmount,
    closingAmount: roundAmount(purchaseAmount - paymentAmount),
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
  const sortedOrders = structuredClone(sourceOrders)
  sortedOrders.sort(
    (left, right) =>
      new Date(asString(left.deliveryDate)).getTime() -
      new Date(asString(right.deliveryDate)).getTime(),
  )

  const firstOrder = sortedOrders[0]
  const customerId = resolveBatchEntityId(
    sortedOrders,
    'customerId',
    'sourceOrders',
  )
  const projectId = resolveBatchEntityId(
    sortedOrders,
    'projectId',
    'sourceOrders',
  )
  const sourceOrderNos = sortedOrders
    .flatMap((order) => {
      const v = asString(order.orderNo)
      return v ? [v] : []
    })
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
      customerId:
        optionalEntityId(
          item.customerId,
          'sourceOrders[].items[].customerId',
        ) || customerId,
      projectId:
        optionalEntityId(item.projectId, 'sourceOrders[].items[].projectId') ||
        projectId,
    })),
  )
  const salesAmount = Number(
    sumLineItemAmounts(sortedOrders, cloneLineItems).toFixed(2),
  )
  const receiptAmount = defaultReceiptAmountZero ? 0 : salesAmount

  return {
    ...baseDraft,
    customerId: customerId || baseDraft.customerId,
    customerCode: firstOrder?.customerCode || baseDraft.customerCode || '',
    customerName: firstOrder?.customerName || '',
    projectId: projectId || baseDraft.projectId,
    projectName: firstOrder?.projectName || '',
    startDate,
    endDate,
    salesAmount,
    receiptAmount,
    closingAmount: roundAmount(salesAmount - receiptAmount),
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
  const sortedBills = structuredClone(sourceBills)
  sortedBills.sort(
    (left, right) =>
      new Date(asString(left.billTime)).getTime() -
      new Date(asString(right.billTime)).getTime(),
  )

  const firstBill = sortedBills[0]
  const carrierId = resolveBatchEntityId(
    sortedBills,
    'carrierId',
    'sourceBills',
  )
  const statementItems: ModuleLineItem[] = sortedBills.flatMap((bill) =>
    cloneLineItems(bill.items).map((item) => ({
      ...item,
      id: buildLineItemId(),
      sourceNo: bill.billNo || '',
      sourceFreightBillId: bill.id,
      sourceFreightBillItemId: item.id,
      customerId:
        optionalEntityId(item.customerId, 'sourceBills[].items[].customerId') ||
        optionalEntityId(bill.customerId, 'sourceBills[].customerId'),
      projectId:
        optionalEntityId(item.projectId, 'sourceBills[].items[].projectId') ||
        optionalEntityId(bill.projectId, 'sourceBills[].projectId'),
    })),
  )
  const sourceBillNos = sortedBills
    .flatMap((bill) => {
      const v = asString(bill.billNo)
      return v ? [v] : []
    })
    .join(', ')
  const totalWeight = Number(
    sortedBills
      .reduce((sum, bill) => sum + Number(bill.totalWeight || 0), 0)
      .toFixed(INTERNAL_WEIGHT_PRECISION),
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
    carrierId: carrierId || baseDraft.carrierId,
    carrierCode: firstBill?.carrierCode || baseDraft.carrierCode || '',
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
