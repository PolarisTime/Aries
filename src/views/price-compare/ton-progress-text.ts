import type { TFunction } from 'i18next'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { formatWeight } from '@/utils/formatters'

/**
 * 吨位进度小字的文案与宽度口径(渲染与列宽计算共用的**唯一**来源)。
 *
 * <p>可见文案只说一句话: 「剩余 10.19 · 中天」—— 直接回答"这条订单明细还能开多少"。
 * 早期版本显示的是「已开 0/10.19」这种"已开 / 订货"斜杠比值, 用户得自己心算剩余、
 * 还要先分清哪个数在前, 实测反馈"难以理解"; 订货/已开/含未保存/超额量等完整口径
 * 改由悬浮明细与 ⓘ 弹层承载(悬停或点一下即可, 不占列宽)。</p>
 *
 * <p>这里的函数同时被 {@link TonCell} 的渲染与 `useSheetColumnWidths` 的定宽调用,
 * 避免两处各写一套格式化逻辑后逐渐漂移(列宽按 A 算、渲染成 B 就会被裁)。</p>
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

/** 该明细行的剩余可开吨 = 订货吨位 − 实际已开吨位(不含本单据未保存吨位)。 */
export function remainingWeightOf(record: PurchaseOrderTonnageRecord): number {
  return record.orderedWeight - record.issuedWeight
}

/** 进度小字的可见文案: 主段(剩余可开吨 / 超额量)与品牌段。 */
export interface TonProgressTextParts {
  /** 主段: 正常时是剩余可开吨, 超额时是超出部分。 */
  primary: string
  /** 品牌段, 可省: 列宽不足时先省略品牌。 */
  brand: string
}

/**
 * 构造某条采购订单明细行的进度小字文案(与单元格渲染逐字一致)。
 *
 * <p>超额时主段换成「超额 1.81」: 这一刻用户最需要的是"超了多少"(本行吨位就在左侧输入框
 * 里), 剩余可开吨在同一格的悬浮明细里; 用同一个数字段承载两种状态, 列宽不随状态跳动。</p>
 */
export function tonProgressTextParts(
  t: TFunction,
  record: PurchaseOrderTonnageRecord,
  projectedIssued: number,
): TonProgressTextParts {
  const overWeight = projectedIssued - record.orderedWeight
  return {
    primary:
      overWeight > 0
        ? t('priceCompare.sheet.purchaseOrderOverLimitShort', {
            weight: compactTonText(overWeight),
          })
        : t('priceCompare.sheet.purchaseOrderRemainingShort', {
            weight: compactTonText(remainingWeightOf(record)),
          }),
    brand: issuedBrandText(record),
  }
}

/**
 * 一组明细行里最宽的一条进度小字(px)。
 *
 * <p>用作吨位列的定宽依据: 列宽只需覆盖**本单据实际会出现**的最长文案, 既不会把
 * 「剩余 27.768 · 中天钢铁」裁断, 也不会为用不到的品牌长度白留空白。未超额与超额
 * 两种文案都参与比较(超额量取"本单据未保存吨位"算出的真实值), 状态切换时列宽不抖。</p>
 */
export function maxTonProgressTextWidth(
  t: TFunction,
  records: readonly PurchaseOrderTonnageRecord[],
  localTonByItemId: ReadonlyMap<string, number>,
  measure: (parts: TonProgressTextParts) => number,
): number {
  let max = 0
  for (const record of records) {
    const localTon = localTonByItemId.get(record.purchaseOrderItemId) ?? 0
    max = Math.max(
      max,
      measure(tonProgressTextParts(t, record, record.issuedWeight + localTon)),
      // 未超额口径(未保存吨位为 0)也要覆盖: 明细行可能尚未在本单据里填吨位
      measure(tonProgressTextParts(t, record, record.issuedWeight)),
    )
  }
  return max
}
