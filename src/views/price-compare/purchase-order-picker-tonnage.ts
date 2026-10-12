import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'

/**
 * 该明细行剩余可关联吨位(吨) = 服务端剩余吨位 - 本单据已关联吨位。
 *
 * <p>服务端 `remainingWeight` 在传入 excludeSheetId 时已排除本单据已保存吨位, 但本单据
 * 页面上手填(含未保存)的吨位不在服务端统计内, 因此这里再扣一次本单据的已关联合计。
 * 缺失/非法 remainingWeight 时回退到 `订货 - 已开`, 不用 0 兜底(0 会把行误判成已关联完)。</p>
 *
 * <p>放在非组件模块：这是纯吨位换算，弹窗与它的测试都直接引用同一份实现。</p>
 */
export function remainingLinkableTon(
  record: PurchaseOrderTonnageRecord,
  linkedTonByItemId?: Map<string, number>,
): number {
  const base = Number.isFinite(record.remainingWeight)
    ? record.remainingWeight
    : record.orderedWeight - record.issuedWeight
  const linkedHere = linkedTonByItemId?.get(record.purchaseOrderItemId) ?? 0
  return base - linkedHere
}
