import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { formatWeight } from '@/utils/formatters'
import { estimateSheetTextWidth, TON_PROGRESS_FONT_SIZE } from './core'

/**
 * 吨位进度列的文案与宽度口径(渲染与列宽计算共用的**唯一**来源)。
 *
 * <p><b>口径(业务确认, 2026-10-16, 方案 B)</b>: 列上的三个数是"这一行自己报的量"与
 * "订单侧真实开出去的量"两个事实的对照, 都按**关联明细行合计**:</p>
 * <ul>
 *   <li>「报单吨位」= 本单据在该明细行上的报单吨位合计(手填并锁定后的定稿值, 需求);</li>
 *   <li>「已开货」= 关联明细行的**真实已开货**合计(`actual_weight_ton`, 入库审核回写:
 *       Σ生效入库单过磅重量); <b>不是</b> `issuedWeight`(那是别家报价单的报单占用);</li>
 *   <li>「剩余未开」= 报单吨位 − 已开货。为负表示<b>该明细行的到货已经超过本单报的量</b>
 *       (已开货是订单行级、报单是单据级, 订单行被别人共享或本单只报了一部分时必然出现),
 *       按业务要求原样显示负值并标红, 不夹到 0。</li>
 * </ul>
 *
 * <p><b>为什么不再用"订货量 / 订单额度"当基数</b>: 那两版(`ee8745c2` 的"订货 − 已开"、
 * `a51cdd36` 的"额度 − 已占用")回答的是"这张订单还能开多少", 与用户要的"我报的量还差多少
 * 没开货"不是同一个问题。更关键的是它们把 `issuedWeight`(别家报价单的报单量)当成了"已开货",
 * 于是无论怎么调基数都算不出真实开货进度 —— 数据源错了, 换基准只是换一种错法。</p>
 *
 * <p><b>额度口径仍然存在, 但不在这三列</b>: 选单弹窗继续用 `issuedWeight`/`remainingWeight`
 * 判断"这条订单行的额度还能不能给本单再报"(见 purchase-order-picker-tonnage.ts)。两个出口
 * 各取自己的字段, 不要再合并成一个数。</p>
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

/** 吨位进度小字的可见文案: 数字段(已开货)与品牌段。 */
export interface TonProgressTextParts {
  /** 数字段: 已开货 = 关联明细行的真实已开货合计(入库回写口径)。 */
  primary: string
  /** 品牌段, 可省: 列宽不足时先省略品牌。 */
  brand: string
}

/**
 * 单条明细行的真实已开货吨位(**唯一出口**)。
 *
 * <p>取服务端 `actualWeightTon`(入库审核回写: Σ生效入库单过磅重量)。缺失(null/undefined/
 * 非有限)按 **0** 处理 —— "还没有任何到货记录"在展示上就是"已开 0 吨", 不需要区分出第三态;
 * 不要回退到 `orderedWeight` 或 `issuedWeight`, 否则又会把订单额度/别家报单量当成已开货。</p>
 */
export function actualShippedTonOf(actualWeightTon: unknown): number {
  if (
    actualWeightTon === null ||
    actualWeightTon === undefined ||
    actualWeightTon === ''
  ) {
    return 0
  }
  const actual = Number(actualWeightTon)
  return Number.isFinite(actual) ? actual : 0
}

/**
 * 吨位比较容差(吨)。吨位在服务端是 `numeric(18,8)`, 前端是双精度浮点, 分摊量若由
 * `min()` 一类运算得出, 会带出 1e-17 量级的尾差; 直接 `>` 比较会把"其实相等"误判成
 * "整行实收更多"。取 1e-6 吨(1 克)作为阈值, 远小于任何有业务意义的过磅差。
 */
export const TON_EPSILON = 1e-6

/**
 * 单条关联行**归属到本单据**的已开货吨位 (**唯一出口**)。
 *
 * <p><b>为什么不能直接用订单行的 `actualWeightTon`</b>: 那是**整条采购订单明细行**的实收。
 * 实际业务里一张订单行的货会覆盖两个批次的报价单 —— 比如订单行 30 吨被批次 A（报 14）与
 * 批次 B（报 16）共用、实收 27.972 吨。若两边都拿 27.972 去减自己的报单量, 两张单的
 * 「剩余未开」会同时变成负数（A: 14 − 27.972 = −13.972）, 而实际两张单都还有余量。
 *
 * <p>因此按**本单据在该行上的分摊量**（`allocated_ton`）封顶: 本单据只可能"开到"自己分摊
 * 的那部分。结果恒有 `本单已开货 ≤ 本单分摊量`, 于是「剩余未开」再也不会因为共享而变负。
 *
 * <p>没有分摊量（历史单值关联行, 未写关联表）时回退到整行实收, 保持旧数据展示不变。</p>
 */
