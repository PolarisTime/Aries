import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { formatWeight } from '@/utils/formatters'
import { estimateSheetTextWidth, TON_PROGRESS_FONT_SIZE } from './core'

/**
 * 吨位进度列的文案与宽度口径(渲染与列宽计算共用的**唯一**来源)。
 *
 * <p><b>口径(业务确认, 2026-10-15, 方案 A)</b>:
 * **「已占用」= 其他单据在该订货行的 Σ分配量 + 本单据在该订货行"本次开出"的分配量**
 * (`mk_quote_item_purchase_order.allocated_ton`); **「本单据报单吨位」是需求/请求量, 不进"已占用"**;
 * **「剩余可开」= 关联订单额度合计 − 已占用合计**, 回答"这张单还能开多少"。</p>
 *
 * <p>为什么不再用"报单量"当已开: 服务端只校验"分配 ≤ 该明细行订货量"与"Σ分配 ≤ 本行报单吨位",
 * 因此拿**请求量**去减额度得到的是"本单请求比额度多多少"(超报单), 与"该行还能开多少"是两件事,
 * 列上读出来就是负的"剩余"(用户实测反馈 −10.02 无法理解)。超报单另用
 * {@link tonProgressOverReportedText} 表达; 历史脏数据导致"已占用 > 额度"时, 剩余列下限 0 并用
 * {@link tonProgressOverIssuedText} 兜底说明。</p>
 *
 * <p>单条关联的历史值逐字不变: 历史回填时 `allocated_ton = COALESCE(ton, 0)`, 于是
 * 已占用 = 其他占用 + 本单报单(与旧口径相同); `allocatedTon` 缺失时按"等于本行报单量"兜底
 * (见 {@link selfAllocatedTonOf}), 避免老数据整体掉到 0。</p>
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

/** 吨位进度小字的可见文案: 数字段(已占用)与品牌段。 */
export interface TonProgressTextParts {
  /** 数字段: 已占用 = 其他单据占用 + 本单据在该明细行的分配量(方案 A)。 */
  primary: string
  /** 品牌段, 可省: 列宽不足时先省略品牌。 */
  brand: string
}

/**
 * 已占用(合计) = 其他单据占用 + 本单据在该订货行的分配量(方案 A)。
 *
 * <p>两个入参都是 `allocated_ton` 口径: 前者来自服务端 `issuedWeight`(只含其他单据),
 * 后者是本单据 `purchaseOrderLinks[].allocatedTon` 的合计。**报单请求量不进这里** ——
 * 它是需求, 由 {@link tonProgressOverReportedText} 单独表达。</p>
 *
 * <p>三列、ⓘ 弹层与读屏文案共用这一处加法: 各自内联 `other + self` 时, 改了一处就会
 * 出现"列上 20、弹层 18"这种同一行两个数字打架。</p>
 */
export function issuedTonTotal(
  otherIssuedTotal: number,
  selfAllocatedTon: number,
): number {
  const other = Number.isFinite(otherIssuedTotal) ? otherIssuedTotal : 0
  const self = Number.isFinite(selfAllocatedTon) ? selfAllocatedTon : 0
  return other + self
}

/**
 * 本单据在某条关联明细行上"本次开出"的分配量(**唯一出口**)。
 *
 * <p>取 `purchaseOrderLinks[].allocatedTon`; 缺失(null/undefined/非有限)时按"等于本行报单量"
 * 兜底 —— 历史数据只有单值三列(没有分配量), 那种形态下本行报单量整体算在这一条上, 兜底后
 * 单条关联的已占用/剩余与旧口径逐字相同。</p>
 */
export function selfAllocatedTonOf(
  allocatedTon: unknown,
  reportedTon: number,
): number {
  // 注意 Number(null) === 0 且有限: null/undefined/空串必须显式走兜底, 否则老数据会整体掉到 0
  if (
    allocatedTon === null ||
    allocatedTon === undefined ||
    allocatedTon === ''
  ) {
    return Number.isFinite(reportedTon) ? reportedTon : 0
  }
  const allocated = Number(allocatedTon)
  if (Number.isFinite(allocated)) return allocated
  return Number.isFinite(reportedTon) ? reportedTon : 0
}

/**
 * 剩余可开 = 关联订单额度合计 − 已占用合计(方案 A)。
 *
 * <p>基数必须是**额度合计**(ΣorderedWeight), 不是本单据报的量; 已占用只含"其他单据占用 +
 * 本单分配"。服务端保证"分配 ≤ 该明细行订货量", 因此正常数据下不会为负 —— 负值只可能来自
 * 历史脏数据, 展示层再下限 0(见 {@link remainingTonDisplay})。</p>
 */
