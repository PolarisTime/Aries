import { INTERNAL_WEIGHT_PRECISION } from '@/constants/precision'
import type { ModuleRecord, ModuleRecordInput } from '@/types/module-page'
import { buildAmountWeightOverview, cloneLineItems } from '../shared/shared'

/**
 * 解析销售订单明细的出库剩余量。
 * 缺省（旧契约/字段缺失）时返回 undefined，保持原有的整单数量回退行为。
 */
function resolveOutboundRemainingQuantity(item: {
  [key: string]: unknown
}): number | undefined {
  const raw = item.outboundRemainingQuantity
  if (raw === undefined || raw === null || raw === '') {
    return undefined
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : undefined
}

export function buildSalesOutboundOverview(rows: ModuleRecord[]) {
  return buildAmountWeightOverview(rows, 'totalAmount')
}

export function buildSalesOutboundParentFilters(
  currentRecord: ModuleRecordInput,
): Record<string, unknown> {
  return {
    currentRecordId: currentRecord.id,
  }
}

export function mapSalesOrderToOutboundDraft(
  parentRecord: ModuleRecord,
): Partial<ModuleRecord> {
  return {
    customerId: parentRecord.customerId,
    customerName: parentRecord.customerName || '',
    projectId: parentRecord.projectId,
    projectName: parentRecord.projectName || '',
    settlementCompanyId: parentRecord.settlementCompanyId,
    settlementCompanyName: parentRecord.settlementCompanyName || '',
  }
}

export function transformSalesOrderItemsToOutboundItems(
  parentRecord: ModuleRecord,
) {
  return cloneLineItems(
    Array.isArray(parentRecord.items)
      ? parentRecord.items.map((item) => {
          const base = {
            ...item,
            sourceNo: parentRecord.orderNo || '',
            sourceSalesOrderItemId: item.id,
          }
          const remainingQuantity = resolveOutboundRemainingQuantity(item)
          // 后端未返回剩余量时保持原有整单数量与重量回退。
          if (remainingQuantity === undefined) {
            return base
          }
          const pieceWeightTon = Number(item.pieceWeightTon || 0)
          const unitPrice = Number(item.unitPrice || 0)
          const weightTon =
            pieceWeightTon > 0
              ? Number(
                  (remainingQuantity * pieceWeightTon).toFixed(
                    INTERNAL_WEIGHT_PRECISION,
                  ),
                )
              : Number(item.weightTon || 0)
          return {
            ...base,
            // buildParentImportState 以 remainingQuantity/remainingWeightTon
            // 计算导入默认值与单行上限（_maxImportQuantity）。
            remainingQuantity,
            remainingWeightTon: weightTon,
            remainingAmount: Number((weightTon * unitPrice).toFixed(2)),
          }
        })
      : [],
    'sales-outbound-item',
  )
}
