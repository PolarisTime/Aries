import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { formatWeight } from '@/utils/formatters'

/**
 * 吨位进度列的文案与宽度口径(渲染与列宽计算共用的**唯一**来源)。
 *
 * <p>可见数字只有一句: 「未开吨位 = 订货吨位 − 已开吨位」(如 `10.19`), 品牌跟在后面。
 * 本单据报了多少吨由相邻的「报单吨位」列给出 —— 两个数并排, 用户自己就能看出"报的量是否
 * 超过订单还没开的量", 不再由一行文字替用户下结论。历史口径(「已开 0/10.19」斜杠比值、
 * 以及把报单量当基数的「剩余」)均已废弃。</p>
 *
 * <p>这里的函数同时被进度单元格的渲染与 `useSheetColumnWidths` 的定宽调用, 避免两处各写
 * 一套格式化逻辑后逐渐漂移(列宽按 A 算、渲染成 B 就会被裁)。</p>
 */

/**
 * 紧凑吨位: 去掉无意义的小数尾零(`26.000` → `26`)。
 * 明细(tooltip / popover)仍用精确值, 两种口径分工明确。
 */
export function compactTonText(value: number) {
  return formatWeight(value).replace(/\.?0+$/, '')
}

/**
 * 该行「已开」涉及的品牌集合。
 *
 * <p>数据粒度是**采购订单明细行**: 一行报单通常只关联一个明细行, 因此集合通常只有一个
 * 元素; 仍按集合去重并用 `、` 拼接, 上游若放宽到多明细行时展示层不必再改。</p>
 */
export function issuedBrandText(record: PurchaseOrderTonnageRecord): string {
  return [...new Set([(record.brand ?? '').trim()].filter(Boolean))].join('、')
}

/** 吨位进度小字的可见文案: 数字段(未开吨位)与品牌段。 */
export interface TonProgressTextParts {
  /** 数字段: 未开吨位 = 订货吨位 − 已开吨位(可为负, 表示已开超过订货量)。 */
  primary: string
  /** 品牌段, 可省: 列宽不足时先省略品牌。 */
  brand: string
}

/**
 * 「未开吨位」列的可见文案(与单元格渲染逐字一致)。
 *
 * <p>口径(业务确认): **未开吨位 = 订货吨位 − 已开吨位**。订货量是该采购订单明细行的
 * 订货量(锁定/定稿后的量), 已开吨位是**其他已保存报单**占用该明细行的量(本单据自身被
 * 排除, 避免自证); 两者相减就是这条明细还没开的量。本单据这一行报了多少吨由「报单吨位」
 * 列单独给出, 两个数并排就能看出"报的量是否超过了订单还没开的量", 不再由一行文字下结论。</p>
 *
 * <p>负值只可能来自"已开量超过订货量", 属于真正的异常, 由单元格标红并在悬浮明细里说明。</p>
 */
export function tonProgressTextParts(
  record: PurchaseOrderTonnageRecord,
): TonProgressTextParts {
  const unopened = record.orderedWeight - record.issuedWeight
  return {
    primary: compactTonText(unopened),
    brand: issuedBrandText(record),
  }
}

/**
 * 一组明细行里最宽的一条未开吨位文案(px)。
 *
 * <p>用作未开吨位列的定宽依据: 列宽只需覆盖**本单据实际会出现**的吨位位数与品牌长度,
 * 不会把「10.19 · 中天钢铁」裁断, 也不会为用不到的品牌长度白留空白。</p>
 */
export function maxTonProgressTextWidth(
  records: readonly PurchaseOrderTonnageRecord[],
  measure: (parts: TonProgressTextParts) => number,
): number {
  let max = 0
  for (const record of records) {
    max = Math.max(max, measure(tonProgressTextParts(record)))
  }
  return max
}
