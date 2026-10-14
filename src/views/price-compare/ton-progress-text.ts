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
 * 已开吨位(合计) = 其他已保存报单占用 + 本单据该明细行报单合计。
 *
 * <p>三列、ⓘ 弹层与读屏文案共用这一处加法: 各自内联 `other + reported` 时, 改了一处就会
 * 出现"列上 20、弹层 18"这种同一行两个数字打架。</p>
 */
export function issuedTonTotal(
  otherIssuedTotal: number,
  reportedTon: number,
): number {
  const other = Number.isFinite(otherIssuedTotal) ? otherIssuedTotal : 0
  const reported = Number.isFinite(reportedTon) ? reportedTon : 0
  return other + reported
}

/**
 * 剩余未开吨位 = 订货吨位合计 − 已开吨位合计(负值表示这条明细行被超开)。
 *
 * <p>基数必须是**订货吨位合计**(ΣorderedWeight), 不是本单据报的量。</p>
 */
export function remainingTonTotal(
  orderedTotal: number,
  otherIssuedTotal: number,
  reportedTon: number,
): number {
  const ordered = Number.isFinite(orderedTotal) ? orderedTotal : 0
  return ordered - issuedTonTotal(otherIssuedTotal, reportedTon)
}

/**
 * 已开吨位列的可见文案(与单元格渲染逐字一致)。
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
  return {
    primary: compactTonText(issuedTonTotal(record.issuedWeight, reportedTon)),
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
  return compactTonText(
    remainingTonTotal(record.orderedWeight, record.issuedWeight, reportedTon),
  )
}

/** 吨位口径明细的一行: label 为 i18n key, value 为已格式化的数值/文本。 */
export interface TonProgressDetailRow {
  labelKey: string
  value: string
  /** 该行数值需要转警告色(已开合计超过订货吨位)。 */
  over?: boolean
}

/** 吨位口径明细的输入(三列与 ⓘ 弹层同源)。 */
export interface TonProgressDetail {
  /** 本单据该明细行(合计)的报单吨位。 */
  reportedTon: number
  /** 其他已保存报单占用。 */
  otherIssuedTon: number
  /** 已开吨位合计 = 报单 + 其他占用。 */
  issuedTon: number
  /** 剩余未开吨位 = 订货吨位合计 − 已开吨位合计。 */
  remainingTon: number
  /** 关联明细行的订货吨位合计。 */
  orderedTon: number
  brand?: string
  /** 已开合计超过订货吨位: 已开那一行转警告色。 */
  overIssued?: boolean
}

/**
 * 吨位口径明细(唯一来源): ⓘ/悬浮弹层逐行渲染与读屏整句文案都由它派生。
 *
 * <p>两处各自内联算式时, 改了一处就会让"看得见的数字"和"读出来的数字"打架 —— 这里把
 * 行序与取值定死, 渲染只负责把 key 翻成文案。</p>
 */
export function tonProgressDetailRows(
  detail: TonProgressDetail,
): TonProgressDetailRow[] {
  const rows: TonProgressDetailRow[] = [
    {
      labelKey: 'priceCompare.sheet.purchaseOrderSheetReported',
      value: formatWeight(detail.reportedTon),
    },
    {
      labelKey: 'priceCompare.sheet.purchaseOrderIssuedActual',
      value: formatWeight(detail.otherIssuedTon),
    },
    {
      labelKey: 'priceCompare.sheet.columns.issuedTon',
      value: formatWeight(detail.issuedTon),
      over: detail.overIssued,
    },
    {
      labelKey: 'priceCompare.sheet.columns.unopenedTon',
      value: formatWeight(detail.remainingTon),
    },
    {
      labelKey: 'priceCompare.sheet.columns.purchaseOrderOrdered',
      value: formatWeight(detail.orderedTon),
    },
  ]
  if (detail.brand) {
    rows.push({
      labelKey: 'priceCompare.sheet.columns.brand',
      value: detail.brand,
    })
  }
  return rows
}

/**
 * 读屏整句: 同一份明细行按「标签 值 / 标签 值 …」串联(超开说明追加在末尾)。
 *
 * <p>与弹层共用 {@link tonProgressDetailRows}, 因此"读出来的"与"看到的"必然一致。</p>
 */
export function tonProgressDetailText(
  detail: TonProgressDetail,
  translate: (key: string) => string,
  overIssuedText?: string,
): string {
  const parts = tonProgressDetailRows(detail).map(
    (row) => `${translate(row.labelKey)} ${row.value}`,
  )
  if (overIssuedText) parts.push(overIssuedText)
  return parts.join(' / ')
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
