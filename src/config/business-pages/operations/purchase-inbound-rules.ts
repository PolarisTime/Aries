import i18next from 'i18next'
import { isPurchaseWeighRequiredCategory } from '@/module-system/core/module-option-resolvers'
import { parseOptionalEntityId } from '@/types/entity-id'
import type {
  ModuleLineItem,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { buildAmountWeightOverview, cloneLineItems } from '../shared/shared'

/** 与 po_purchase_inbound.purchase_order_no 列一致的拼接长度上限。 */
const MAX_PURCHASE_ORDER_NO_LENGTH = 256

export function buildPurchaseInboundOverview(rows: ModuleRecord[]) {
  return buildAmountWeightOverview(rows, 'totalAmount')
}

function supplierIdentityOf(record: ModuleRecord | ModuleRecordInput) {
  return {
    id: parseOptionalEntityId(record.supplierId, 'supplierId'),
    code: asString(record.supplierCode).trim(),
  }
}

export function buildPurchaseInboundParentFilters(
  currentRecord: ModuleRecordInput,
): Record<string, unknown> {
  return {
    supplierId: currentRecord.supplierId,
    currentRecordId: currentRecord.id,
  }
}

/**
 * 单选导入仍逐单回填整块表头；多选合并由通用适配器拼接来源单号后仅保留首单表头，
 * 再由 {@link validatePurchaseInboundParentImport} 强校验供应商/结算主体一致性，避免最后一单静默覆盖。
 */
export function mapPurchaseOrderToInboundDraft(
  parentRecord: ModuleRecord,
): Partial<ModuleRecord> {
  return {
    purchaseOrderNo: parentRecord.orderNo || '',
    supplierId: parentRecord.supplierId,
    supplierCode: parentRecord.supplierCode || '',
    supplierName: parentRecord.supplierName || '',
    settlementCompanyId: parentRecord.settlementCompanyId,
    settlementCompanyName: parentRecord.settlementCompanyName || '',
  }
}

/**
 * 合并导入前的一致性校验，对齐后端 `applyHeaderSupplier`/`applyHeaderSettlementCompany`：
 * 多来源供应商按 id/code 判异、结算主体按 id 判异，任何一处不一致都在导入阶段拦截，
 * 避免用户填完整单后才被后端 422 拒绝。拼接收窄后的来源单号长度也在此提前校验。
 *
 * 后端表头供应商/结算主体由仍在明细中的来源行推导，因此仅当已存在来源明细行时才做一致性校验：
 * 用户删空全部明细后应允许改选其它供应商的订单重新开始，避免表头只读导致无法回退。
 */
export function validatePurchaseInboundParentImport({
  currentRecord,
  currentItems,
  currentParentNos,
  parentRecord,
}: {
  currentRecord: ModuleRecordInput
  currentItems: ModuleLineItem[]
  currentParentNos: string[]
  parentRecord: ModuleRecord
}): string | null {
  const hasExistingSourceLines = currentItems.some(
    (item) => asString(item.sourcePurchaseOrderItemId).trim() !== '',
  )
  if (currentParentNos.length > 0 && hasExistingSourceLines) {
    const currentSupplier = supplierIdentityOf(currentRecord)
    const parentSupplier = supplierIdentityOf(parentRecord)
    const supplierIdChanged =
      currentSupplier.id !== undefined &&
      parentSupplier.id !== undefined &&
      currentSupplier.id !== parentSupplier.id
    const supplierCodeChanged =
      currentSupplier.code !== '' &&
      parentSupplier.code !== '' &&
      currentSupplier.code !== parentSupplier.code
    if (supplierIdChanged || supplierCodeChanged) {
      return i18next.t('modules.pages.purchaseInbound.validationSameSupplier')
    }

    const currentCompanyId = parseOptionalEntityId(
      currentRecord.settlementCompanyId,
      'currentRecord.settlementCompanyId',
    )
    const parentCompanyId = parseOptionalEntityId(
      parentRecord.settlementCompanyId,
      'parentRecord.settlementCompanyId',
    )
    if (
      currentCompanyId !== undefined &&
      parentCompanyId !== undefined &&
      currentCompanyId !== parentCompanyId
    ) {
      return i18next.t(
        'modules.pages.purchaseInbound.validationSameSettlementCompany',
      )
    }
  }

  const nextParentNo = asString(parentRecord.orderNo).trim()
  if (nextParentNo && !currentParentNos.includes(nextParentNo)) {
    const mergedLength = [...currentParentNos, nextParentNo].join(', ').length
    if (mergedLength > MAX_PURCHASE_ORDER_NO_LENGTH) {
      return i18next.t(
        'modules.pages.purchaseInbound.validationPurchaseOrderNoTooLong',
        { max: MAX_PURCHASE_ORDER_NO_LENGTH },
      )
    }
  }
  return null
}

export function transformPurchaseOrderItemsToInboundItems(
  parentRecord: ModuleRecord,
) {
  return cloneLineItems(
    Array.isArray(parentRecord.items)
      ? parentRecord.items.map((item) => {
          const quantity = Number(item.remainingQuantity ?? item.quantity ?? 0)
          const pieceWeightTon = Number(item.pieceWeightTon || 0)
          const unitPrice = Number(item.unitPrice || 0)
          const weightTon = Number((quantity * pieceWeightTon).toFixed(8))
          return {
            ...item,
            sourceNo: parentRecord.orderNo || '',
            sourcePurchaseOrderItemId: item.id,
            settlementMode: isPurchaseWeighRequiredCategory(item.category)
              ? '过磅'
              : '理算',
            quantity,
            weightTon,
            weighWeightTon: undefined,
            weightAdjustmentTon: 0,
            weightAdjustmentAmount: 0,
            amount: Number((weightTon * unitPrice).toFixed(2)),
          }
        })
      : [],
    'purchase-inbound-item',
  )
}
