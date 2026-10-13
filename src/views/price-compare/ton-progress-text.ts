import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { formatWeight } from '@/utils/formatters'

/**
 * 吨位进度列的文案与宽度口径(渲染与列宽计算共用的**唯一**来源)。
 *
 * <p>可见数字只有一句: 「未开吨位 = 锁定后的报单吨位 − 已开吨位」(如 `10.19`), 品牌跟在
 * 后面。它的两个操作数就是左边两列已经显示出来的数(手填并锁定的报单吨位、已开吨位),
 * 用户不必再心算; 采购订单的订货量只作参考与选择依据。</p>
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
  /** 数字段: 未开吨位 = 锁定后的报单吨位 − 已开吨位(可为负, 表示已开超过本单报的量)。 */
  primary: string
  /** 品牌段, 可省: 列宽不足时先省略品牌。 */
  brand: string
}

/**
 * 「未开吨位」列的可见文案(与单元格渲染逐字一致)。
 *
 * <p>口径(业务确认): **未开吨位 = 锁定后的报单吨位 − 已开吨位**。基数就是本单据这一行
 * 手填并锁定后的报单吨位(同一订单明细行在本单据内有多行时取各行合计), 已开吨位是
 * 「已开吨位」列显示的那个数(其他已保存报单占用该明细行的量)。两个已显示的数列相减,
 * 用户不必再心算; 采购订单的订货量只作参考与选择依据, 不进这个减法。</p>
 *
 * <p>负值只可能来自"已开量超过本单报的量", 属于真正的异常, 由单元格标红并在悬浮明细里
 * 用两个具体数字说明。</p>
 */
export function tonProgressTextParts(
  record: PurchaseOrderTonnageRecord,
  reportedTon: number,
): TonProgressTextParts {
  const reported = Number.isFinite(reportedTon) ? reportedTon : 0
  return {
    primary: compactTonText(reported - record.issuedWeight),
    brand: issuedBrandText(record),
  }
}

/**
 * 一组明细行里最宽的一条未开吨位文案(px)。
 *
 * <p>用作未开吨位列的定宽依据: 列宽只需覆盖**本单据实际会出现**的吨位位数与品牌长度,
 * 既不会把「-20 · 中天钢铁」裁断, 也不会为用不到的品牌长度白留空白。还没填报单吨位的明细行
 * 在单元格里显示的是短状态标签(宽度远小于数字下界), 因此不参与比较。</p>
 */
export function maxTonProgressTextWidth(
  records: readonly PurchaseOrderTonnageRecord[],
  localTonByItemId: ReadonlyMap<string, number>,
  measure: (parts: TonProgressTextParts) => number,
): number {
  let max = 0
  for (const record of records) {
    const reportedTon = localTonByItemId.get(record.purchaseOrderItemId) ?? 0
    // 报单为 0 时单元格显示的是短状态标签(「未填吨位」), 不参与数字宽度比较
    if (reportedTon <= 0) continue
    max = Math.max(max, measure(tonProgressTextParts(record, reportedTon)))
  }
  return max
}
