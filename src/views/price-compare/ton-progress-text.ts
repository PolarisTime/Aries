import type { TFunction } from 'i18next'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { formatWeight } from '@/utils/formatters'

/**
 * 吨位进度小字的文案与宽度口径(渲染与列宽计算共用的**唯一**来源)。
 *
 * <p>吨位列既要按当前字号缩放, 又要保证「已开 x/y · 品牌」完整可读; 后者只有把
 * 真实数据(吨位数字位数、品牌名长度)代进同一份文案才推算得出来。这里的函数被
 * {@link TonCell} 的渲染与 `useSheetColumnWidths` 的定宽同时调用, 避免两处各写一套
 * 格式化逻辑后逐渐漂移(列宽按 A 算、渲染成 B 就会被裁)。</p>
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
 * <p>数据粒度是**采购订单明细行**: 一行报单只关联一个明细行, 因此集合通常只有一个元素;
 * 仍按集合去重并用 `、` 拼接, 上游若放宽到多明细行时展示层不必再改。</p>
 */
export function issuedBrandText(record: PurchaseOrderTonnageRecord): string {
  return [...new Set([(record.brand ?? '').trim()].filter(Boolean))].join('、')
}

/** 进度小字的可见文案: 比值段(`已开 26/84`)与品牌段(`中天`)。 */
export interface TonProgressTextParts {
  /** 比值段(含「已开」前缀), 硬契约: 列宽不足时也不得被省略。 */
  ratio: string
  /** 品牌段, 可省: 列宽不足时先省略品牌。 */
  brand: string
}

/** 构造某条采购订单明细行的进度小字文案(与单元格渲染逐字一致)。 */
export function tonProgressTextParts(
  t: TFunction,
  record: PurchaseOrderTonnageRecord,
): TonProgressTextParts {
  return {
    ratio: t('priceCompare.sheet.purchaseOrderIssuedShort', {
      issued: `${compactTonText(record.issuedWeight)}/${compactTonText(record.orderedWeight)}`,
    }),
    brand: issuedBrandText(record),
  }
}

/**
 * 一组明细行里最宽的进度小字(px)。
 *
 * <p>用作吨位列的定宽依据: 列宽只需覆盖**本单据实际会出现**的最长文案, 既不会把
 * 「已开 0/12 · 中天」裁断, 也不会为用不到的品牌长度白留空白。</p>
 */
export function maxTonProgressTextWidth(
  t: TFunction,
  records: readonly PurchaseOrderTonnageRecord[],
  measure: (parts: TonProgressTextParts) => number,
): number {
  let max = 0
  for (const record of records) {
    max = Math.max(max, measure(tonProgressTextParts(t, record)))
  }
  return max
}
