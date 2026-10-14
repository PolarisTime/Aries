import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { formatWeight } from '@/utils/formatters'
import { estimateSheetTextWidth, TON_PROGRESS_FONT_SIZE } from './core'

/**
 * 吨位进度列的文案与宽度口径(渲染与列宽计算共用的**唯一**来源)。
 *
 * <p>可见数字只有一句: **「已开吨位 = 本单据该明细行报单吨位 + 其他已保存报单占用」**(如
 * `20`), 品牌跟在后面 —— 用户关联了订单明细行后, 这一列直接回答"这条明细行开出了多少"。
 * 「剩余未开吨位」= 订货吨位 − 已开吨位, 是同一份口径的另一半(见 tonRemainingText)。</p>
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

/** 吨位进度小字的可见文案: 数字段(已开吨位)与品牌段。 */
export interface TonProgressTextParts {
  /** 数字段: 已开吨位 = 本单据报单吨位 + 其他已保存报单占用(含本单据自己那一份)。 */
  primary: string
  /** 品牌段, 可省: 列宽不足时先省略品牌。 */
  brand: string
}

/**
 * 「已开吨位」列的可见文案(与单元格渲染逐字一致)。
 *
 * <p>口径(业务确认, 2026-10-14 修正): **已开吨位 = 本单据该订单明细行的报单吨位合计 +
 * 其他已保存报单占用**。关联了有效订单明细行之后, 这一列就是要回答"这条明细行开出了多少",
 * 因此必须把本单据自己报的量算进去; `record.issuedWeight` 来自服务端, 只含**其他**报单。</p>
 *
 * <p>负值不会出现(两项都非负); 真正需要标红的是"已开合计 > 订货吨位", 由单元格用
 * {@link tonRemainingText} 的负值判断并说明。</p>
 */
export function tonProgressTextParts(
  record: PurchaseOrderTonnageRecord,
  reportedTon: number,
): TonProgressTextParts {
  const reported = Number.isFinite(reportedTon) ? reportedTon : 0
  return {
    primary: compactTonText(record.issuedWeight + reported),
    brand: issuedBrandText(record),
  }
}

/**
 * 「剩余未开吨位」列的可见文案: **订货吨位 − 已开吨位**(可为负, 表示这条明细行被超开)。
 *
 * <p>订货吨位来自采购订单明细行本身, 不是本单据报的量 —— 本单据报多少已经在
 * 「报单吨位」列显示, 这里显示的是订单侧还剩多少可开。</p>
 */
export function tonRemainingText(
  record: PurchaseOrderTonnageRecord,
  reportedTon: number,
): string {
  const reported = Number.isFinite(reportedTon) ? reportedTon : 0
  return compactTonText(record.orderedWeight - (record.issuedWeight + reported))
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

/**
 * 「剩余未开吨位」列的内容宽(px): 按单据里最长的一条剩余吨位估算。
 *
 * <p>该列只放一个固定 11px 的只读数字(不随个人字号缩放), 因此列宽按内容给即可 ——
 * 数字短(如 `0.7`)时不留空白, 负数(超开)或长吨位也裁不到。</p>
 */
export function maxRemainingTonTextWidth(
  records: readonly PurchaseOrderTonnageRecord[],
  localTonByItemId: ReadonlyMap<string, number>,
): number {
  let max = 0
  for (const record of records) {
    const reportedTon = localTonByItemId.get(record.purchaseOrderItemId) ?? 0
    max = Math.max(
      max,
      estimateSheetTextWidth(
        tonRemainingText(record, reportedTon),
        TON_PROGRESS_FONT_SIZE,
      ),
    )
  }
  return max
}
