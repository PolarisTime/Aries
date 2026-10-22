import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'

/**
 * 该明细行**还能被本单据关联多少吨** —— 选单弹窗"额度"口径的**唯一出口**。
 *
 * <p><b>这不是「剩余未开」。</b>表格列上的「剩余未开」= 本单据该明细行的报单吨位 − 真实已开货
 * (`ton-progress-text.remainingTonDisplay`); 本函数算的是**采购订单侧还能不能再挂一次**,
 * 两者分母与业务含义都不同:</p>
 * - 「剩余未开」分母是**本单据的报单吨位**(报单视角的进度, 与用户手填有关);
 * - 本函数分母是**采购订单明细行的剩余可开量**(订单视角的余量, 与手填无关)。
 *
 * <p>实测踩过的坑: 同一行在选单弹窗显示「剩余 2.300」、表格列显示「剩余未开 5」, 用户以为
 * 其中一个算错了 —— 其实两个都对, 但"剩余"这个词在两处指的不是同一件事, 且弹窗里还同时
 * 打了「已关联完」标签(额度已用尽), 变成「剩 2.300 + 已关联完」的自相矛盾同屏。修法是:
 * 额度口径收敛到本函数一处(标签判定与数值单元格**共用**它), 列名与文案各自带上作用域。</p>
 *
 * <p>算法 = 服务端剩余 − 本单据已关联。服务端 `remainingWeight` 在传入 excludeSheetId 时已
 * 排除本单据**已保存**吨位, 但页面上手填(含未保存)的吨位不在服务端统计内, 因此这里再扣一次。
 * 缺失/非法 remainingWeight 时回退到 `订货 - 已开`, 不用 0 兜底(0 会把行误判成已关联完)。</p>
 *
 * <p>放在非组件模块: 这是纯吨位换算, 弹窗与它的测试都直接引用同一份实现。</p>
 */
export function remainingLinkableTon(
  record: PurchaseOrderTonnageRecord,
  linkedTonByItemId?: Map<string, number>,
): number {
  return remainingLinkableQuota(record, linkedTonByItemId).remaining
}

/** 额度口径的完整结果: 数值 + 本单据是否已用尽 + 本单据已关联量(供悬浮说明复用)。 */
export interface LinkableQuota {
  /** 还能关联的吨位(可能为负: 本单据已超关联)。 */
  remaining: number
  /** 本单据在该明细行上已关联的吨位合计。 */
  linkedHere: number
  /** 额度已用尽(<= 0): 「已关联完」标签与"不可选"判定的唯一依据。 */
  exhausted: boolean
}

/**
 * 额度口径的**结构化出口**: 数值、已关联量、是否用尽三者由同一次计算给出。
 *
 * <p>为什么不让各处各取所需: 「已关联完」标签曾用 `remainingLinkableTon(...) <= 0` 判定,
 * 而同一行的吨位单元格直接渲染服务端 `remainingWeight`, 于是出现"单元格 2.300、标签已关联完"
 * 的同屏矛盾。现在单元格渲染 `quota.remaining`、标签用 `quota.exhausted`, 两者同源。</p>
 */
export function remainingLinkableQuota(
  record: PurchaseOrderTonnageRecord,
  linkedTonByItemId?: Map<string, number>,
): LinkableQuota {
  const base = Number.isFinite(record.remainingWeight)
    ? record.remainingWeight
    : record.orderedWeight - record.issuedWeight
  const linkedHere = linkedTonByItemId?.get(record.purchaseOrderItemId) ?? 0
  const remaining = base - linkedHere
  return { remaining, linkedHere, exhausted: remaining <= 0 }
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

/**
 * 选单弹层里的「分配吨位」默认值（**唯一默认口径**）。
 *
 * <p>按勾选顺序把**本行报单吨位**依次摊到各明细行，单条最多吃到该明细行的订货量，摊完为止。
 * 这只是初值 —— 用户可在弹层里逐行改写（一单货覆盖多个批次时，具体归谁由业务定，不由顺序定）。</p>
 *
 * @returns purchaseOrderItemId → 默认分配吨位
 */
export function defaultPickAllocations(
  records: readonly PurchaseOrderTonnageRecord[],
  reportedTon: number,
): Map<string, number> {
  let remaining =
    Number.isFinite(reportedTon) && reportedTon > 0 ? reportedTon : 0
  const allocations = new Map<string, number>()
  for (const record of records) {
    const ordered =
      Number.isFinite(record.orderedWeight) && record.orderedWeight > 0
        ? record.orderedWeight
        : 0
    const allocated = Math.max(0, Math.min(remaining, ordered))
    remaining -= allocated
    allocations.set(record.purchaseOrderItemId, allocated)
  }
  return allocations
}

/** 单条明细行允许分配的上限: 订货量与本行报单吨位中较小者（再叠加后端 Σ ≤ 报单吨位校验）。 */
export function maxAllocateTon(
  record: PurchaseOrderTonnageRecord,
  reportedTon: number,
): number {
  const ordered =
    Number.isFinite(record.orderedWeight) && record.orderedWeight > 0
      ? record.orderedWeight
      : 0
  const reported =
    Number.isFinite(reportedTon) && reportedTon > 0 ? reportedTon : 0
  return Math.max(0, Math.min(ordered, reported))
}