export function remainingTonTotal(
  orderedTotal: number,
  otherIssuedTotal: number,
  selfAllocatedTon: number,
): number {
  const ordered = Number.isFinite(orderedTotal) ? orderedTotal : 0
  return ordered - issuedTonTotal(otherIssuedTotal, selfAllocatedTon)
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
 * 「剩余可开」的显示口径(**唯一出口**): 下限 0, 超出量单独给出。
 *
 * <p>「剩余」不可能是负数: 方案 A 之后正常数据不会为负(分配 ≤ 额度), 负值只可能来自历史脏数据
 * (`allocated_ton > 该明细行订货量`)。列上永远显示 `0`, 超出量由
 * {@link RemainingTonDisplay.overTon} 交给渲染层用独立文案表达(如「超开 10.02 吨」)。</p>
 *
 * <p>数学量(可为负)仍由 {@link remainingTonTotal} 给出, 供 ⓘ 弹层与读屏整句解释"为什么是 0"。</p>
 */
export interface RemainingTonDisplay {
  /** 列上可见的剩余吨位文案(下限 0, 紧凑格式)。 */
  text: string
  /** 超开吨位: > 0 表示报单请求超过关联订单额度; 未超开为 0。 */
  overTon: number
}

/**
 * 「剩余未开吨位」列的显示值(**按关联行合计**): 订货吨位合计 − 已开吨位合计, 下限 0。
 *
 * <p>一行可挂多张订单明细行, 此时列上必须给合计值 —— 只算第一条会让同一格出现两个数字:
 * 列上 `7.996 − 20 = −12.004`, 而同格 ⓘ 弹层的 `剩余未开` 是 `15.992 − 20 = −4.008`(实测)。
 * 单条关联时合计等于该条, 非超开的历史值逐字不变。</p>
 */
export function remainingTonDisplay(
  orderedTotal: number,
  otherIssuedTotal: number,
  selfAllocatedTon: number,
): RemainingTonDisplay {
  const remaining = remainingTonTotal(
    orderedTotal,
    otherIssuedTotal,
    selfAllocatedTon,
  )
  return {
    text: compactTonText(Math.max(0, remaining)),
    overTon: remaining < 0 ? -remaining : 0,
  }
}

/**
 * 「剩余未开吨位」列的可见文案 = {@link remainingTonDisplay} 的文本部分。
 * 渲染、列宽估算与 ⓘ 弹层都取同一份口径, 不要再内联 `ordered − issued`。
 */
export function remainingTonText(
  orderedTotal: number,
  otherIssuedTotal: number,
  selfAllocatedTon: number,
): string {
  return remainingTonDisplay(orderedTotal, otherIssuedTotal, selfAllocatedTon)
    .text
}

/**
 * 「剩余可开」列的可见文案(单条明细行口径)。
 *
 * <p>额度来自采购订单明细行本身, 不是本单据报的量 —— 本单据报多少已经在「报单吨位」列显示,
 * 这里显示的是订单侧还剩多少可开。</p>
 */
export function tonRemainingText(
  record: PurchaseOrderTonnageRecord,
  selfAllocatedTon: number,
): string {
  return remainingTonText(
    record.orderedWeight,
    record.issuedWeight,
    selfAllocatedTon,
  )
}

/** 吨位口径明细的一行: label 为 i18n key, value 为已格式化的数值/文本。 */
export interface TonProgressDetailRow {
  labelKey: string
  value: string
  /** 该行数值需要转警告色(已占用合计超过关联订单额度)。 */
  over?: boolean
}

/** 吨位口径明细的输入(三列与 ⓘ 弹层同源)。 */
export interface TonProgressDetail {
  /** 本单据该明细行(合计)的**报单请求量**(需求, 不进已占用)。 */
  reportedTon: number
  /** 本单据在该明细行上"本次开出"的**分配量**合计(方案 A 的"本单那一份")。 */
  selfAllocatedTon: number
  /** 其他单据在该明细行上的占用合计(服务端 issuedWeight)。 */
  otherIssuedTon: number
  /** 已占用合计 = 本单分配 + 其他占用。 */
  issuedTon: number
  /** 剩余可开 = 关联订单额度合计 − 已占用合计。 */
  remainingTon: number
  /** 关联明细行的订货额度合计。 */
  orderedTon: number
  brand?: string
  /** 已占用合计超过关联额度(历史脏数据): 已占用那一行转警告色, 剩余列下限 0。 */
  overIssued?: boolean
  /** 报单请求超过关联额度: 另给"超出 X 吨"提示(与剩余可开无关)。 */
  overReported?: boolean
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
  /*
   * 方案 A 的五个数一次摆清: 报单请求(需求) / 本单分配(本单那一份) / 其他单据占用 /
   * 已占用合计 / 关联订单额度 / 剩余可开 —— 顺序固定, 渲染与读屏共用。
   */
  const rows: TonProgressDetailRow[] = [
    {
      labelKey: 'priceCompare.sheet.purchaseOrderSheetReported',
      value: formatWeight(detail.reportedTon),
    },
    {
      labelKey: 'priceCompare.sheet.purchaseOrderSelfAllocated',
      value: formatWeight(detail.selfAllocatedTon),
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
      // 剩余可开口径: 下限 0, 超出量由 tonProgressOverIssuedText 的专句解释
      value: formatWeight(Math.max(0, detail.remainingTon)),
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
 * 超占用说明(**唯一来源**): 已占用 vs 关联订单额度 vs 差额。
 *
 * <p>方案 A 之后正常数据不会出现(服务端校验"分配 ≤ 该明细行订货量"), 只在**历史脏数据**上出现;
 * 此时剩余列下限 0, 由这句解释"为什么是 0"。未超占用返回 null。</p>
 */
export function tonProgressOverIssuedText(
  detail: Pick<TonProgressDetail, 'orderedTon' | 'issuedTon'>,
  translate: (key: string, options?: Record<string, unknown>) => string,
): string | null {
  const over = detail.issuedTon - detail.orderedTon
  if (!(over > 0)) return null
  return translate('priceCompare.sheet.purchaseOrderOverIssuedDetail', {
    issued: formatWeight(detail.issuedTon),
    ordered: formatWeight(detail.orderedTon),
    over: formatWeight(over),
  })
}

/**
 * 超报单请求说明(**唯一来源**): 报单请求 vs 关联订单额度 vs 超出量。
 *
 * <p>方案 A 把"本单请求"和"已占用"分开了: 请求量超过额度**不影响剩余可开**, 但必须说清楚
 * ("本单要的比这条订货行给的多")。未超请求返回 null。</p>
 */
export function tonProgressOverReportedText(
  detail: Pick<TonProgressDetail, 'reportedTon' | 'orderedTon'>,
  translate: (key: string, options?: Record<string, unknown>) => string,
): string | null {
  const over = detail.reportedTon - detail.orderedTon
  if (!(over > 0)) return null
  return translate('priceCompare.sheet.purchaseOrderOverReportedDetail', {
    reported: formatWeight(detail.reportedTon),
    ordered: formatWeight(detail.orderedTon),
    over: formatWeight(over),
  })
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
  overReportedText?: string,
): string {
  const parts = tonProgressDetailRows(detail).map(
    (row) => `${translate(row.labelKey)} ${row.value}`,
  )
  if (overIssuedText) parts.push(overIssuedText)
  if (overReportedText) parts.push(overReportedText)
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
 *
 * <p>`extraTexts` 用于**多行关联**行: 这些行在列上按「关联行合计」渲染(见
 * {@link remainingTonText}), 合计值可能比任何单条候选更宽, 不补进来就会被省略号收尾。</p>
 */
export function maxRemainingTonTextWidth(
  records: readonly PurchaseOrderTonnageRecord[],
  localTonByItemId: ReadonlyMap<string, number>,
  extraTexts: readonly string[] = [],
  /**
   * 超开短文案生成器(如「超开 10.02 吨」): 超开行在同一格里多出一段文案, 不补进列宽就会被
   * 省略号收尾。由调用方传入带翻译的实现, 保持本模块与语言无关。
   */
  formatOverText?: (overTon: number) => string,
): number {
  let max = 0
  for (const record of records) {
    /*
     * 单条关联时"本单分配"= 本行报单量(历史回填 allocated_ton = ton), 因此这里用行吨位
     * 估宽与渲染一致; 多行关联的合计由调用方的 extraTexts 补进来。
     */
    const selfAllocatedTon =
      localTonByItemId.get(record.purchaseOrderItemId) ?? 0
    const display = remainingTonDisplay(
      record.orderedWeight,
      record.issuedWeight,
      selfAllocatedTon,
    )
    const text =
      display.overTon > 0 && formatOverText
        ? `${display.text} ${formatOverText(display.overTon)}`
        : display.text
    max = Math.max(max, estimateSheetTextWidth(text, TON_PROGRESS_FONT_SIZE))
  }
  for (const text of extraTexts) {
    max = Math.max(max, estimateSheetTextWidth(text, TON_PROGRESS_FONT_SIZE))
  }
  return max
}
