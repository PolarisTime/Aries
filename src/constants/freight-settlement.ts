import type { ModuleRecordInput } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

/**
 * 物流单结算方式与固定运费口径。
 *
 * <p>字符串枚举由后端冻结（Jackson 按枚举名精确匹配），取值不可本地改写。
 * 本模块是「结算方式」口径的唯一来源：表单默认值、提交载荷、运费合计与后端契约都引用这里，
 * 避免同一个判断在表单、normalizer、schema 里各写一遍。</p>
 */

/** 按吨位结算：运费 = 单价 × 明细吨位合计（历史口径，也是缺省值）。 */
export const FREIGHT_SETTLEMENT_MODE_BY_TONNAGE = 'BY_TONNAGE'
/** 固定运费：运费 = 固定运费金额，与吨位无关。 */
export const FREIGHT_SETTLEMENT_MODE_FIXED = 'FIXED'

export const FREIGHT_SETTLEMENT_MODES = [
  FREIGHT_SETTLEMENT_MODE_BY_TONNAGE,
  FREIGHT_SETTLEMENT_MODE_FIXED,
] as const

export type FreightSettlementMode = (typeof FREIGHT_SETTLEMENT_MODES)[number]

/** 结算方式字段名（表单 / 请求 / 响应同名）。 */
export const SETTLEMENT_MODE_FIELD = 'settlementMode'
/** 固定运费金额字段名（表单 / 请求 / 响应同名）。 */
export const FIXED_FREIGHT_AMOUNT_FIELD = 'fixedFreightAmount'

/**
 * 生效的结算方式。
 *
 * <p>缺省、空值或历史脏值一律按「按吨位」处理：后端尚未上线（响应缺字段）或老数据回显时，
 * 行为与改造前完全一致，不会因为多了个模式字段而改变既有单据的运费。</p>
 */
export function resolveFreightSettlementMode(
  form?: ModuleRecordInput,
): FreightSettlementMode {
  return asString(form?.[SETTLEMENT_MODE_FIELD]).trim() ===
    FREIGHT_SETTLEMENT_MODE_FIXED
    ? FREIGHT_SETTLEMENT_MODE_FIXED
    : FREIGHT_SETTLEMENT_MODE_BY_TONNAGE
}

export function isFixedFreightSettlement(form?: ModuleRecordInput): boolean {
  return resolveFreightSettlementMode(form) === FREIGHT_SETTLEMENT_MODE_FIXED
}

/**
 * 固定运费金额（元）；按吨位模式返回 `null`。
 *
 * <p>按吨位模式必须显式提交 `null`：后端在该模式下把非 null 视为互斥冲突（422），
 * 而 `null` 会清空库里遗留的固定金额。</p>
 */
export function resolveFixedFreightAmount(
  form?: ModuleRecordInput,
): number | null {
  if (!isFixedFreightSettlement(form)) {
    return null
  }
  const amount = Number(form?.[FIXED_FREIGHT_AMOUNT_FIELD])
  return Number.isFinite(amount) ? amount : null
}

/** 固定运费金额是否可用于提交：固定运费模式要求非空且严格大于 0。 */
export function isValidFixedFreightAmount(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return false
  }
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0
}

/** 按吨位口径的运费 = 单价 × 吨位合计；只有按吨位模式下它才是结算金额。 */
export function resolveTonnageFreightAmount(form?: ModuleRecordInput): number {
  const unitPrice = Number(form?.unitPrice || 0)
  const totalWeight = Number(form?.totalWeight || 0)
  if (!Number.isFinite(unitPrice) || !Number.isFinite(totalWeight)) {
    return 0
  }
  return Number((unitPrice * totalWeight).toFixed(2))
}
