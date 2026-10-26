import dayjs from 'dayjs'
import type { MaterialPriceMatch } from '@/api/market/steel-quotes'
import { recalculateEditorLineItem } from '@/module-system/editor/module-editor-line-item-calculations'
import type { ModuleLineItem } from '@/types/module-page'
import { substituteMaterialOf } from '@/utils/material-grade'

export type PriceFloatMode = 'ADD' | 'SUBTRACT'

/**
 * 规整日期为 `YYYY-MM-DD`：
 * 兼容 dayjs 对象、ISO 字符串（含时间）与 `YYYY年M月D日` 等展示格式；无法解析时返回空串。
 */
export function normalizeDateValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value.format('YYYY-MM-DD') : ''
  }
  if (value instanceof Date) {
    const parsed = dayjs(value)
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : ''
  }
  const text = String(value).trim()
  if (!text) return ''
  const direct = /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`
  const cn = /^(\d{4})年(\d{1,2})月(\d{1,2})日/.exec(text)
  if (cn) {
    return `${cn[1]}-${cn[2].padStart(2, '0')}-${cn[3].padStart(2, '0')}`
  }
  const parsed = dayjs(text)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : ''
}

/** 按 2 位小数四舍五入（与后端金额精度口径一致）。 */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * 按项目浮动约定计算单价：ADD 加价、SUBTRACT 减价；未配置浮动则原价。
 * 幅度缺失或非有限值时按原价处理。
 */
export function applyNetPriceFloat(
  netPrice: number,
  mode: PriceFloatMode | undefined,
  value: number | undefined,
): number {
  if ((mode === 'ADD' || mode === 'SUBTRACT') && Number.isFinite(value)) {
    const delta = Number(value)
    return round2(mode === 'SUBTRACT' ? netPrice - delta : netPrice + delta)
  }
  return round2(netPrice)
}

/** 从行情匹配结果构建索引：优先按 materialId，其次按 品牌|类别|材质|规格|长度。 */
export function buildNetPriceIndex(rows: MaterialPriceMatch[]): {
  byId: Map<string, number>
  byKey: Map<string, number>
} {
  const byId = new Map<string, number>()
  const byKey = new Map<string, number>()
  for (const row of rows) {
    if (row.price == null) continue
    const price = Number(row.price)
    if (!Number.isFinite(price)) continue
    if (row.materialId != null) byId.set(String(row.materialId), price)
    byKey.set(matchKey(row), price)
  }
  return { byId, byKey }
}

/** 单次取价命中的来源: 本行材质 / 替代抗震牌号。 */
export interface NetPriceHit {
  price: number
  /** 命中的材质(替代时为 400E 之类), 供结果摘要说明"按哪个牌号取的价"。 */
  matchedMaterial?: string
  /**
   * 命中的是替代牌号(本行材质其实没有网价)。
   * 渲染层据此在该行给出「已按 400E 取价」的可见说明 —— 不能静默替换。
   */
  substituted?: boolean
}

/**
 * 解析某明细行的网价命中(含抗震牌号替代): 先按 materialId, 再按商品维度键,
 * 最后按"补 E"的替代牌号重试一次。
 */
export function resolveNetPriceHit(
  item: ModuleLineItem,
  index: { byId: Map<string, number>; byKey: Map<string, number> },
): NetPriceHit | undefined {
  const materialId = String(item.materialId ?? '').trim()
  if (materialId) {
    const byMaterialId = index.byId.get(materialId)
    if (byMaterialId !== undefined) {
      return {
        price: byMaterialId,
        ...(item.material ? { matchedMaterial: String(item.material) } : {}),
      }
    }
  }
  const direct = index.byKey.get(itemMatchKey(item))
  if (direct !== undefined) {
    return {
      price: direct,
      ...(item.material ? { matchedMaterial: String(item.material) } : {}),
    }
  }
  /*
   * 本行材质无网价: 尝试抗震牌号(HRB400 → HRB400E)。
   *
   * 业务上这就是"400 没货用 400E 代替", 且按 400E 的实际网价结算(不减价差) ——
   * 实际采购的就是 400E, 成本就是它的价。因此这里直接返回 400E 的价, 不做任何金额调整。
   */
  const substitute = substituteMaterialOf(item.material)
  if (!substitute) return undefined
  const substitutedPrice = index.byKey.get(
    itemMatchKey({ ...item, material: substitute }),
  )
  if (substitutedPrice === undefined) return undefined
  return {
    price: substitutedPrice,
    matchedMaterial: substitute,
    substituted: true,
  }
}

function matchKey(row: {
  brand?: string | null
  category?: string | null
  material?: string | null
  spec?: string | null
  length?: string | null
}): string {
  return [
    row.brand ?? '',
    row.category ?? '',
    row.material ?? '',
    row.spec ?? '',
    row.length ?? '',
  ].join('|')
}

function itemMatchKey(item: ModuleLineItem): string {
  return matchKey({
    brand: item.brand as string | undefined,
    category: item.category as string | undefined,
    material: item.material as string | undefined,
    spec: item.spec as string | undefined,
    length: item.length as string | undefined,
  })
}

/** 网价索引(buildNetPriceIndex 的产物)。 */
export type NetPriceIndex = ReturnType<typeof buildNetPriceIndex>

/** 生效的加价 / 减价规则(来自所选价格规定)。 */
export interface NetPriceRule {
  mode?: PriceFloatMode
  amount?: number
}

/** 单行「网价匹配」状态。 */
export type NetPriceMatchState =
  /** 当前单价 = 网价按规则换算后的应有单价。 */
  | 'MATCHED'
  /** 当前单价 ≠ 应有单价(含单价为空)。 */
  | 'MISMATCH'
  /** 本次取价日/时段没有该行的网价。 */
  | 'NO_PRICE'
  /** 还没核查过。 */
  | 'UNCHECKED'

/** 单行匹配核查结果。 */
export interface NetPriceMatchEntry {
  state: NetPriceMatchState
  /** 应有单价 = 网价按加价/减价规则换算后(两位小数)。 */
  expectedPrice?: number
  /** 当前单价(空值不下发)。 */
  currentPrice?: number
  /**
   * 本行取价用的是抗震牌号替代(如报 HRB400、按 HRB400E 取价)。
   *
   * <p>替代必须一路可见到行内: 报单写的是 400, 网价却来自 400E, 用户要在行上直接看到,
   * 而不是只能靠结果摘要里的一个条数去猜是哪几行。</p>
   */
  substitutedMaterial?: string
}

/** 金额比较容差: 单价为两位小数, 半分以内视为同值。 */
const PRICE_EPSILON = 0.005

/** 行是否具备商品身份(可参与取价 / 核查): 有物料 id, 或有品牌/材质信息。 */
export function hasItemIdentity(item: ModuleLineItem): boolean {
  const materialId = String(item.materialId ?? '').trim()
  const material = String(item.material ?? '').trim()
  const brand = String(item.brand ?? '').trim()
  return Boolean(materialId || material || brand)
}

/** 无网价行的提示标识: 优先物料名, 其次品牌, 最后行 id。 */
export function netPriceItemLabel(item: ModuleLineItem): string {
  return String(item.material || item.brand || item.id)
}

/** 从行里读数值(空 / 非有限返回 undefined)。 */
function toFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
}

/**
 * 核查单行: 当前单价是否等于「网价按加价/减价规则换算后的应有单价」。
 *
 * <p>单价为空时判为「不匹配」—— 该行确实没有落在网价口径上, 整单取价会把它补上;
 * 只有取不到网价才是「无网价」(保持原值, 由用户手工填写)。</p>
 */
export function evaluateNetPriceMatch(
  item: ModuleLineItem,
  index: NetPriceIndex,
  rule?: NetPriceRule,
): NetPriceMatchEntry {
  const currentPrice = toFiniteNumber(item.unitPrice)
  const hit = resolveNetPriceHit(item, index)
  if (hit === undefined) {
    return {
      state: 'NO_PRICE',
      ...(currentPrice === undefined ? {} : { currentPrice }),
    }
  }
  const expectedPrice = applyNetPriceFloat(hit.price, rule?.mode, rule?.amount)
  // 替代牌号随结果一起带出, 行内标识据此说明"本行按哪个牌号取的价"
  const substituted =
    hit.substituted && hit.matchedMaterial
      ? { substitutedMaterial: hit.matchedMaterial }
      : {}
  if (currentPrice === undefined) {
    return { state: 'MISMATCH', expectedPrice, ...substituted }
  }
  return {
    state:
      Math.abs(currentPrice - expectedPrice) < PRICE_EPSILON
        ? 'MATCHED'
        : 'MISMATCH',
    expectedPrice,
    currentPrice,
    ...substituted,
  }
}

/** 整单核查汇总。 */
export interface NetPriceMatchSummary {
  total: number
  matched: number
  mismatch: number
  noPrice: number
  unchecked: number
  /** 不匹配行的 id(按单据顺序), 供汇总提示逐条定位。 */
  mismatchIds: string[]
}

/** 汇总整单匹配状态(按明细顺序; 未在 map 里的行记为「未核查」)。 */
export function summarizeNetPriceMatch(
  items: readonly ModuleLineItem[],
  entries: Readonly<Record<string, NetPriceMatchEntry>>,
): NetPriceMatchSummary {
  const summary: NetPriceMatchSummary = {
    total: items.length,
    matched: 0,
    mismatch: 0,
    noPrice: 0,
    unchecked: 0,
    mismatchIds: [],
  }
  for (const item of items) {
    const entry = entries[String(item.id)]
    if (!entry || entry.state === 'UNCHECKED') {
      summary.unchecked += 1
      continue
    }
    if (entry.state === 'MATCHED') {
      summary.matched += 1
    } else if (entry.state === 'MISMATCH') {
      summary.mismatch += 1
      summary.mismatchIds.push(String(item.id))
    } else {
      summary.noPrice += 1
    }
  }
  return summary
}

/** 整单取价的逐行结果。 */
export interface NetPriceApplyOutcome {
  nextItems: ModuleLineItem[]
  /** 成功按网价写入单价的行数。 */
  filled: number
  /** 无网价、保持原值的行(展示标识)。 */
  noPrice: string[]
  /** 无网价行的 id(按单据顺序), 供结果摘要逐条定位。 */
  noPriceIds: string[]
  /** 无商品身份被跳过的行数(空行)。 */
  skipped: number
  /** 本次单价被改写的行 id(供"覆盖了手工单价"的确认与结果定位)。 */
  overwrittenIds: string[]
  /**
   * 按抗震牌号替代取价的行: { 行id: 实际命中的牌号(如 HRB400E) }。
   *
   * <p>替代必须可见: 用户报的是 HRB400, 系统却按 HRB400E 的价填单, 不说明就是"悄悄改了
   * 计价口径"。渲染层据此在该行标注, 结果摘要也给出条数。</p>
   */
  substitutedIds: Record<string, string>
}

/**
 * 整单取价: 对每一行按同一份口径(解析出的取价日/时段 + 加价减价规则)写入单价。
 *
 * <p>逐行弹层与草稿整单取价共用这一处实现 —— 口径只有一份, 不再各写一遍取价逻辑。
 * 无网价的行保持原值(由用户手工填写), 无商品身份的空行跳过。</p>
 */
export function applyNetPricesToItems(
  items: readonly ModuleLineItem[],
  index: NetPriceIndex,
  rule?: NetPriceRule,
): NetPriceApplyOutcome {
  const nextItems: ModuleLineItem[] = []
  const noPrice: string[] = []
  const noPriceIds: string[] = []
  const overwrittenIds: string[] = []
  const substitutedIds: Record<string, string> = {}
  let filled = 0
  let skipped = 0
  for (const item of items) {
    if (!hasItemIdentity(item)) {
      skipped += 1
      nextItems.push(item)
      continue
    }
    const hit = resolveNetPriceHit(item, index)
    if (hit === undefined) {
      noPrice.push(netPriceItemLabel(item))
      noPriceIds.push(String(item.id))
      nextItems.push(item)
      continue
    }
    // 替代牌号的行按 400E 的实际网价结算(不减价差): 实际买的就是 400E
    const nextPrice = applyNetPriceFloat(hit.price, rule?.mode, rule?.amount)
    if (toFiniteNumber(item.unitPrice) !== nextPrice) {
      overwrittenIds.push(String(item.id))
    }
    if (hit.substituted && hit.matchedMaterial) {
      substitutedIds[String(item.id)] = hit.matchedMaterial
    }
    filled += 1
    /*
     * 只改单价是不够的：行金额与重量调整金额都由「单价」派生（金额 = 单价 × 重量），
     * 手工改单价走的也是 recalculateEditorLineItem。整单取价必须复用同一口径，
     * 否则单价变了、行金额与页内合计（总金额）仍停在旧值。
     */
    nextItems.push(
      recalculateEditorLineItem({ ...item, unitPrice: nextPrice }, 'unitPrice'),
    )
  }
  return {
    nextItems,
    filled,
    noPrice,
    noPriceIds,
    skipped,
    overwrittenIds,
    substitutedIds,
  }
}