export function linkedShippedTonOf(
  actualWeightTon: unknown,
  allocatedTon: unknown,
): number {
  const actual = actualShippedTonOf(actualWeightTon)
  const allocated =
    allocatedTon === null || allocatedTon === undefined || allocatedTon === ''
      ? Number.NaN
      : Number(allocatedTon)
  if (!Number.isFinite(allocated) || allocated < 0) return actual
  return Math.min(actual, allocated)
}

/**
 * 已开货合计 = 各关联明细行**归属到本单据**的已开货之和（见 {@link linkedShippedTonOf}）。
 *
 * <p>三列、ⓘ 弹层与读屏文案共用这一处加法: 各自内联累加时, 改了一处就会出现
 * "列上 20、弹层 18"这种同一行两个数字打架。</p>
 */
export function shippedTonTotal(actualWeightTons: Iterable<number>): number {
  let total = 0
  for (const value of actualWeightTons) {
    total += Number.isFinite(value) ? value : 0
  }
  return total
}

/**
 * 剩余未开 = 报单吨位 − 已开货(**唯一出口**, 可为负)。
 *
 * <p>基数必须是**本单据的报单吨位**(需求), 不是订单订货量、也不是订单额度 —— 那两者回答的是
 * "订单还能开多少", 与"我报的量还差多少没开货"是两件事。</p>
 *
 * <p>负值**不作下限截断**, 但它现在只剩一种成因: 本单据实际分摊到订单行上的量超过了本行报单
 * 吨位（分配量与报单量不一致, 属于要关注的真实异常）。"订单行被多张单据共享"这一类正常业务态
 * 已由 {@link linkedShippedTonOf} 按分摊量封顶消掉, 不再产生负值。</p>
 */
export function remainingUnshippedTon(
  reportedTon: number,
  shippedTon: number,
): number {
  const reported = Number.isFinite(reportedTon) ? reportedTon : 0
  const shipped = Number.isFinite(shippedTon) ? shippedTon : 0
  return reported - shipped
}

/**
 * 「已开货」列的可见文案(与单元格渲染逐字一致): 关联明细行的真实已开货合计。
 */
export function tonProgressTextParts(
  record: PurchaseOrderTonnageRecord,
): TonProgressTextParts {
  return {
    primary: compactTonText(actualShippedTonOf(record.actualWeightTon)),
    brand: issuedBrandText(record),
  }
}

/**
 * 「剩余未开」单元格的显示口径(**唯一出口**): 数学量 + 是否已开超。
 *
 * <p>与「已开货」同源: 剩余 = 报单吨位 − 已开货。`overTon > 0` 表示该明细行的到货已超过本单
 * 报的量(需要标红提醒"已开超 X 吨"), 与"订单额度不足"无关。</p>
 */
export interface RemainingTonDisplay {
  /** 列上可见的剩余吨位文案(紧凑格式; 已开超时按业务要求原样显示负值)。 */
  text: string
  /** 已开超额: > 0 表示已开货超过本单报单吨位; 未超出为 0。 */
  overTon: number
}

/**
 * 「剩余未开吨位」列的显示值(**按关联行合计**): 报单吨位合计 − 已开货合计。
 *
 * <p>一行可挂多张订单明细行, 此时列上必须给合计值 —— 只算第一条会让同一格出现两个数字:
 * 列上按第一条算、同格 ⓘ 弹层按合计算(实测)。单条关联时合计等于该条。</p>
 */
export function remainingTonDisplay(
  reportedTon: number,
  shippedTon: number,
): RemainingTonDisplay {
  const remaining = remainingUnshippedTon(reportedTon, shippedTon)
  return {
    text: compactTonText(remaining),
    overTon: remaining < 0 ? -remaining : 0,
  }
}

/**
 * 「剩余未开吨位」列的可见文案 = {@link remainingTonDisplay} 的文本部分。
 * 渲染、列宽估算与 ⓘ 弹层都取同一份口径, 不要再内联 `reported - shipped`。
 */
export function remainingTonText(
  reportedTon: number,
  shippedTon: number,
): string {
  return remainingTonDisplay(reportedTon, shippedTon).text
}

/** 吨位口径明细的一行: label 为 i18n key, value 为已格式化的数值/文本。 */
export interface TonProgressDetailRow {
  labelKey: string
  value: string
  /** 该行数值需要转警告色(已开货超过本单报单吨位)。 */
  over?: boolean
}

