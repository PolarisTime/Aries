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

/** 报价行的「材质 / 规格 / 长度」目标值(选单自动筛选用)。 */
export interface PickerVarietyTarget {
  material?: string | null
  spec?: string | number | null
  length?: string | null
}

/**
 * 归一化比较用文本: 去空白、统一大写、把数值写法收敛(「16.0」与「16」视为同一规格)。
 * 空值与占位符「-」归一为 '', 表示"该项不参与比较"。
 */
function normalizeVarietyText(
  value: string | number | null | undefined,
): string {
  const text = String(value ?? '')
    .replace(/\s+/g, '')
    .toUpperCase()
  if (!text || text === '-') return ''
  if (/^-?\d+(\.\d+)?$/.test(text)) return String(Number(text))
  return text
}

/**
 * 该采购订单明细行是否与报价行的「材质 / 规格 / 长度」一致。
 *
 * <p>任一项目标值为空(或「-」)时不参与筛选 —— 盘螺这类订单行没有长度, 若把空值当作
 * "必须等于空"会把可选项全过滤掉。</p>
 */
export function matchesPickerVariety(
  record: PurchaseOrderTonnageRecord,
  target?: PickerVarietyTarget,
): boolean {
  if (!target) return true
  const pairs: [string, string][] = [
    [
      normalizeVarietyText(target.material),
      normalizeVarietyText(record.material),
    ],
    [normalizeVarietyText(target.spec), normalizeVarietyText(record.spec)],
    [normalizeVarietyText(target.length), normalizeVarietyText(record.length)],
  ]
  return pairs.every(([want, got]) => !want || want === got)
}
