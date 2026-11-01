import i18next from 'i18next'
import { isPurchaseWeighRequiredCategory } from '@/module-system/core/module-option-resolvers'
import type { ModuleRecord, ModuleRecordInput } from '@/types/module-page'
import { multiplyAmount } from '@/utils/money'
import { asString } from '@/utils/type-narrowing'
import { buildAmountWeightOverview, cloneLineItems } from '../shared/shared'

/** 与 po_purchase_inbound.purchase_order_no 列一致的单号长度上限。 */
const MAX_PURCHASE_ORDER_NO_LENGTH = 256

export function buildPurchaseInboundOverview(rows: ModuleRecord[]) {
  return buildAmountWeightOverview(rows, 'totalAmount')
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
 * 单选导入：每次只回填一张采购订单的表头与明细，不再拼接多张来源单号，
 * 因此表头不会被"最后一单静默覆盖"——多选合并那条路径已随改单选下线。
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
 * 单选导入前置校验：
 * <ol>
 *   <li>已经导入过一张订单时，再选**另一张**订单直接拦下——否则共享适配器会把来源单号
 *     拼成「PO-1, PO-2」、明细混在一起，用户要填完整单才在保存时被混来源校验拒绝；</li>
 *   <li>采购订单号本身不超出列宽上限。</li>
 * </ol>
 *
 * <p>同单重复导入仍然放行：`buildParentImportState` 会按来源单号替换该单旧行，
 * 这是「重新导入以刷新剩余量」的正常路径。</p>
 */
export function validatePurchaseInboundParentImport({
  currentParentNos = [],
  parentRecord,
}: {
  currentParentNos?: string[]
  parentRecord: ModuleRecord
}): string | null {
  const orderNo = asString(parentRecord.orderNo).trim()
  const hasOtherSourceOrder = currentParentNos.some(
    (parentNo) => asString(parentNo).trim() !== orderNo,
  )
  if (hasOtherSourceOrder) {
    return i18next.t('modules.validation.purchaseInboundMixedSource')
  }
  if (orderNo.length > MAX_PURCHASE_ORDER_NO_LENGTH) {
    return i18next.t(
      'modules.pages.purchaseInbound.validationPurchaseOrderNoTooLong',
      { max: MAX_PURCHASE_ORDER_NO_LENGTH },
    )
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
            amount:
              Number.isFinite(weightTon) && Number.isFinite(unitPrice)
                ? multiplyAmount(weightTon, unitPrice)
                : Number.NaN,
          }
        })
      : [],
    'purchase-inbound-item',
  )
}
