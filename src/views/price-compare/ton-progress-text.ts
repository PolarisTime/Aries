import type { TFunction } from 'i18next'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { formatWeight } from '@/utils/formatters'

/**
 * 吨位进度小字的文案与宽度口径(渲染与列宽计算共用的**唯一**来源)。
 *
 * <p>可见文案只说一句话: 「剩余 10.19 · 中天」—— 基数固定为**本单据该订单明细行的报单
 * 吨位**, 减去已开吨位即为剩余。早期版本分别用过「已开 0/10.19」斜杠比值与「订货量 − 已开」
 * 两种口径, 前者要用户自己心算, 后者把采购订单的订货量当成了上限(报 12 吨、订单 10 吨会被
 * 误判超额), 均已废弃; 订货量/已开/报单合计等完整口径由悬浮明细与 ⓘ 弹层承载。</p>
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

/** 进度小字的可见文案: 主段(剩余吨位 / 已开超量 / 已开量)与品牌段。 */
export interface TonProgressTextParts {
  /** 主段: 正常时是剩余吨位, 已开超时报超出量, 本单据未报量时报已开量。 */
  primary: string
  /** 品牌段, 可省: 列宽不足时先省略品牌。 */
  brand: string
}

/**
 * 进度小字的三态文案(与单元格渲染逐字一致)。
 *
 * <p>口径按业务确认改为「**锁定后的报单吨位 − 已开吨位 = 剩余吨位**」: 报单吨位(本单据该
 * 订单明细行的报单合计)是这一批要开的量, 已开吨位是**其他已保存报单**占用该明细行的量,
 * 两者相减就是还剩多少没开。采购订单的订货量只是参考信息, 不再作为上限参与判定 ——
 * 早期版本用「订货量 − 已开」当剩余, 于是"报 12 吨、订单 10 吨"会被判成超额, 用户反馈
 * 逻辑不对(报单本来就可能先于采购)。</p>
 *
 * <p>三种状态:</p>
 * <ol>
 *   <li>报单 > 已开: 「剩余 x」—— 还能开多少;</li>
 *   <li>报单 &lt; 已开: 「已开超 x」—— 别人已经开的量超过了本单据报的量(真正的异常);</li>
 *   <li>本单据尚未报量(报单为 0): 「已开 x」—— 只说明这条明细已被开了多少。</li>
 * </ol>
 */
export function tonProgressTextParts(
  t: TFunction,
  record: PurchaseOrderTonnageRecord,
  reportedTon: number,
): TonProgressTextParts {
  // 容错: 吨位输入框可能给出空值/NaN, 一律按"本单据尚未报量"处理, 不把 NaN 显示给用户
  const reported = Number.isFinite(reportedTon) ? reportedTon : 0
  const issued = record.issuedWeight
  const remaining = reported - issued
  return {
    primary:
      reported <= 0
        ? t('priceCompare.sheet.purchaseOrderIssuedShort', {
            issued: compactTonText(issued),
          })
        : remaining < 0
          ? t('priceCompare.sheet.purchaseOrderIssuedOverShort', {
              weight: compactTonText(-remaining),
            })
          : t('priceCompare.sheet.purchaseOrderRemainingShort', {
              weight: compactTonText(remaining),
            }),
    brand: issuedBrandText(record),
  }
}

/**
 * 一组明细行里最宽的一条进度小字(px)。
 *
 * <p>用作吨位列的定宽依据: 列宽只需覆盖**本单据实际会出现**的最长文案, 既不会把
 * 「剩余 27.768 · 中天钢铁」裁断, 也不会为用不到的品牌长度白留空白。本单据当前报单量与
 * "尚未报量"两种状态都参与比较, 三种状态之间切换时列宽不会突然不够。</p>
 */
export function maxTonProgressTextWidth(
  t: TFunction,
  records: readonly PurchaseOrderTonnageRecord[],
  localTonByItemId: ReadonlyMap<string, number>,
  measure: (parts: TonProgressTextParts) => number,
): number {
  let max = 0
  for (const record of records) {
    const reportedTon = localTonByItemId.get(record.purchaseOrderItemId) ?? 0
    max = Math.max(
      max,
      measure(tonProgressTextParts(t, record, reportedTon)),
      // "本单据尚未报量"状态(文案变成「已开 issued」)也要覆盖
      measure(tonProgressTextParts(t, record, 0)),
    )
  }
  return max
}