/** 吨位口径明细的输入(三列与 ⓘ 弹层同源)。 */
export interface TonProgressDetail {
  /** 本单据该明细行(合计)的**报单请求量**(需求, 锁定后的定稿值)。 */
  reportedTon: number
  /** 关联明细行的**真实已开货**合计(入库回写口径)。 */
  shippedTon: number
  /** 剩余未开 = 报单吨位 − 已开货(可为负: 已开超)。 */
  remainingTon: number
  /** 关联明细行的订货额度合计(参考值, 不进剩余未开的减法)。 */
  orderedTon: number
  brand?: string
  /** 已开货超过本单报单吨位: 剩余列显示负值并标红。 */
  overShipped?: boolean
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
   * 四个数一次摆清: 报单请求(需求) / 已开货(真实入库) / 剩余未开(报单 − 已开货) /
   * 订货额度(参考) —— 顺序固定, 渲染与读屏共用。
   */
  const rows: TonProgressDetailRow[] = [
    {
      labelKey: 'priceCompare.sheet.purchaseOrderSheetReported',
      value: formatWeight(detail.reportedTon),
    },
    {
      labelKey: 'priceCompare.sheet.columns.issuedTon',
      value: formatWeight(detail.shippedTon),
      over: detail.overShipped,
    },
    {
      labelKey: 'priceCompare.sheet.columns.unopenedTon',
      // 已开超时按业务要求原样显示负值(不再夹到 0)
      value: formatWeight(detail.remainingTon),
      over: detail.overShipped,
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
 * 已开超说明(**唯一来源**): 已开货 vs 本单报单吨位 vs 差额。
 *
 * <p>已开货是订单行级事实、报单是单据级需求, 订单行被多张单据共享或本单只报一部分时必然出现,
 * 属于正常业务态而非脏数据, 但仍要说清"差额从哪来"。未超出返回 null。</p>
 */
export function tonProgressOverShippedText(
  detail: Pick<TonProgressDetail, 'reportedTon' | 'shippedTon'>,
  translate: (key: string, options?: Record<string, unknown>) => string,
): string | null {
  const over = detail.shippedTon - detail.reportedTon
  if (!(over > 0)) return null
  return translate('priceCompare.sheet.purchaseOrderOverShippedDetail', {
    shipped: formatWeight(detail.shippedTon),
    reported: formatWeight(detail.reportedTon),
    over: formatWeight(over),
  })
}

/**
 * 读屏整句: 同一份明细行按「标签 值 / 标签 值 …」串联(已开超说明追加在末尾)。
 *
 * <p>与弹层共用 {@link tonProgressDetailRows}, 因此"读出来的"与"看到的"必然一致。</p>
 */
export function tonProgressDetailText(
  detail: TonProgressDetail,
  translate: (key: string) => string,
  overShippedText?: string,
): string {
  const parts = tonProgressDetailRows(detail).map(
    (row) => `${translate(row.labelKey)} ${row.value}`,
  )
  if (overShippedText) parts.push(overShippedText)
  return parts.join(' / ')
}

/**
 * 一组明细行里最宽的一条已开货文案(px)。
 *
 * <p>用作已开货列的定宽依据: 列宽只需覆盖**本单据实际会出现**的吨位位数与品牌长度,
 * 既不会把「180 · 中天钢铁」裁断, 也不会为用不到的品牌长度白留空白。还没填报单吨位的明细行
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
    max = Math.max(max, measure(tonProgressTextParts(record)))
  }
  return max
}

/**
 * 「剩余未开吨位」列的内容宽(px): 按单据里最长的一条剩余吨位估算。
 *
 * <p>该列只放一个固定 11px 的只读数字(不随个人字号缩放), 因此列宽按内容给即可 ——
 * 数字短(如 `0.7`)时不留空白, 负值(已开超)或长吨位也裁不到。</p>
 *
 * <p>`extraTexts` 用于**多行关联**行: 这些行在列上按「关联行合计」渲染(见
 * {@link remainingTonText}), 合计值可能比任何单条候选更宽, 不补进来就会被省略号收尾。</p>
 */
export function maxRemainingTonTextWidth(
  records: readonly PurchaseOrderTonnageRecord[],
  localTonByItemId: ReadonlyMap<string, number>,
  extraTexts: readonly string[] = [],
  /**
   * 已开超短文案生成器(如「已开超 10.02 吨」): 已开超行在同一格里多出一段文案, 不补进列宽
   * 就会被省略号收尾。由调用方传入带翻译的实现, 保持本模块与语言无关。
   */
  formatOverText?: (overTon: number) => string,
): number {
  let max = 0
  for (const record of records) {
    /*
     * 单条关联时"本单报单"= 本行吨位; 多行关联的合计由调用方的 extraTexts 补进来。
     */
    const reportedTon = localTonByItemId.get(record.purchaseOrderItemId) ?? 0
    const display = remainingTonDisplay(
      reportedTon,
      actualShippedTonOf(record.actualWeightTon),
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
