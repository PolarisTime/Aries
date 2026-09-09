import type { ModuleRecord, ModuleRecordInput } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { buildAmountWeightOverview } from '../shared/shared'

export function buildFreightBillOverview(rows: ModuleRecord[]) {
  return buildAmountWeightOverview(rows, 'totalFreight')
}

export function buildFreightBillParentFilters(
  currentRecord: ModuleRecordInput,
): Record<string, unknown> {
  return {
    currentRecordId: currentRecord.id || undefined,
  }
}

export function validateFreightBillBeforeOpen(
  currentRecord: ModuleRecordInput,
): string | null {
  return asString(currentRecord.carrierId).trim()
    ? null
    : '请先选择物流商，再选择销售订单'
}

export function transformSalesOrderItemsToFreightBillItems(
  parentRecord: ModuleRecord,
) {
  const sourceNo = asString(parentRecord.orderNo).trim()
  const customerName = asString(parentRecord.customerName).trim()
  const projectName = asString(parentRecord.projectName).trim()
  const settlementCompanyName = asString(
    parentRecord.settlementCompanyName,
  ).trim()
  return (Array.isArray(parentRecord.items) ? parentRecord.items : []).map(
    (item, index) => ({
      ...item,
      id: `${sourceNo || 'sales-order'}-${String(item.id || index)}`,
      sourceNo,
      sourceSalesOrderItemId: item.id,
      materialName: asString(item.brand).trim(),
      customerId: parentRecord.customerId,
      customerName,
      projectId: parentRecord.projectId,
      projectName,
      settlementCompanyId:
        item.settlementCompanyId ?? parentRecord.settlementCompanyId,
      settlementCompanyName:
        asString(item.settlementCompanyName).trim() || settlementCompanyName,
    }),
  )
}
