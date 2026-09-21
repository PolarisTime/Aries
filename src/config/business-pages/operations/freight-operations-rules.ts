import { INTERNAL_WEIGHT_PRECISION } from '@/constants/precision'
import type {
  ModuleLineItem,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { buildAmountWeightOverview } from '../shared/shared'

/**
 * 解析物流单销售订单候选明细的行级剩余可导入量。
 * 缺省（旧契约/销售订单详情端点）时返回 undefined，保持回退来源快照数量。
 */
function resolveRemainingQuantity(item: {
  [key: string]: unknown
}): number | undefined {
  const raw = item.remainingQuantity
  if (raw === undefined || raw === null || raw === '') {
    return undefined
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : undefined
}

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
): ModuleLineItem[] {
  const sourceNo = asString(parentRecord.orderNo).trim()
  const customerName = asString(parentRecord.customerName).trim()
  const projectName = asString(parentRecord.projectName).trim()
  const settlementCompanyName = asString(
    parentRecord.settlementCompanyName,
  ).trim()
  return (Array.isArray(parentRecord.items) ? parentRecord.items : []).map(
    (item, index): ModuleLineItem => {
      const base: ModuleLineItem = {
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
      }
      const remainingQuantity = resolveRemainingQuantity(item)
      // 后端未返回剩余量时（旧契约/销售订单详情）保持来源快照数量与重量。
      if (remainingQuantity === undefined) {
        return base
      }
      // 行级部分导入：以来源剩余可导入量为默认数量与上限，
      // buildParentImportState 据此计算 _maxImportQuantity 并在多单合并时累加已分配量。
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
      const amount = Number((weightTon * unitPrice).toFixed(2))
      return {
        ...base,
        quantity: remainingQuantity,
        weightTon,
        amount,
        remainingQuantity,
        remainingWeightTon: weightTon,
        remainingAmount: amount,
      }
    },
  )
}
